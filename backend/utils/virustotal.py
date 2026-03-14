"""
VirusTotal API v3 client for URL reputation check.
Used when user reports phishing with an optional URL to validate.
"""
import base64
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

VT_URL_REPORT = "https://www.virustotal.com/api/v3/urls/"


def _url_to_id(url: str) -> str:
    """VirusTotal URL id: base64url encode the URL and strip padding."""
    encoded = base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii")
    return encoded.rstrip("=")


def check_url_sync(url: str, api_key: str) -> dict | None:
    """
    Fetch URL report from VirusTotal (sync). Returns a summary dict or None on error.
    Returns: {
        "malicious": int,
        "suspicious": int,
        "undetected": int,
        "harmless": int,
        "permalink": str | None,
        "error": str | None  # only if partial failure
    }
    """
    if not api_key or not url or not url.strip():
        return None
    url = url.strip()
    try:
        vid = _url_to_id(url)
        req = urllib.request.Request(
            VT_URL_REPORT + vid,
            headers={"x-apikey": api_key, "Accept": "application/json"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        attrs = data.get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats") or {}
        # Human-readable report link (VT GUI)
        permalink = f"https://www.virustotal.com/gui/url/{vid}/details"
        return {
            "malicious": stats.get("malicious", 0),
            "suspicious": stats.get("suspicious", 0),
            "undetected": stats.get("undetected", 0),
            "harmless": stats.get("harmless", 0),
            "permalink": permalink,
            "error": None,
        }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"malicious": 0, "suspicious": 0, "undetected": 0, "harmless": 0, "permalink": None, "error": "URL not in VirusTotal"}
        logger.warning("VirusTotal HTTP error %s: %s", e.code, e.reason)
        return None
    except Exception as e:
        logger.warning("VirusTotal check failed: %s", e)
        return None

def check_file_from_url_sync(file_url: str, api_key: str) -> dict | None:
    """
    Download a file (up to 10MB) from a URL, hash it, and check/upload it to VirusTotal.
    """
    import hashlib
    import uuid

    if not api_key or not file_url or not file_url.strip():
        return None
        
    file_url = file_url.trim() if hasattr(file_url, 'trim') else file_url.strip()
    
    # 1. Download file content (max 10MB to avoid memory blowup)
    MAX_SIZE = 10 * 1024 * 1024
    file_data = b""
    try:
        req = urllib.request.Request(file_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                file_data += chunk
                if len(file_data) > MAX_SIZE:
                    return {"error": "File too large (exceeds 10MB limit)."}
    except Exception as e:
        logger.warning("Failed to download file from %s: %s", file_url, e)
        return {"error": f"Failed to download file: {str(e)}"}

    if not file_data:
        return {"error": "Downloaded file was empty."}

    # 2. Compute SHA-256 Hash
    file_hash = hashlib.sha256(file_data).hexdigest()

    # 3. Check if file is already known to VT
    try:
        req_check = urllib.request.Request(
            f"https://www.virustotal.com/api/v3/files/{file_hash}",
            headers={"x-apikey": api_key, "Accept": "application/json"},
            method="GET"
        )
        with urllib.request.urlopen(req_check, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            attrs = data.get("data", {}).get("attributes", {})
            stats = attrs.get("last_analysis_stats") or {}
            permalink = f"https://www.virustotal.com/gui/file/{file_hash}/details"
            return {
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "undetected": stats.get("undetected", 0),
                "harmless": stats.get("harmless", 0),
                "permalink": permalink,
                "error": None,
                "status": "completed"
            }
    except urllib.error.HTTPError as e:
        if e.code != 404:
            logger.warning("VT hash check failed %s: %s", e.code, e.reason)
            return {"error": "VirusTotal API error during hash lookup."}
        # 404 means the file is unknown to VT. Let's upload it.
    except Exception as e:
        logger.warning("VT hash check exception: %s", e)
        return {"error": "Failed to look up file hash on VirusTotal."}

    # 4. Upload file to VT
    try:
        boundary = uuid.uuid4().hex
        body = bytearray()
        
        # Multipart form data builder
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(b'Content-Disposition: form-data; name="file"; filename="downloaded_file"\r\n')
        body.extend(b'Content-Type: application/octet-stream\r\n\r\n')
        body.extend(file_data)
        body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

        req_upload = urllib.request.Request(
            "https://www.virustotal.com/api/v3/files",
            data=body,
            headers={
                "x-apikey": api_key,
                "Accept": "application/json",
                "Content-Type": f"multipart/form-data; boundary={boundary}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req_upload, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            # After uploading, VT returns an "analysis" object. It takes time to scan.
            # We return a queued status so the UI knows it's pending.
            analysis_id = data.get("data", {}).get("id")
            permalink = f"https://www.virustotal.com/gui/file/{file_hash}/details"
            return {
                "malicious": 0, "suspicious": 0, "undetected": 0, "harmless": 0,
                "permalink": permalink,
                "error": None,
                "status": "queued (analysis pending)"
            }
    except Exception as e:
        logger.warning("VT file upload failed: %s", e)
        return {"error": f"Failed to upload file to VirusTotal: {str(e)}"}
