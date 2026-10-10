import socket
import ssl
import http.client
from datetime import datetime, timezone
import json
import urllib.parse
import ipaddress

def _is_private_ip(host):
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local
    except ValueError:
        return False

def _extract_name(x509_name):
    """Extract commonName or organizationName from a cert name tuple."""
    if not x509_name:
        return "Unknown"
    for rdn in x509_name:
        for attr in rdn:
            if attr[0] == 'commonName':
                return attr[1]
    for rdn in x509_name:
        for attr in rdn:
            if attr[0] == 'organizationName':
                return attr[1]
    return "Unknown"

def check_ssl(url, warn_days=30, debug_mode=False):
    """
    Check SSL certificate of a given URL.
    Returns a dict with all required fields for ssl_checks.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        host = parsed.hostname
        if not host:
            host = url.replace('https://', '').replace('http://', '').split('/')[0]
    except Exception:
        host = url
        
    if not debug_mode and (_is_private_ip(host) or host == 'localhost'):
        return {'status': 'unreachable', 'error_message': 'Private IPs / localhost not allowed'}

    result = {
        'status': 'unreachable',
        'issuer': None,
        'subject': None,
        'valid_from': None,
        'valid_to': None,
        'days_left': None,
        'protocol': None,
        'cipher': None,
        'san_match': False,
        'chain_json': '[]',
        'hsts': False,
        'error_message': None
    }

    ctx = ssl.create_default_context()
    
    # Optional: try to fetch HSTS via HTTP
    try:
        conn_http = http.client.HTTPSConnection(host, timeout=5, context=ctx)
        conn_http.request("HEAD", "/")
        res = conn_http.getresponse()
        result['hsts'] = bool(res.getheader('Strict-Transport-Security'))
        conn_http.close()
    except Exception:
        pass # Ignore HSTS fetch errors, focus on SSL

    # Verify connection
    def fetch_cert(verify=True):
        context = ssl.create_default_context() if verify else ssl._create_unverified_context()
        with socket.create_connection((host, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert() if verify else ssock.getpeercert(binary_form=False)
                version = ssock.version()
                cipher = ssock.cipher()[0] if ssock.cipher() else None
                return cert, version, cipher

    try:
        cert, version, cipher = fetch_cert(verify=True)
        result['protocol'] = version
        result['cipher'] = cipher
    except ssl.SSLCertVerificationError as e:
        result['status'] = 'untrusted'
        result['error_message'] = str(e)
        
        # Retry without verification just to get dates (using a trick: require cert but don't check hostname/CA)
        try:
            ctx_no_verify = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ctx_no_verify.check_hostname = False
            ctx_no_verify.verify_mode = ssl.CERT_NONE
            with socket.create_connection((host, 443), timeout=10) as sock:
                with ctx_no_verify.wrap_socket(sock, server_hostname=host) as ssock2:
                    # Can't easily get parsed cert in CERT_NONE without external libs.
                    # We will just mark it untrusted.
                    result['protocol'] = ssock2.version()
                    result['cipher'] = ssock2.cipher()[0] if ssock2.cipher() else None
        except Exception:
            pass
        return result
    except ssl.SSLError as e:
        result['status'] = 'handshake_failed'
        result['error_message'] = str(e)
        return result
    except (socket.timeout, ConnectionRefusedError, socket.gaierror) as e:
        result['status'] = 'unreachable'
        result['error_message'] = str(e)
        return result
    except Exception as e:
        result['status'] = 'no_https'
        result['error_message'] = str(e)
        return result

    try:
        if cert:
            result['issuer'] = _extract_name(cert.get('issuer'))
            result['subject'] = _extract_name(cert.get('subject'))
            
            not_before = ssl.cert_time_to_seconds(cert['notBefore'])
            not_after = ssl.cert_time_to_seconds(cert['notAfter'])
            
            result['valid_from'] = datetime.fromtimestamp(not_before, tz=timezone.utc)
            result['valid_to'] = datetime.fromtimestamp(not_after, tz=timezone.utc)
            
            now = datetime.now(timezone.utc)
            days_left = (result['valid_to'] - now).days
            result['days_left'] = days_left
            
            if days_left < 0:
                result['status'] = 'expired'
            elif days_left <= warn_days:
                result['status'] = 'expiring'
            else:
                result['status'] = 'valid'

            # SAN match
            san = cert.get('subjectAltName', [])
            san_names = [name for type_, name in san if type_ == 'DNS']
            result['san_match'] = any(host == name or (name.startswith('*.') and host.endswith(name[1:])) for name in san_names)
            
            # Chain
            chain = []
            chain.append({"name": result['subject'], "type": "leaf"})
            chain.append({"name": result['issuer'], "type": "issuer"})
            # We don't have an easy way to parse DER certs in standard library for the full chain 
            # so we just provide the basic 2-step chain from issuer dict
            result['chain_json'] = json.dumps(chain)

    except Exception as e:
        result['error_message'] = f"Parse error: {e}"
        if result['status'] == 'unreachable': 
            result['status'] = 'handshake_failed'

    return result
