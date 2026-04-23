import os
import psycopg2
import psycopg2.extras
import streamlit as st
from datetime import datetime


def get_connection():
    """Get a database connection using DATABASE_URL from secrets or environment."""
    try:
        db_url = st.secrets.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    except Exception:
        db_url = os.environ.get("DATABASE_URL")

    if not db_url:
        st.error("DATABASE_URL is not configured. Add it to your Streamlit secrets.")
        st.stop()

    return psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)


def get_all_inventory():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, category, product, thickness, sheet_size, weight_per_sheet,
                       current_stock, unit, low_stock_threshold, created_at, updated_at
                FROM inventory_items
                ORDER BY category, product
            """)
            return cur.fetchall()
    finally:
        conn.close()


def get_inventory_item(item_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, category, product, thickness, sheet_size, weight_per_sheet,
                       current_stock, unit, low_stock_threshold, created_at, updated_at
                FROM inventory_items
                WHERE id = %s
            """, (item_id,))
            return cur.fetchone()
    finally:
        conn.close()


def get_inventory_summary():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as total_items FROM inventory_items")
            total_items = cur.fetchone()["total_items"]

            cur.execute("""
                SELECT COUNT(*) as low_stock_count
                FROM inventory_items
                WHERE low_stock_threshold IS NOT NULL
                  AND current_stock <= low_stock_threshold
            """)
            low_stock_count = cur.fetchone()["low_stock_count"]

            cur.execute("SELECT COALESCE(SUM(current_stock), 0) as total_sheets FROM inventory_items")
            total_sheets = cur.fetchone()["total_sheets"]

            cur.execute("SELECT COUNT(*) as pending FROM release_requests WHERE status = 'pending'")
            pending_requests = cur.fetchone()["pending"]

            cur.execute("""
                SELECT COUNT(*) as recent
                FROM release_requests
                WHERE created_at > NOW() - INTERVAL '7 days'
            """)
            recent_count = cur.fetchone()["recent"]

            cur.execute("""
                SELECT category, COUNT(*) as count, SUM(current_stock) as total_stock
                FROM inventory_items
                GROUP BY category
                ORDER BY category
            """)
            category_breakdown = cur.fetchall()

            return {
                "total_items": total_items,
                "low_stock_count": low_stock_count,
                "total_sheets": total_sheets,
                "pending_requests": pending_requests,
                "recent_count": recent_count,
                "category_breakdown": category_breakdown,
            }
    finally:
        conn.close()


def get_release_requests(status_filter=None, limit=100):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if status_filter:
                cur.execute("""
                    SELECT rr.id, rr.requested_by, rr.requested_by_email, rr.quantity,
                           rr.notes, rr.status, rr.created_at, rr.updated_at,
                           ii.product, ii.unit, ii.category
                    FROM release_requests rr
                    JOIN inventory_items ii ON rr.inventory_item_id = ii.id
                    WHERE rr.status = %s
                    ORDER BY rr.created_at DESC
                    LIMIT %s
                """, (status_filter, limit))
            else:
                cur.execute("""
                    SELECT rr.id, rr.requested_by, rr.requested_by_email, rr.quantity,
                           rr.notes, rr.status, rr.created_at, rr.updated_at,
                           ii.product, ii.unit, ii.category
                    FROM release_requests rr
                    JOIN inventory_items ii ON rr.inventory_item_id = ii.id
                    ORDER BY rr.created_at DESC
                    LIMIT %s
                """, (limit,))
            return cur.fetchall()
    finally:
        conn.close()


def get_recent_release_requests(limit=10):
    return get_release_requests(limit=limit)


def create_release_request(inventory_item_id, requested_by, requested_by_email, quantity, notes=None):
    """
    Creates a release request and deducts from inventory.
    Returns (success, message, request_id, product_name, remaining_stock, unit)
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, product, current_stock, unit FROM inventory_items WHERE id = %s FOR UPDATE",
                (inventory_item_id,)
            )
            item = cur.fetchone()

            if not item:
                return False, "Inventory item not found.", None, None, None, None

            if item["current_stock"] < quantity:
                return (
                    False,
                    f"Insufficient stock. Only {item['current_stock']} {item['unit']} available.",
                    None, None, None, None
                )

            cur.execute("""
                INSERT INTO release_requests
                  (inventory_item_id, requested_by, requested_by_email, quantity, notes, status)
                VALUES (%s, %s, %s, %s, %s, 'pending')
                RETURNING id
            """, (inventory_item_id, requested_by, requested_by_email, quantity, notes))
            request_id = cur.fetchone()["id"]

            new_stock = item["current_stock"] - quantity
            cur.execute(
                "UPDATE inventory_items SET current_stock = %s, updated_at = NOW() WHERE id = %s",
                (new_stock, inventory_item_id)
            )

            conn.commit()
            return True, "Request submitted successfully.", request_id, item["product"], new_stock, item["unit"]
    except Exception as e:
        conn.rollback()
        return False, str(e), None, None, None, None
    finally:
        conn.close()
