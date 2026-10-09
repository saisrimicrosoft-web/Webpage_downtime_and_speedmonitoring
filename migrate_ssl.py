import sqlite3
import os

DB_PATH = 'instance/monitor.db'

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create ssl_checks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ssl_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        monitor_id INTEGER NOT NULL,
        checked_at DATETIME NOT NULL,
        status VARCHAR(50) NOT NULL,
        issuer VARCHAR(500),
        subject VARCHAR(500),
        valid_from DATETIME,
        valid_to DATETIME,
        days_left INTEGER,
        protocol VARCHAR(50),
        cipher VARCHAR(100),
        san_match BOOLEAN,
        chain_json TEXT,
        hsts BOOLEAN,
        error_message TEXT,
        FOREIGN KEY (monitor_id) REFERENCES monitors (id) ON DELETE CASCADE
    )
    """)

    # 2. Create Index on ssl_checks
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ssl_checks_monitor_checked ON ssl_checks(monitor_id, checked_at)")

    # 3. Add columns to monitors table
    # We check if they exist first
    cursor.execute("PRAGMA table_info(monitors)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'ssl_expires_at' not in columns:
        cursor.execute("ALTER TABLE monitors ADD COLUMN ssl_expires_at DATETIME")
        print("Added ssl_expires_at to monitors")
    
    if 'ssl_status' not in columns:
        cursor.execute("ALTER TABLE monitors ADD COLUMN ssl_status VARCHAR(50)")
        print("Added ssl_status to monitors")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
