import os
import smtplib
import streamlit as st
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

PIONEER_RECIPIENTS = [
    "Taylor.vincent@pioneerindustrialsales.com",
    "shane.parks@pioneerindustrialsales.com",
    "paul.hester@pioneerindustrialsales.com",
    "hank.pennington@pioneerindustrialsales.com",
]


def get_smtp_config():
    try:
        host = st.secrets.get("SMTP_HOST") or os.environ.get("SMTP_HOST")
        user = st.secrets.get("SMTP_USER") or os.environ.get("SMTP_USER")
        password = st.secrets.get("SMTP_PASS") or os.environ.get("SMTP_PASS")
        port = int(st.secrets.get("SMTP_PORT") or os.environ.get("SMTP_PORT") or 587)
    except Exception:
        host = os.environ.get("SMTP_HOST")
        user = os.environ.get("SMTP_USER")
        password = os.environ.get("SMTP_PASS")
        port = int(os.environ.get("SMTP_PORT", 587))
    return host, port, user, password


def send_release_request_email(
    requested_by,
    requested_by_email,
    product,
    quantity,
    unit,
    request_id,
    current_stock_after,
    notes=None,
):
    subject = f"[ICC International] Inventory Release Request #{request_id} — {product}"
    body = f"""ICC International — Pioneer Inventory Release Request
======================================================

A new inventory release request has been submitted and the stock level has been updated.

Request Details
---------------
Request ID:       #{request_id}
Product:          {product}
Quantity:         {quantity} {unit}
Remaining Stock:  {current_stock_after} {unit}
Requested By:     {requested_by}
Requester Email:  {requested_by_email}
{"Notes:            " + notes if notes else ""}

This request is now pending your approval and fulfillment.

---
Pioneer Industrial Sales
www.pioneerindustrialsales.com
""".strip()

    host, port, user, password = get_smtp_config()

    if not host or not user or not password:
        return False, "SMTP not configured — email not sent (request was still saved)."

    try:
        msg = MIMEMultipart()
        msg["From"] = f"ICC International Inventory <{user}>"
        msg["To"] = ", ".join(PIONEER_RECIPIENTS)
        msg["Reply-To"] = requested_by_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        if port == 465:
            with smtplib.SMTP_SSL(host, port) as server:
                server.login(user, password)
                server.sendmail(user, PIONEER_RECIPIENTS, msg.as_string())
        else:
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(user, PIONEER_RECIPIENTS, msg.as_string())

        return True, f"Email sent to {len(PIONEER_RECIPIENTS)} Pioneer contacts."
    except Exception as e:
        return False, f"Email failed: {str(e)}"
