"""Tests for the DiscordAlertManager — stateful anti-spam alerting engine."""
from unittest.mock import patch, MagicMock
from monitoring_core.alert_manager import AlertManager


def _make_mock_db():
    """Create a mock MonitoringDatabaseClient."""
    mock_db = MagicMock()
    mock_db.get_open_incident.return_value = None
    mock_db.create_incident.return_value = {"id": "incident-uuid"}
    mock_db.resolve_incident.return_value = {"id": "incident-uuid", "status": "RESOLVED"}
    mock_db.get_target.return_value = {
        "id": "target-uuid",
        "name": "example.com",
        "url": "https://example.com",
    }
    return mock_db


def _make_alerter(mock_db, webhook_url="https://discord.com/api/webhooks/test"):
    """Create an AlertManager with a mock DB and optional Discord webhook."""
    return AlertManager(mock_db, discord_webhook_url=webhook_url)


# ─────────────── Downtime State Machine ───────────────

def test_up_to_down_creates_incident_and_alerts():
    """When site goes from UP to DOWN, a new incident should be created and Discord alerted."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = None  # No existing incident

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": False, "status_code": None, "response_time_ms": 5000}

    with patch.object(alerter, 'broadcast_alert', return_value=True) as mock_send:
        alerter.process_check(check)

        mock_db.create_incident.assert_called_once()
        args = mock_db.create_incident.call_args[0]
        assert args[0] == "target-uuid"
        assert args[1] == "DOWNTIME"

        mock_send.assert_called_once()
        assert "DOWN" in mock_send.call_args[1]["title"]


def test_sustained_downtime_no_duplicate_alert():
    """When site is already DOWN with an open incident, no new alert should fire (anti-spam)."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = {"id": "existing-incident-uuid", "status": "OPEN"}

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": False, "status_code": None, "response_time_ms": 5000}

    with patch.object(alerter, 'broadcast_alert') as mock_send:
        alerter.process_check(check)

        mock_db.create_incident.assert_not_called()
        mock_send.assert_not_called()


def test_down_to_up_resolves_incident_and_alerts():
    """When site recovers from DOWN to UP, the incident should be resolved and Discord alerted."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.side_effect = lambda tid, itype: (
        {"id": "existing-incident-uuid", "status": "OPEN"} if itype == "DOWNTIME" else None
    )

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200, "response_time_ms": 150}

    with patch.object(alerter, 'broadcast_alert', return_value=True) as mock_send:
        alerter.process_check(check)

        mock_db.resolve_incident.assert_called_once_with("existing-incident-uuid")
        assert any("RECOVERED" in str(call) for call in mock_send.call_args_list)


def test_normal_up_no_alert():
    """When site is UP with no open incident, nothing should happen."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = None

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200,
             "response_time_ms": 100, "ssl_valid": True, "ssl_days_remaining": 90}

    with patch.object(alerter, 'broadcast_alert') as mock_send:
        alerter.process_check(check)

        mock_db.create_incident.assert_not_called()
        mock_db.resolve_incident.assert_not_called()
        mock_send.assert_not_called()


# ─────────────── SSL State Machine ───────────────

def test_ssl_expiring_creates_incident():
    """When SSL < 14 days, an SSL_ISSUE incident should be created."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = None

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200,
             "response_time_ms": 100, "ssl_valid": True, "ssl_days_remaining": 7}

    with patch.object(alerter, 'broadcast_alert', return_value=True) as mock_send:
        alerter.process_check(check)

        # Should have created an SSL incident
        create_calls = mock_db.create_incident.call_args_list
        ssl_calls = [c for c in create_calls if c[0][1] == "SSL_ISSUE"]
        assert len(ssl_calls) == 1
        assert "SSL" in mock_send.call_args[1]["title"]


def test_ssl_invalid_creates_incident():
    """When SSL is invalid, an SSL_ISSUE incident should be created."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = None

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200,
             "response_time_ms": 100, "ssl_valid": False, "ssl_days_remaining": 0}

    with patch.object(alerter, 'broadcast_alert', return_value=True) as mock_send:
        alerter.process_check(check)

        create_calls = mock_db.create_incident.call_args_list
        ssl_calls = [c for c in create_calls if c[0][1] == "SSL_ISSUE"]
        assert len(ssl_calls) == 1


def test_ssl_renewed_resolves_incident():
    """When SSL is renewed (valid and >14 days), the incident should be resolved."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.side_effect = lambda tid, itype: (
        {"id": "ssl-incident-uuid", "status": "OPEN"} if itype == "SSL_ISSUE" else None
    )

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200,
             "response_time_ms": 100, "ssl_valid": True, "ssl_days_remaining": 90}

    with patch.object(alerter, 'broadcast_alert', return_value=True) as mock_send:
        alerter.process_check(check)

        mock_db.resolve_incident.assert_called_once_with("ssl-incident-uuid")
        assert any("RESTORED" in str(call) for call in mock_send.call_args_list)


def test_sustained_ssl_issue_no_duplicate_alert():
    """When SSL issue persists with an open incident, no new alert should fire."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.side_effect = lambda tid, itype: (
        {"id": "ssl-incident-uuid", "status": "OPEN"} if itype == "SSL_ISSUE" else None
    )

    alerter = _make_alerter(mock_db)

    check = {"target_id": "target-uuid", "is_up": True, "status_code": 200,
             "response_time_ms": 100, "ssl_valid": False, "ssl_days_remaining": 5}

    with patch.object(alerter, 'broadcast_alert') as mock_send:
        alerter.process_check(check)

        mock_db.create_incident.assert_not_called()
        mock_send.assert_not_called()


# ─────────────── Edge Cases ───────────────

def test_missing_target_id_skips():
    """process_check should skip silently when target_id is missing."""
    mock_db = _make_mock_db()
    alerter = _make_alerter(mock_db)

    alerter.process_check({"is_up": True})
    mock_db.get_target.assert_not_called()


def test_target_not_found_skips():
    """process_check should skip when target doesn't exist in DB."""
    mock_db = _make_mock_db()
    mock_db.get_target.return_value = None

    alerter = _make_alerter(mock_db)
    alerter.process_check({"target_id": "nonexistent"})

    mock_db.get_open_incident.assert_not_called()


def test_no_webhook_still_tracks_incidents():
    """AlertManager should still create/resolve incidents even without a webhook URL."""
    mock_db = _make_mock_db()
    mock_db.get_open_incident.return_value = None

    alerter = _make_alerter(mock_db, webhook_url="")  # No webhook

    check = {"target_id": "target-uuid", "is_up": False, "status_code": None, "response_time_ms": 5000}
    alerter.process_check(check)

    # Incident should still be created even though Discord notification is skipped
    mock_db.create_incident.assert_called_once()


def test_broadcast_alert_sends_with_correct_payload():
    """Test that the Discord embed payload is well-formed when broadcast_alert is used."""
    mock_db = _make_mock_db()
    alerter = _make_alerter(mock_db)

    with patch('monitoring_core.alert_manager.requests.post') as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 204
        mock_post.return_value = mock_resp

        result = alerter.broadcast_alert(
            title="Test Title",
            description="Test Description",
            color=0xFF0000,
            fields=[{"name": "Field1", "value": "Value1", "inline": True}]
        )

        assert result is True
        mock_post.assert_called_once()
        payload = mock_post.call_args[1]["json"]
        embed = payload["embeds"][0]
        assert embed["title"] == "Test Title"
        assert embed["description"] == "Test Description"
        assert embed["color"] == 0xFF0000
        assert embed["footer"]["text"] == "Universal Early Warning System"
        assert len(embed["fields"]) == 1
