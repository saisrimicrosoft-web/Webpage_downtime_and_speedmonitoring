"""
engine/main.py — Nexora FastAPI Monitoring Engine
Reads active websites from Supabase, checks each one,
writes results back to Supabase checks/incidents/ssl_certs/websites.
"""
from __future__ import annotations
import asyncio
import logging
import os
import socket
import ssl as ssl_lib
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, BackgroundTasks
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("nexora.engine")

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SUPABASE_KEY      = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
CHECK_INTERVAL    = int(os.environ.get("CHECK_INTERVAL_SECONDS", 60))
REQUEST_TIMEOUT   = int(os.environ.get("REQUEST_TIMEOUT_SECONDS", 10))
DEGRADED_MS       = int(os.environ.get("DEGRADED_THRESHOLD_MS", 1500))
SSL_WARNING_DAYS  = int(os.environ.get("SSL_WARNING_DAYS", 14))

# Detected at startup via ip-api.com — used as the region for all checks
SERVER_REGION: str = "India - Mumbai"  # fallback; overwritten in startup()

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="Nexora Monitoring Engine")
scheduler = AsyncIOScheduler()


# ── SSL helper ────────────────────────────────────────────────────────────────

def get_ssl_info(hostname: str, port: int = 443) -> dict[str, Any]:
    ctx = ssl_lib.create_default_context()
    try:
        with socket.create_connection((hostname, port), timeout=10) as raw:
            with ctx.wrap_socket(raw, server_hostname=hostname) as tls:
                cert = tls.getpeercert()
        not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        issuer_parts = dict(x[0] for x in cert.get("issuer", []))
        not_before = datetime.strptime(cert["notBefore"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        return {
            "expires_at": not_after.isoformat(),
            "valid_from": not_before.isoformat(),
            "issuer": issuer_parts.get("organizationName", issuer_parts.get("commonName", "")),
            "days_remaining": max((not_after - datetime.now(timezone.utc)).days, 0),
        }
    except Exception as exc:
        logger.warning("SSL probe failed for %s: %s", hostname, exc)
        return {"expires_at": None, "valid_from": None, "issuer": None, "days_remaining": -1}


# ── Core check ────────────────────────────────────────────────────────────────

def detect_server_region() -> str:
    """
    Call ip-api.com (free, no key) to map this server's public IP to a
    human-readable monitoring region label matching the frontend's REGION_GROUPS.
    Falls back to the env var REGION_LABEL if set, then 'India - Mumbai'.
    """
    # Allow manual override via env var
    override = os.environ.get("REGION_LABEL", "").strip()
    if override:
        return override

    IP_REGION_MAP = {
        # India
        ("IN",): "India - Mumbai",
        # Singapore / SE Asia
        ("SG", "MY", "TH", "ID", "VN", "PH"): "AP-Southeast Singapore",
        # Japan / Korea / HK
        ("JP",): "AP-Northeast Tokyo",
        ("KR",): "AP-Northeast Seoul",
        ("HK", "TW", "CN"): "AP-East Hong Kong",
        # Oceania
        ("AU",): "AP-Southeast Sydney",
        ("NZ",): "AP-Southeast Auckland",
        # Middle East
        ("AE", "OM"): "ME-Central UAE Dubai",
        ("SA",): "ME-Central Riyadh",
        ("BH", "KW", "QA"): "ME-South Bahrain",
        # Europe
        ("GB", "IE"): "EU-West London",
        ("DE", "AT", "CH"): "EU-Central Frankfurt",
        ("FR", "BE", "LU"): "EU-South Paris",
        ("NL",): "EU-West Amsterdam",
        ("SE", "NO", "FI", "DK"): "EU-North Stockholm",
        ("PL", "UA", "RU", "CZ", "SK", "HU"): "EU-East Warsaw",
        ("IT",): "EU-South Milan",
        ("ES", "PT"): "EU-South Madrid",
        # North America
        ("US",): "US-East N.Virginia",
        ("CA",): "CA-Central Montreal",
        # South America
        ("BR",): "SA-East São Paulo",
        ("AR",): "SA-South Buenos Aires",
        ("CL",): "SA-West Santiago",
        ("CO",): "SA-North Bogotá",
        # Africa
        ("ZA",): "AF-South Johannesburg",
        ("EG",): "AF-North Cairo",
        ("NG",): "AF-West Lagos",
        ("KE",): "AF-East Nairobi",
    }

    try:
        import requests as _requests
        resp = _requests.get("http://ip-api.com/json/?fields=countryCode,city,regionName", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            country = data.get("countryCode", "")
            city    = data.get("city", "").lower()
            logger.info("IP geolocation: country=%s city=%s", country, city)

            # Fine-grained India city mapping
            if country == "IN":
                if any(c in city for c in ["bengaluru", "bangalore"]):  return "India - Bengaluru"
                if any(c in city for c in ["delhi", "new delhi", "gurgaon", "noida"]): return "India - Delhi NCR"
                if any(c in city for c in ["hyderabad", "secunderabad"]): return "India - Hyderabad"
                if any(c in city for c in ["chennai", "madras"]):        return "India - Chennai"
                if any(c in city for c in ["pune"]):                     return "India - Pune"
                if any(c in city for c in ["kolkata", "calcutta"]):      return "India - Kolkata"
                return "India - Mumbai"

            # Fine-grained US mapping
            if country == "US":
                if any(c in city for c in ["los angeles", "san francisco", "seattle", "portland"]): return "US-West California"
                if any(c in city for c in ["chicago", "minneapolis", "kansas"]): return "US-Central Iowa"
                if any(c in city for c in ["dallas", "houston", "austin"]): return "US-South Texas"
                if any(c in city for c in ["denver", "phoenix", "salt lake"]): return "US-West Oregon"
                return "US-East N.Virginia"

            # Lookup in the country map
            for country_codes, region_label in IP_REGION_MAP.items():
                if country in country_codes:
                    return region_label

    except Exception as exc:
        logger.warning("Region auto-detect failed: %s — using fallback", exc)

    return "India - Mumbai"


async def check_website(site: dict[str, Any]) -> None:
    website_id = site["id"]
    url        = site["url"]
    region     = site.get("region") or SERVER_REGION
    now        = datetime.now(timezone.utc)

    checked_at   = now.isoformat()
    status_code  = None
    latency_ms   = None
    is_up        = False
    error_msg    = None
    ssl_info: dict[str, Any] = {}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            t0 = asyncio.get_event_loop().time()
            resp = await client.get(url, headers={"User-Agent": "NexoraMonitor/2.0"})
            latency_ms  = int((asyncio.get_event_loop().time() - t0) * 1000)
            status_code = resp.status_code
            is_up       = 200 <= status_code <= 299

            if not is_up and status_code >= 500:
                error_msg = f"HTTP {status_code}"
            elif latency_ms and latency_ms > DEGRADED_MS:
                error_msg = f"High latency: {latency_ms}ms"

    except httpx.TimeoutException:
        error_msg = f"Timeout after {REQUEST_TIMEOUT}s"
    except httpx.ConnectError as exc:
        error_msg = f"Connection error: {exc}"
    except Exception as exc:
        error_msg = str(exc)

    # SSL probe for https
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme == "https":
        ssl_info = get_ssl_info(parsed.hostname or "", parsed.port or 443)

    # Classify status
    if not is_up:
        new_status = "down"
    elif latency_ms and latency_ms > DEGRADED_MS:
        new_status = "degraded"
    elif status_code and status_code >= 400:
        new_status = "degraded"
    else:
        new_status = "operational"

    # ── Write check row ────────────────────────────────────────────────────
    sb.table("checks").insert({
        "website_id": website_id,
        "url":        url,
        "status_code": status_code,
        "latency_ms":  latency_ms,
        "is_up":       is_up,
        "error":       error_msg,
        "region":      region,
        "checked_at":  checked_at,
    }).execute()

    # ── Compute 90-day uptime ──────────────────────────────────────────────
    cutoff = (now - timedelta(days=90)).isoformat()
    rows = sb.table("checks") \
        .select("is_up") \
        .eq("website_id", website_id) \
        .gte("checked_at", cutoff) \
        .execute().data or []
    total = len(rows)
    up_count = sum(1 for r in rows if r["is_up"])
    uptime_pct = round((up_count / total * 100) if total else 0, 3)

    # ── Update websites row ────────────────────────────────────────────────
    update_payload: dict[str, Any] = {
        "status":          new_status,
        "last_response_ms": latency_ms,
        "last_checked_at":  checked_at,
        "uptime_pct":       uptime_pct,
    }
    if ssl_info.get("expires_at"):
        update_payload["ssl_expiry_at"] = ssl_info["expires_at"]

    sb.table("websites").update(update_payload).eq("id", website_id).execute()

    # ── SSL cert upsert ────────────────────────────────────────────────────
    if ssl_info.get("expires_at"):
        existing = sb.table("ssl_certs").select("id").eq("website_id", website_id).execute().data
        ssl_payload = {
            "website_id":      website_id,
            "url":             url,
            "issuer":          ssl_info.get("issuer"),
            "valid_from":      ssl_info.get("valid_from"),
            "expires_at":      ssl_info.get("expires_at"),
            "days_remaining":  ssl_info.get("days_remaining"),
            "last_checked_at": checked_at,
        }
        if existing:
            sb.table("ssl_certs").update(ssl_payload).eq("website_id", website_id).execute()
        else:
            sb.table("ssl_certs").insert(ssl_payload).execute()

    # ── Incident management ────────────────────────────────────────────────
    open_incidents = sb.table("incidents") \
        .select("id, type") \
        .eq("website_id", website_id) \
        .eq("status", "open") \
        .execute().data or []

    if new_status in ("down", "degraded"):
        # Open incident if none exists for this type
        already_open = any(i["type"] == new_status for i in open_incidents)
        if not already_open:
            sb.table("incidents").insert({
                "website_id": website_id,
                "url":        url,
                "type":       new_status,
                "started_at": checked_at,
                "status":     "open",
                "details":    error_msg,
            }).execute()
    elif new_status == "operational" and open_incidents:
        # Resolve all open incidents on recovery
        for inc in open_incidents:
            sb.table("incidents").update({
                "status":      "resolved",
                "resolved_at": checked_at,
            }).eq("id", inc["id"]).execute()

    # SSL expiry incident
    days_left = ssl_info.get("days_remaining", -1)
    if isinstance(days_left, int) and 0 <= days_left < SSL_WARNING_DAYS:
        already_ssl = any(i["type"] == "ssl_expiry" for i in open_incidents)
        if not already_ssl:
            sb.table("incidents").insert({
                "website_id": website_id,
                "url":        url,
                "type":       "ssl_expiry",
                "started_at": checked_at,
                "status":     "open",
                "details":    f"SSL cert expires in {days_left} days",
            }).execute()

    logger.info("✓ %s  status=%s  latency=%sms  uptime=%.2f%%",
                url, new_status, latency_ms, uptime_pct)


# ── Scheduler job ─────────────────────────────────────────────────────────────

async def run_all_checks() -> None:
    try:
        sites = sb.table("websites").select("*").eq("is_active", True).execute().data or []
        if not sites:
            logger.info("No active websites to check.")
            return
        logger.info("Running checks for %d website(s)…", len(sites))
        await asyncio.gather(*[check_website(s) for s in sites])
    except Exception as exc:
        logger.error("Scheduler error: %s", exc)


# ── FastAPI endpoints ─────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "nexora-monitor", "version": "2.0"}


@app.post("/check/{website_id}")
async def check_now(website_id: int, background_tasks: BackgroundTasks):
    """Trigger an immediate check for a single website."""
    rows = sb.table("websites").select("*").eq("id", website_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Website not found")
    background_tasks.add_task(check_website, rows[0])
    return {"status": "check_triggered", "website_id": website_id}


@app.on_event("startup")
async def startup():
    # ── Auto-detect server region ──────────────────────────────────────────
    global SERVER_REGION
    SERVER_REGION = detect_server_region()
    logger.info("Server region detected: %s", SERVER_REGION)

    # Backfill: update any website whose region is the boring placeholder default
    # (anything that looks generic — 'Unknown' or not set)
    try:
        plain_defaults = ["Unknown", ""]
        all_sites = sb.table("websites").select("id, region").execute().data or []
        to_update = [s["id"] for s in all_sites if s.get("region", "") in plain_defaults]
        if to_update:
            for site_id in to_update:
                sb.table("websites").update({"region": SERVER_REGION}).eq("id", site_id).execute()
            logger.info("Backfilled region '%s' for %d website(s)", SERVER_REGION, len(to_update))
    except Exception as exc:
        logger.warning("Region backfill failed: %s", exc)

    scheduler.add_job(
        run_all_checks,
        trigger="interval",
        seconds=CHECK_INTERVAL,
        id="run_all_checks",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Engine started. Interval=%ds", CHECK_INTERVAL)
    # Run immediately on startup
    asyncio.create_task(run_all_checks())


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown(wait=False)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
