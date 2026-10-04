import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models.check import Check
from app.services.supabase_service import SupabaseService
from config import Config

def main():
    app = create_app()
    with app.app_context():
        print("--- Supabase Sync Utility ---")
        print(f"Supabase URL: {Config.SUPABASE_URL or 'NOT SET'}")
        print(f"Supabase Key: {'SET (' + Config.SUPABASE_KEY[:6] + '...)' if Config.SUPABASE_KEY else 'NOT SET'}")

        if not SupabaseService.is_configured():
            print("\n[!] Supabase is not fully configured in .env!")
            print("Please set SUPABASE_URL and SUPABASE_KEY in your .env file.")
            sys.exit(1)

        print("\nFetching checks from local database...")
        checks = Check.query.order_by(Check.checked_at.desc()).limit(100).all()
        print(f"Found {len(checks)} check records locally.")

        if not checks:
            print("No local checks found to sync.")
            return

        print("Syncing records to Supabase...")
        count = SupabaseService.sync_batch(checks)
        print(f"\n[+] Successfully synced {count} records to Supabase table 'CHECKS'!")

if __name__ == '__main__':
    main()
