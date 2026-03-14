"""
One-time migration: add multi-channel columns and message_templates table to existing DB.
Run from backend dir: python migrate_add_channels.py
Uses sync SQLite to alter tables (SQLite doesn't support all ALTER operations, so we add columns that are missing).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "breach.db")
if not os.path.exists(DB_PATH):
    print("No breach.db found. Fresh start will create all tables on first run.")
    exit(0)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 1. users.phone_number
try:
    cur.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)")
    print("Added users.phone_number")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("users.phone_number already exists")
    else:
        raise

# 2. message_templates table (if not exists)
cur.execute("""
CREATE TABLE IF NOT EXISTS message_templates (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    channel_type VARCHAR(20) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    message_body TEXT NOT NULL
)
""")
print("message_templates table ready")

# 3. campaigns.channel_type (default EMAIL)
try:
    cur.execute("ALTER TABLE campaigns ADD COLUMN channel_type VARCHAR(20) DEFAULT 'EMAIL'")
    print("Added campaigns.channel_type")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("campaigns.channel_type already exists")
    else:
        raise

# 4. campaigns.template_id
try:
    cur.execute("ALTER TABLE campaigns ADD COLUMN template_id INTEGER REFERENCES message_templates(id)")
    print("Added campaigns.template_id")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("campaigns.template_id already exists")
    else:
        raise

# 5. campaign_targets.phone_number, sms_sent, whatsapp_sent
for col, typ in [("phone_number", "VARCHAR(20)"), ("sms_sent", "INTEGER DEFAULT 0"), ("whatsapp_sent", "INTEGER DEFAULT 0")]:
    try:
        cur.execute(f"ALTER TABLE campaign_targets ADD COLUMN {col} {typ}")
        print(f"Added campaign_targets.{col}")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"campaign_targets.{col} already exists")
        else:
            raise

# 6. events: new enum values are just strings, no schema change needed

conn.commit()
conn.close()
print("Migration done.")
