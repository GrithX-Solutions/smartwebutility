#!/usr/bin/env python3
"""Submit changed production URLs to IndexNow after deployment."""
import json
import sys
import urllib.error
import urllib.parse
import urllib.request

HOST = "smartwebutility.com"
BASE = "https://smartwebutility.com"
KEY = "8f3a1c7d5e924b06a4d8f2c19e7b6a35"
KEY_LOCATION = f"{BASE}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/IndexNow"
MAX_URLS = 10000

def normalize(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        raise ValueError("empty URL")
    if raw.startswith("/"):
        raw = BASE + raw
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme != "https" or parsed.hostname != HOST:
        raise ValueError(f"URL must use https://{HOST}: {raw}")
    return raw

def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: scripts/indexnow-submit.py URL [URL ...]", file=sys.stderr)
        return 2

    urls = []
    seen = set()
    for item in sys.argv[1:]:
        try:
            url = normalize(item)
        except ValueError as exc:
            print(exc, file=sys.stderr)
            return 2
        if url not in seen:
            seen.add(url)
            urls.append(url)

    if len(urls) > MAX_URLS:
        print(f"Refusing to submit more than {MAX_URLS} URLs in one request.", file=sys.stderr)
        return 2

    payload = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode("utf-8")

    request = urllib.request.Request(
        ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "SmartWebUtility-Deploy/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            code = response.getcode()
            print(f"IndexNow accepted {len(urls)} URL(s): HTTP {code}")
            return 0 if code in (200, 202) else 1
    except urllib.error.HTTPError as exc:
        print(f"IndexNow HTTP {exc.code}: {exc.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"IndexNow request failed: {exc.reason}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
