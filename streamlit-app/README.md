# ICC International — Pioneer Inventory Dashboard (Streamlit)

Inventory tracking dashboard for product stored at Pioneer Industrial Sales.

## Features

- Live inventory levels for Segment Mica (AVSM), Molding Mica (AVMM), PEI Tape, Cold Banding Tape, and Brazing Wire
- Low stock alerts
- Release request form — deducts from inventory and emails the Pioneer team automatically
- Full request history with status tracking

## Deploying to Streamlit Cloud

1. Push this folder to a GitHub repository
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in
3. Click **New app** → select your repo → set the main file to `app.py`
4. Under **Advanced settings → Secrets**, paste your secrets (see below)
5. Click **Deploy**

## Required Secrets

In Streamlit Cloud → App Settings → Secrets, add:

```toml
DATABASE_URL = "postgresql://..."   # your PostgreSQL connection string

# Optional — enables email notifications to the Pioneer team
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = "587"
SMTP_USER = "your@email.com"
SMTP_PASS = "your-app-password"
```

## Running Locally

```bash
cd streamlit-app
pip install -r requirements.txt
# Create .streamlit/secrets.toml with your DATABASE_URL
streamlit run app.py
```

## Database

This app connects to the same PostgreSQL database as the Replit version.
The required tables are `inventory_items` and `release_requests`.
