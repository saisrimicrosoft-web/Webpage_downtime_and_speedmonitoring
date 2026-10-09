import sqlite3

conn = sqlite3.connect('instance/monitor.db')
cur = conn.cursor()

try:
    cur.execute("SELECT count(*) FROM checks WHERE is_up=0 AND response_ms IS NOT NULL")
    checks_bad = cur.fetchone()[0]
    print(f"Bad rows in checks: {checks_bad}")
    
    cur.execute("UPDATE checks SET response_ms = NULL WHERE is_up=0")
    print(f"Fixed rows in checks: {cur.rowcount}")
except Exception as e:
    print("Error with checks:", e)

try:
    cur.execute("SELECT count(*) FROM user_checks WHERE status='down' AND response_time_ms IS NOT NULL")
    user_checks_bad = cur.fetchone()[0]
    print(f"Bad rows in user_checks: {user_checks_bad}")
    
    cur.execute("UPDATE user_checks SET response_time_ms = NULL WHERE status='down'")
    print(f"Fixed rows in user_checks: {cur.rowcount}")
except Exception as e:
    print("Error with user_checks:", e)

conn.commit()
conn.close()
