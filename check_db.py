import sqlite3

def check_db():
    conn = sqlite3.connect('instance/monitor.db')
    cur = conn.cursor()
    # List all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print('Tables:', tables)
    # Count rows in each
    for t in tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM {t}')
            print(f'  {t}: {cur.fetchone()[0]} rows')
        except: pass
    conn.close()

if __name__ == '__main__':
    check_db()
