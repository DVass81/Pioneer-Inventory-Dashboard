import os
import streamlit as st
from sqlalchemy import create_engine, text
from datetime import datetime


def get_engine():
    try:
        db_url = st.secrets.get("DATABASE_URL") or os.environ.get("DATABASE_URL")
    except Exception:
        db_url = os.environ.get("DATABASE_URL")

    if not db_url:
        st.error("DATABASE_URL is not configured. Add it to your Streamlit secrets.")
        st.stop()

    db_url = db_url.strip().strip('"').strip("'")

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    return create_engine(db_url, connect_args={"sslmode": "require"} if "sslmode" not in db_url else {})


def rows_to_dicts(rows):
    return [dict(row._mapping) for row in rows]


def get_all_inventory():
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, category, product, thickness, sheet_size, weight_per_sheet,
                   current_stock, unit, low_stock_threshold, created_at, updated_at
            FROM inventory_items
            ORDER BY category, product
        """))
        return rows_to_dicts(result.fetchall())


def get_inventory_item(item_id):
    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, category, product, thickness, sheet_size, weight_per_sheet,
                   current_stock, unit, low_stock_threshold, created_at, updated_at
            FROM inventory_items
            WHERE id = :id
        """), {"id": item_id})
        row = result.fetchone()
        return dict(row._mapping) if row else None


def get_inventory_summary():
    engine = get_engine()
    with engine.connect() as conn:
        total_items = conn.execute(text("SELECT COUNT(*) as total_items FROM inventory_items")).fetchone()[0]

        low_stock_count = conn.execute(text("""
            SELECT COUNT(*) FROM inventory_items
            WHERE low_stock_threshold IS NOT NULL
              AND current_stock <= low_stock_threshold
        """)).fetchone()[0]

        total_sheets = conn.execute(text(
            "SELECT COALESCE(SUM(current_stock), 0) FROM inventory_items"
        )).fetchone()[0]

        pending_requests = conn.execute(text(
            "SELECT COUNT(*) FROM release_requests WHERE status = 'pending'"
        )).fetchone()[0]

        recent_count = conn.execute(text("""
            SELECT COUNT(*) FROM release_requests
            WHERE created_at > NOW() - INTERVAL '7 days'
        """)).fetchone()[0]

        category_breakdown = rows_to_dicts(conn.execute(text("""
            SELECT category, COUNT(*) as count, SUM(current_stock) as total_stock
            FROM inventory_items
            GROUP BY category
            ORDER BY category
        """)).fetchall())

        return {
            "total_items": total_items,
            "low_stock_count": low_stock_count,
            "total_sheets": total_sheets,
            "pending_requests": pending_requests,
            "recent_count": recent_count,
            "category_breakdown": category_breakdown,
        }


def get_release_requests(status_filter=None, limit=100):
    engine = get_engine()
    with engine.connect() as conn:
        if status_filter:
            result = conn.execute(text("""
                SELECT rr.id, rr.requested_by, rr.requested_by_email, rr.quantity,
                       rr.notes, rr.status, rr.created_at, rr.updated_at,
                       ii.product, ii.unit, ii.category
                FROM release_requests rr
                JOIN inventory_items ii ON rr.inventory_item_id = ii.id
                WHERE rr.status = :status
                ORDER BY rr.created_at DESC
                LIMIT :limit
            """), {"status": status_filter, "limit": limit})
        else:
            result = conn.execute(text("""
                SELECT rr.id, rr.requested_by, rr.requested_by_email, rr.quantity,
                       rr.notes, rr.status, rr.created_at, rr.updated_at,
                       ii.product, ii.unit, ii.category
                FROM release_requests rr
                JOIN inventory_items ii ON rr.inventory_item_id = ii.id
                ORDER BY rr.created_at DESC
                LIMIT :limit
            """), {"limit": limit})
        return rows_to_dicts(result.fetchall())


def get_recent_release_requests(limit=10):
    return get_release_requests(limit=limit)


def create_release_request(inventory_item_id, requested_by, requested_by_email, quantity, notes=None):
    engine = get_engine()
    with engine.begin() as conn:
        try:
            item_row = conn.execute(text(
                "SELECT id, product, current_stock, unit FROM inventory_items WHERE id = :id"
            ), {"id": inventory_item_id}).fetchone()

            if not item_row:
                return False, "Inventory item not found.", None, None, None, None

            item = dict(item_row._mapping)

            if item["current_stock"] < quantity:
                return (
                    False,
                    f"Insufficient stock. Only {item['current_stock']} {item['unit']} available.",
                    None, None, None, None
                )

            request_id = conn.execute(text("""
                INSERT INTO release_requests
                  (inventory_item_id, requested_by, requested_by_email, quantity, notes, status)
                VALUES (:item_id, :requested_by, :email, :qty, :notes, 'pending')
                RETURNING id
            """), {
                "item_id": inventory_item_id,
                "requested_by": requested_by,
                "email": requested_by_email,
                "qty": quantity,
                "notes": notes
            }).fetchone()[0]

            new_stock = item["current_stock"] - quantity
            conn.execute(text(
                "UPDATE inventory_items SET current_stock = :stock, updated_at = NOW() WHERE id = :id"
            ), {"stock": new_stock, "id": inventory_item_id})

            return True, "Request submitted successfully.", request_id, item["product"], new_stock, item["unit"]
        except Exception as e:
            return False, str(e), None, None, None, None
