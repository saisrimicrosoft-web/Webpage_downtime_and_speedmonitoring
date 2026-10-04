"""
monitor_engine.py — Core Monitoring Engine
==========================================
Person A's deliverable: URL → check → metrics

Responsibilities
----------------
* Read target URLs from urls.json
* Perform HTTP GET checks (status code, response time, is_up)
* Probe SSL certificate expiry (ssl_days_left)
* Emit a structured list-of-dicts for the next teammate (DB / Discord layer)

Output schema per URL
---------------------
{
    "url":          str,   # original URL
    "checked_at":   str,   # ISO-8601 UTC timestamp
    "status_code":  int,   # HTTP status code; -1 on connection error
    "response_ms":  int,   # round-trip time in milliseconds; -1 on error
    "is_up":        bool,  # True when 200 <= status_code <= 299
    "ssl_days_left": int,  # days until cert expiry; -1 for HTTP / error
}

Environment variables (can be set in .env for local runs)
----------------------------------------------------------
REQUEST_TIMEOUT_SECONDS : int  -- HTTP timeout (default 10)
"""

from __future__ import annotations

import json
import logging
import os
import socket
import ssl
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

load_dotenv()  # reads .env when running locally; no-op in CI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_ROOT = Path(__file__).parent.resolve()
URLS_FILE: Path = _ROOT / "urls.json"

REQUEST_TIMEOUT_SECONDS: int = int(os.environ.get("REQUEST_TIMEOUT_SECONDS", 10))

# SSL probe uses a raw TLS handshake; give it a fixed 10-second socket timeout.
SSL_SOCKET_TIMEOUT: int = 10

# ---------------------------------------------------------------------------
# Helper: load target list
# ---------------------------------------------------------------------------


def load_urls() -> list[str]:
    """Return the list of URLs to monitor from urls.json.

    Returns an empty list (and logs a warning) if the file is missing or
    contains invalid JSON so that the caller can decide how to handle it.
    """
    try:
        with URLS_FILE.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, list):
            logger.error("urls.json must contain a JSON array; got %s", type(data))
            return []
        urls = [str(u).strip() for u in data if str(u).strip()]
        logger.info("Loaded %d URL(s) from %s", len(urls), URLS_FILE)
        return urls
    except FileNotFoundError:
        logger.error("urls.json not found at %s", URLS_FILE)
        return []
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse urls.json: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Helper: SSL certificate expiry
# ---------------------------------------------------------------------------


def _get_ssl_days_left(hostname: str, port: int = 443) -> int:
    """Return the number of days until the TLS certificate on hostname expires.

    Returns -1 when:
    * The target uses plain HTTP (no TLS).
    * A network / TLS error prevents the probe from completing.

    The raw SSL handshake (ssl + socket) is used deliberately -- it avoids
    creating a full requests session and works even when the HTTP check fails.
    """
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((hostname, port), timeout=SSL_SOCKET_TIMEOUT) as raw:
            with ctx.wrap_socket(raw, server_hostname=hostname) as tls:
                cert: dict[str, Any] = tls.getpeercert()  # type: ignore[assignment]

        # notAfter is a string like "Sep 26 12:00:00 2025 GMT"
        not_after_str: str = cert["notAfter"]
        expiry: datetime = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
        expiry = expiry.replace(tzinfo=timezone.utc)
        days_left: int = (expiry - datetime.now(timezone.utc)).days
        return max(days_left, 0)

    except ssl.SSLError as exc:
        logger.warning("SSL probe failed for %s: %s", hostname, exc)
        return -1
    except (socket.timeout, ConnectionRefusedError, OSError) as exc:
        logger.warning("Network error during SSL probe for %s: %s", hostname, exc)
        return -1
    except (KeyError, ValueError) as exc:
        logger.warning("Could not parse certificate for %s: %s", hostname, exc)
        return -1


# ---------------------------------------------------------------------------
# Core: check a single URL
# ---------------------------------------------------------------------------


def check_url(url: str) -> dict[str, Any]:
    """Perform a full health-check on url and return a metrics dictionary.

    The returned dictionary always matches the agreed handoff schema:

        {
            "url":           str,
            "checked_at":    str,   # ISO-8601 UTC
            "status_code":   int,   # -1 on connection error
            "response_ms":   int,   # -1 on connection error
            "is_up":         bool,
            "ssl_days_left": int,   # -1 for HTTP / error
        }

    Every external call is wrapped in its own try/except so that a single
    bad URL never aborts the rest of the monitoring loop.
    """
    checked_at: str = datetime.now(timezone.utc).isoformat()

    # ---- defaults (used on error paths) ------------------------------------
    result: dict[str, Any] = {
        "url": url,
        "checked_at": checked_at,
        "status_code": -1,
        "response_ms": -1,
        "is_up": False,
        "ssl_days_left": -1,
    }

    # ---- URL validation ----------------------------------------------------
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        logger.error("Skipping invalid URL (unsupported scheme): %s", url)
        return result

    is_https: bool = parsed.scheme == "https"
    hostname: str = parsed.hostname or ""
    port: int = parsed.port or (443 if is_https else 80)

    # ---- HTTP GET check ----------------------------------------------------
    try:
        response = requests.get(
            url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            allow_redirects=True,
            headers={
                "User-Agent": "MonitorEngine/1.0"
            },
        )
        result["status_code"] = response.status_code
        result["response_ms"] = int(response.elapsed.total_seconds() * 1000)
        result["is_up"] = 200 <= response.status_code <= 299

        logger.info(
            "HTTP  %-50s  status=%d  %dms  up=%s",
            url,
            result["status_code"],
            result["response_ms"],
            result["is_up"],
        )

    except requests.exceptions.Timeout:
        logger.warning("HTTP timeout for %s after %ds", url, REQUEST_TIMEOUT_SECONDS)
        # is_up remains False, status_code / response_ms remain -1

    except requests.exceptions.ConnectionError as exc:
        logger.warning("HTTP connection error for %s: %s", url, exc)

    except requests.exceptions.TooManyRedirects:
        logger.warning("Too many redirects for %s", url)

    except requests.exceptions.RequestException as exc:
        logger.warning("HTTP request failed for %s: %s", url, exc)

    # ---- SSL probe ---------------------------------------------------------
    if is_https and hostname:
        result["ssl_days_left"] = _get_ssl_days_left(hostname, port)
        logger.info(
            "SSL   %-50s  days_left=%d",
            hostname,
            result["ssl_days_left"],
        )
    # For plain HTTP targets ssl_days_left stays -1 (not applicable).

    return result


# ---------------------------------------------------------------------------
# Entry-point: main monitoring loop
# ---------------------------------------------------------------------------


def main() -> list[dict[str, Any]]:
    """Check every URL in urls.json and return the aggregated results.

    The list of result-dicts is printed as JSON to stdout so it can be
    consumed by the next pipeline step (database insertion / alerting).
    """
    urls: list[str] = load_urls()

    if not urls:
        logger.warning("No URLs to monitor. Exiting.")
        return []

    results: list[dict[str, Any]] = []
    for url in urls:
        logger.info("--- Checking: %s", url)
        record = check_url(url)
        results.append(record)

    # Pretty-print the handoff payload to stdout for the next teammate.
    print(json.dumps(results, indent=2, default=str))
    logger.info("Monitoring complete. %d record(s) produced.", len(results))
    return results


# ---------------------------------------------------------------------------
# Script entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
