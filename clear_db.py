import sqlite3
import os

def clear_demo_data():
    conn = sqlite3.connect('instance/monitor.db')
    cur = conn.cursor()
    
    tables_to_clear = [
        'checks', 'user_checks', 
        'incidents', 'user_incidents', 
        'alerts', 'notification_log', 
        'monitors', 'alert_rules'
    ]
    
    for table in tables_to_clear:
        try:
            cur.execute(f"DELETE FROM {table}")
        except Exception as e:
            print(f"Error clearing {table}: {e}")
            
    conn.commit()
    conn.close()
    print("Demo data cleared successfully.")

if __name__ == '__main__':
    clear_demo_data()
