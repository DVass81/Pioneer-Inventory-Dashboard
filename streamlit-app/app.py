import streamlit as st
import pandas as pd
from datetime import datetime
from database import (
    get_all_inventory,
    get_inventory_summary,
    get_release_requests,
    get_recent_release_requests,
    create_release_request,
)
from email_utils import send_release_request_email

st.set_page_config(
    page_title="Pioneer Inventory — ICC International",
    page_icon="🏭",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS for Pioneer green/beige branding ──────────────────────────────
st.markdown("""
<style>
/* Sidebar styling */
[data-testid="stSidebar"] {
    background-color: #1f4d2b !important;
}
[data-testid="stSidebar"] * {
    color: #ffffff !important;
}
[data-testid="stSidebar"] .stRadio label {
    color: #ffffff !important;
    font-size: 0.95rem;
}
[data-testid="stSidebar"] hr {
    border-color: #2d6a3f !important;
}

/* Metric cards */
[data-testid="metric-container"] {
    background-color: #ffffff;
    border: 1px solid #d4c9b0;
    border-radius: 8px;
    padding: 16px;
}

/* Status badges */
.badge-pending   { background:#fef3c7; color:#92400e; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; }
.badge-approved  { background:#d1fae5; color:#065f46; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; }
.badge-completed { background:#dbeafe; color:#1e40af; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; }
.badge-rejected  { background:#fee2e2; color:#991b1b; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; }

/* Low stock indicator */
.low-stock { color: #dc2626; font-weight: 700; }
.ok-stock  { color: #1f4d2b; font-weight: 600; }

/* Section headers */
.section-header {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1f4d2b;
    border-bottom: 2px solid #2d6a3f;
    padding-bottom: 4px;
    margin-bottom: 12px;
}
</style>
""", unsafe_allow_html=True)

# ── Category display names ─────────────────────────────────────────────────
CATEGORY_LABELS = {
    "segment_mica": "Segment Mica",
    "molding_mica": "Molding Mica",
    "pei_tape": "PEI Tape",
    "cold_banding_tape": "Cold Banding Tape",
    "brazing_wire": "Brazing Wire",
}

STATUS_COLORS = {
    "pending": "🟡",
    "approved": "🟢",
    "completed": "🔵",
    "rejected": "🔴",
}


def format_category(cat):
    return CATEGORY_LABELS.get(cat, cat.replace("_", " ").title())


def format_status_badge(status):
    return f'<span class="badge-{status}">{status.capitalize()}</span>'


def format_date(dt):
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt[:16]
    return dt.strftime("%b %d, %Y %I:%M %p")


# ── Sidebar ───────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏭 Pioneer Inventory")
    st.markdown("**ICC International**")
    st.markdown("Maryville, TN")
    st.markdown("---")

    page = st.radio(
        "Navigate",
        ["Dashboard", "Inventory", "Release Requests", "New Release Request"],
        label_visibility="collapsed",
    )

    st.markdown("---")
    st.markdown(
        "<small>Stored at Pioneer Industrial Sales<br>www.pioneerindustrialsales.com</small>",
        unsafe_allow_html=True,
    )


# ════════════════════════════════════════════════════════
# PAGE: DASHBOARD
# ════════════════════════════════════════════════════════
if page == "Dashboard":
    st.title("Dashboard Overview")
    st.caption("Inventory snapshot and recent activity")

    summary = get_inventory_summary()

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Items", summary["total_items"])
    with col2:
        val = summary["low_stock_count"]
        st.metric("Low Stock Alerts", val, delta=None if val == 0 else f"{val} need attention",
                  delta_color="inverse")
    with col3:
        st.metric("Total Units in Stock", f"{summary['total_sheets']:,}")
    with col4:
        st.metric("Pending Requests", summary["pending_requests"])

    st.markdown("---")

    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.markdown('<div class="section-header">Inventory by Category</div>', unsafe_allow_html=True)
        if summary["category_breakdown"]:
            for row in summary["category_breakdown"]:
                cat_label = format_category(row["category"])
                stock = int(row["total_stock"] or 0)
                count = int(row["count"])
                with st.container():
                    c1, c2 = st.columns([3, 1])
                    with c1:
                        st.write(f"**{cat_label}** — {count} product{'s' if count != 1 else ''}")
                    with c2:
                        st.write(f"**{stock:,}** units")

    with col_right:
        st.markdown('<div class="section-header">Recent Release Requests</div>', unsafe_allow_html=True)
        recent = get_recent_release_requests(limit=6)
        if recent:
            for req in recent:
                status = req["status"]
                icon = STATUS_COLORS.get(status, "⚪")
                st.markdown(
                    f"{icon} **{req['requested_by']}** — {req['quantity']} {req['unit']} of {req['product']}  \n"
                    f"<small>{format_date(req['created_at'])}</small>",
                    unsafe_allow_html=True,
                )
                st.markdown("---")
        else:
            st.info("No release requests yet.")

    # Low stock section
    items = get_all_inventory()
    low_stock_items = [
        i for i in items
        if i["low_stock_threshold"] is not None and i["current_stock"] <= i["low_stock_threshold"]
    ]
    if low_stock_items:
        st.markdown("---")
        st.error(f"⚠️ **{len(low_stock_items)} item(s) are at or below their low stock threshold**")
        for item in low_stock_items:
            st.write(
                f"- **{item['product']}** ({format_category(item['category'])}): "
                f"{item['current_stock']} {item['unit']} remaining "
                f"(threshold: {item['low_stock_threshold']})"
            )


# ════════════════════════════════════════════════════════
# PAGE: INVENTORY
# ════════════════════════════════════════════════════════
elif page == "Inventory":
    st.title("Inventory")
    st.caption("All items stored at Pioneer Industrial Sales")

    items = get_all_inventory()

    col_search, col_cat = st.columns([2, 1])
    with col_search:
        search = st.text_input("Search products", placeholder="e.g. AVSM 0.040")
    with col_cat:
        cat_options = ["All Categories"] + [format_category(c) for c in sorted(CATEGORY_LABELS.keys())]
        selected_cat = st.selectbox("Filter by category", cat_options)

    # Filter
    filtered = items
    if search:
        filtered = [i for i in filtered if search.lower() in i["product"].lower()]
    if selected_cat != "All Categories":
        cat_key = next((k for k, v in CATEGORY_LABELS.items() if v == selected_cat), None)
        if cat_key:
            filtered = [i for i in filtered if i["category"] == cat_key]

    st.markdown(f"**{len(filtered)} item(s)** · Click a row to expand details")
    st.markdown("---")

    if filtered:
        for item in filtered:
            is_low = (
                item["low_stock_threshold"] is not None
                and item["current_stock"] <= item["low_stock_threshold"]
            )
            stock_label = (
                f"🔴 {item['current_stock']} {item['unit']}" if is_low
                else f"🟢 {item['current_stock']} {item['unit']}"
            )
            expander_label = (
                f"{item['product']}  ·  {format_category(item['category'])}  ·  {stock_label}"
            )

            with st.expander(expander_label, expanded=False):
                c1, c2, c3 = st.columns(3)
                with c1:
                    st.write("**Product**", item["product"])
                    st.write("**Category**", format_category(item["category"]))
                    st.write("**Unit**", item["unit"].capitalize())
                with c2:
                    if item["thickness"]:
                        st.write("**Thickness**", item["thickness"])
                    if item["sheet_size"]:
                        st.write("**Sheet Size**", item["sheet_size"])
                    if item["weight_per_sheet"] is not None:
                        st.write("**Weight / Sheet**", f"{float(item['weight_per_sheet']):.2f} lbs")
                with c3:
                    st.metric("Current Stock", f"{item['current_stock']:,} {item['unit']}")
                    if item["low_stock_threshold"] is not None:
                        if is_low:
                            st.error(f"Below threshold ({item['low_stock_threshold']} {item['unit']})")
                        else:
                            st.success(f"Threshold: {item['low_stock_threshold']} {item['unit']}")

                if st.button("Request Release", key=f"req_{item['id']}"):
                    st.session_state["prefill_item"] = item["id"]
                    st.session_state["goto_page"] = "New Release Request"
                    st.rerun()
    else:
        st.info("No items match your search.")


# ════════════════════════════════════════════════════════
# PAGE: RELEASE REQUESTS
# ════════════════════════════════════════════════════════
elif page == "Release Requests":
    st.title("Release Requests")
    st.caption("All submitted release requests")

    col_status, col_limit = st.columns([2, 1])
    with col_status:
        status_filter = st.selectbox(
            "Filter by status",
            ["All", "Pending", "Approved", "Completed", "Rejected"]
        )
    with col_limit:
        limit = st.selectbox("Show", [25, 50, 100, 200], index=0)

    status_param = None if status_filter == "All" else status_filter.lower()
    requests = get_release_requests(status_filter=status_param, limit=limit)

    if requests:
        rows = []
        for r in requests:
            rows.append({
                "ID": f"#{r['id']}",
                "Product": r["product"],
                "Category": format_category(r["category"]),
                "Quantity": f"{r['quantity']} {r['unit']}",
                "Requested By": r["requested_by"],
                "Email": r["requested_by_email"],
                "Status": r["status"].capitalize(),
                "Date": format_date(r["created_at"]),
                "Notes": r["notes"] or "",
            })
        df = pd.DataFrame(rows)

        def color_status(val):
            colors = {
                "Pending": "background-color: #fef3c7; color: #92400e",
                "Approved": "background-color: #d1fae5; color: #065f46",
                "Completed": "background-color: #dbeafe; color: #1e40af",
                "Rejected": "background-color: #fee2e2; color: #991b1b",
            }
            return colors.get(val, "")

        styled = df.style.applymap(color_status, subset=["Status"])
        st.dataframe(styled, use_container_width=True, hide_index=True)
    else:
        st.info("No release requests found.")


# ════════════════════════════════════════════════════════
# PAGE: NEW RELEASE REQUEST
# ════════════════════════════════════════════════════════
elif page == "New Release Request":
    # Handle prefill from inventory page
    if st.session_state.get("goto_page") == "New Release Request":
        del st.session_state["goto_page"]

    st.title("New Release Request")
    st.caption("Submit a request to release product from Pioneer storage. Inventory is deducted immediately and the Pioneer team is notified by email.")

    items = get_all_inventory()
    if not items:
        st.error("No inventory items found.")
        st.stop()

    # Build item options grouped by category
    item_options = {}
    for item in items:
        label = f"{item['product']} ({format_category(item['category'])}) — {item['current_stock']} {item['unit']} in stock"
        item_options[label] = item

    option_labels = list(item_options.keys())

    # Prefill if coming from inventory page
    default_index = 0
    if "prefill_item" in st.session_state:
        prefill_id = st.session_state.pop("prefill_item")
        for i, (label, item) in enumerate(item_options.items()):
            if item["id"] == prefill_id:
                default_index = i
                break

    with st.form("release_request_form", clear_on_submit=False):
        st.markdown("### Product")
        selected_label = st.selectbox(
            "Select inventory item",
            option_labels,
            index=default_index,
        )
        selected_item = item_options[selected_label]

        if selected_item["weight_per_sheet"] is not None:
            wps = float(selected_item["weight_per_sheet"])
            st.info(
                f"**{selected_item['product']}** · Sheet size: {selected_item['sheet_size']} · "
                f"Weight per sheet: {wps:.2f} lbs · "
                f"Current stock: **{selected_item['current_stock']} {selected_item['unit']}**"
            )
        else:
            st.info(
                f"**{selected_item['product']}** · "
                f"Current stock: **{selected_item['current_stock']} {selected_item['unit']}**"
            )

        st.markdown("### Quantity")
        quantity = st.number_input(
            f"Quantity to release ({selected_item['unit']})",
            min_value=1,
            max_value=max(1, selected_item["current_stock"]),
            value=1,
            step=1,
        )

        if selected_item["weight_per_sheet"] is not None:
            wps = float(selected_item["weight_per_sheet"])
            st.caption(f"Estimated total weight: **{quantity * wps:.2f} lbs**")

        st.markdown("### Requester Info")
        col_name, col_email = st.columns(2)
        with col_name:
            requested_by = st.text_input("Your Name", placeholder="e.g. John Smith")
        with col_email:
            requested_by_email = st.text_input("Your Email", placeholder="e.g. john@company.com")

        st.markdown("### Notes (optional)")
        notes = st.text_area(
            "Additional notes",
            placeholder="e.g. Needed for Q3 production run, job number, etc.",
            height=80,
        )

        submitted = st.form_submit_button("Submit Release Request", type="primary", use_container_width=True)

    if submitted:
        errors = []
        if not requested_by.strip():
            errors.append("Please enter your name.")
        if not requested_by_email.strip() or "@" not in requested_by_email:
            errors.append("Please enter a valid email address.")
        if quantity < 1:
            errors.append("Quantity must be at least 1.")
        if quantity > selected_item["current_stock"]:
            errors.append(f"Cannot request more than current stock ({selected_item['current_stock']} {selected_item['unit']}).")

        if errors:
            for e in errors:
                st.error(e)
        else:
            with st.spinner("Submitting request..."):
                success, message, request_id, product, remaining, unit = create_release_request(
                    inventory_item_id=selected_item["id"],
                    requested_by=requested_by.strip(),
                    requested_by_email=requested_by_email.strip(),
                    quantity=quantity,
                    notes=notes.strip() if notes.strip() else None,
                )

            if success:
                email_sent, email_msg = send_release_request_email(
                    requested_by=requested_by.strip(),
                    requested_by_email=requested_by_email.strip(),
                    product=product,
                    quantity=quantity,
                    unit=unit,
                    request_id=request_id,
                    current_stock_after=remaining,
                    notes=notes.strip() if notes.strip() else None,
                )

                st.success(f"Request #{request_id} submitted. Remaining stock: {remaining} {unit}.")
                if email_sent:
                    st.info(f"The Pioneer team has been notified by email.")
                else:
                    st.warning(f"Request saved, but email not sent: {email_msg}")
            else:
                st.error(f"Could not submit request: {message}")
