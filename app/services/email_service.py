"""
Email alert service — sends downtime / recovery / SSL alerts via SMTP.
If SMTP is not configured, alerts are logged instead of sent (no crash).
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import Config

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    return bool(Config.SMTP_HOST and Config.SMTP_USER and Config.SMTP_PASSWORD)


def _send(to: str, subject: str, body_html: str) -> bool:
    """Send an HTML email. Returns True on success, False otherwise."""
    if not _smtp_configured():
        logger.info(f'[EMAIL LOG] To={to} Subject="{subject}" (SMTP not configured — log-only)')
        return False

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = Config.SMTP_FROM or Config.SMTP_USER
    msg['To']      = to
    msg.attach(MIMEText(body_html, 'html'))

    try:
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
            server.sendmail(msg['From'], [to], msg.as_string())
        logger.info(f'Email sent to {to}: {subject}')
        return True
    except Exception as e:
        logger.error(f'Failed to send email to {to}: {e}')
        return False


def send_downtime_alert(to: str, site_name: str, url: str, error: str = '') -> bool:
    subject = f'🔴 {site_name} is DOWN'
    body = f"""
    <h2 style="color:#ef4444">🔴 {site_name} is DOWN</h2>
    <p>Your monitored website is currently unreachable.</p>
    <table>
      <tr><td><strong>URL:</strong></td><td>{url}</td></tr>
      <tr><td><strong>Reason:</strong></td><td>{error or 'Connection failed'}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:12px">Universal Monitor — automatic alert</p>
    """
    return _send(to, subject, body)


def send_recovery_alert(to: str, site_name: str, url: str, response_ms: int = None) -> bool:
    subject = f'✅ {site_name} is back ONLINE'
    resp = f'{response_ms} ms' if response_ms else 'N/A'
    body = f"""
    <h2 style="color:#10b981">✅ {site_name} is back ONLINE</h2>
    <p>Your monitored website has recovered.</p>
    <table>
      <tr><td><strong>URL:</strong></td><td>{url}</td></tr>
      <tr><td><strong>Response time:</strong></td><td>{resp}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:12px">Universal Monitor — automatic alert</p>
    """
    return _send(to, subject, body)


def send_ssl_alert(to: str, site_name: str, url: str, days_left: int) -> bool:
    subject = f'⚠️ SSL certificate for {site_name} expires in {days_left} days'
    body = f"""
    <h2 style="color:#f59e0b">⚠️ SSL Certificate Expiring Soon</h2>
    <table>
      <tr><td><strong>Site:</strong></td><td>{site_name}</td></tr>
      <tr><td><strong>URL:</strong></td><td>{url}</td></tr>
      <tr><td><strong>Days left:</strong></td><td>{days_left}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:12px">Universal Monitor — automatic alert</p>
    """
    return _send(to, subject, body)
