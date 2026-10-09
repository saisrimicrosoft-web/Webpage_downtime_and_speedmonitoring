import os
import logging
from datetime import datetime, timezone
from supabase import create_client, Client
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class MonitoringDatabaseClient:
    """Thread-safe Supabase client for the monitoring pipeline.

    Uses the Service Role Key to bypass Row Level Security (RLS)
    for backend insert/upsert operations.
    """

    def __init__(self):
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
            )

        self.supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully.")

    # ──────────────────────────── Check Results ────────────────────────────

    def log_check_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new check result row.

        Expected dictionary schema (from Person A / MonitorService):
        {
            "target_id": "uuid-string",
            "status_code": 200,
            "response_time_ms": 150,
            "is_up": True,
            "ssl_valid": True,
            "ssl_days_remaining": 45
        }
        """
        response = self.supabase.table("check_results").insert(result).execute()
        return response.data[0] if response.data else {}

    def get_recent_checks(self, target_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent check results for a target, newest first."""
        response = (
            self.supabase.table("check_results")
            .select("*")
            .eq("target_id", target_id)
            .order("checked_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data if response.data else []

    # ──────────────────────────── Incidents ────────────────────────────────

    def get_open_incident(self, target_id: str, incident_type: str) -> Optional[Dict[str, Any]]:
        """Fetch an open incident for a specific target and type."""
        response = (
            self.supabase.table("incidents")
            .select("*")
            .eq("target_id", target_id)
            .eq("incident_type", incident_type)
            .eq("status", "OPEN")
            .execute()
        )
        return response.data[0] if response.data else None

    def create_incident(self, target_id: str, incident_type: str, details: str) -> Dict[str, Any]:
        """Create a new open incident."""
        data = {
            "target_id": target_id,
            "incident_type": incident_type,
            "status": "OPEN",
            "details": details,
        }
        response = self.supabase.table("incidents").insert(data).execute()
        return response.data[0] if response.data else {}

    def resolve_incident(self, incident_id: str) -> Dict[str, Any]:
        """Mark an incident as RESOLVED and set resolved_at timestamp."""
        data = {
            "status": "RESOLVED",
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }
        response = (
            self.supabase.table("incidents")
            .update(data)
            .eq("id", incident_id)
            .execute()
        )
        return response.data[0] if response.data else {}

    def get_incidents(self, target_id: str = None, status: str = None,
                      limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch incidents with optional filters."""
        query = self.supabase.table("incidents").select("*")
        if target_id:
            query = query.eq("target_id", target_id)
        if status:
            query = query.eq("status", status)
        query = query.order("started_at", desc=True).limit(limit)
        response = query.execute()
        return response.data if response.data else []

    # ──────────────────────────── Targets ──────────────────────────────────

    def get_target(self, target_id: str) -> Optional[Dict[str, Any]]:
        """Fetch target details to enrich alerts."""
        response = (
            self.supabase.table("targets")
            .select("*")
            .eq("id", target_id)
            .execute()
        )
        return response.data[0] if response.data else None

    def get_all_targets(self) -> List[Dict[str, Any]]:
        """Fetch all monitoring targets from Supabase."""
        response = self.supabase.table("targets").select("*").execute()
        return response.data if response.data else []

    def get_or_create_target_by_url(self, url: str) -> Dict[str, Any]:
        """Fetch a target by URL, or create it if it doesn't exist.

        Used during migration from urls.json to the Supabase targets table.
        The service role key bypasses RLS so user_id is optional.
        """
        response = (
            self.supabase.table("targets")
            .select("*")
            .eq("url", url)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]

        # Auto-generate a name from the hostname
        name = url.split("//")[-1].split("/")[0]
        new_target = {"name": name, "url": url}
        insert_resp = self.supabase.table("targets").insert(new_target).execute()
        if insert_resp.data:
            logger.info(f"Created new target: {name} ({url})")
            return insert_resp.data[0]
        return {}
