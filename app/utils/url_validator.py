from urllib.parse import urlparse

def is_valid_url(url: str) -> bool:
    """Validates that a string is a valid HTTP/HTTPS URL."""
    if not url:
        return False
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        if not parsed.netloc:
            return False
        return True
    except Exception:
        return False
