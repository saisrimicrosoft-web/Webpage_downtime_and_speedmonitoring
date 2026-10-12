import ssl
import socket
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class SSLService:
    @staticmethod
    def check_ssl(url):
        from urllib.parse import urlparse
        parsed = urlparse(url)
        
        if parsed.scheme != 'https':
            return None, None
            
        hostname = parsed.netloc
        port = 443
        if ':' in hostname:
            hostname, port_str = hostname.split(':')
            port = int(port_str)
            
        context = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, port), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    not_after_str = cert.get('notAfter')
                    if not_after_str:
                        # Format: 'Oct 15 12:00:00 2024 GMT'
                        expiry_date = datetime.strptime(not_after_str, '%b %d %H:%M:%S %Y %Z')
                        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                        remaining_days = (expiry_date - datetime.now(timezone.utc)).days
                        is_valid = remaining_days > 0
                        return is_valid, remaining_days
                    return False, 0
        except ssl.SSLCertVerificationError:
            return False, 0
        except Exception as e:
            logger.warning(f"SSL check failed for {hostname}: {str(e)}")
            return False, None
