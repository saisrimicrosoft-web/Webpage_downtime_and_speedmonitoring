import concurrent.futures
import logging
from app.models import db
from app.models.monitor import Monitor
from app.models.ssl_check import SSLCheck
from app.services.ssl_checker import check_ssl

logger = logging.getLogger(__name__)

def run_ssl_checks_for_all(app):
    """
    Run SSL checks for all active monitors using a thread pool.
    This should be called from the scheduler in an app context.
    """
    with app.app_context():
        monitors = Monitor.query.filter_by(is_active=True).all()
        # Ensure we don't detach objects for threads, we'll pass IDs and URLs.
        targets = [(m.id, m.url) for m in monitors]

    if not targets:
        return

    logger.info(f"Starting SSL checks for {len(targets)} monitors...")
    
    # Run in thread pool (max 5)
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        future_to_monitor = {
            executor.submit(check_ssl, url): (m_id, url) for m_id, url in targets
        }
        for future in concurrent.futures.as_completed(future_to_monitor):
            m_id, url = future_to_monitor[future]
            try:
                res = future.result()
                results.append((m_id, res))
            except Exception as exc:
                logger.error(f"SSL check generated an exception for {url}: {exc}")

    # Write results back to DB
    with app.app_context():
        for m_id, res in results:
            monitor = Monitor.query.get(m_id)
            if monitor:
                check = SSLCheck(
                    monitor_id=m_id,
                    status=res['status'],
                    issuer=res['issuer'],
                    subject=res['subject'],
                    valid_from=res['valid_from'],
                    valid_to=res['valid_to'],
                    days_left=res['days_left'],
                    protocol=res['protocol'],
                    cipher=res['cipher'],
                    san_match=res['san_match'],
                    chain_json=res['chain_json'],
                    hsts=res['hsts'],
                    error_message=res['error_message']
                )
                db.session.add(check)
                monitor.ssl_expires_at = res['valid_to']
                monitor.ssl_status = res['status']
        
        db.session.commit()
        logger.info("SSL checks completed and saved.")
