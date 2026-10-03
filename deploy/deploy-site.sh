#!/usr/bin/env bash
# SmartWebUtility production deploy. Run as an authorized host operator,
# after verifying the GitHub Actions artifact digest and extracting it.
set -Eeuo pipefail

RELEASE="${1:?Usage: bash deploy/deploy-site.sh /srv/smartwebutility/releases/<verified-build>}"
BASE="/srv/smartwebutility"
CURRENT="$BASE/site.current"
PREVIOUS="$BASE/site.prev"

RELEASE="$(realpath "$RELEASE")"
case "$RELEASE" in "$BASE"/releases/*) ;; *) echo "Release must be inside $BASE/releases" >&2; exit 2;; esac
[[ -f "$RELEASE/scripts/seo-static-qa.py" && -f "$RELEASE/scripts/content-quality-qa.py" && -f "$RELEASE/api/seo-audit.php" ]] || {
  echo "Missing required release files" >&2; exit 2;
}

# Version shared front-end assets from their release content so CDN/browser caches
# cannot keep older global navigation/search UI after a successful deploy.
python3 "$RELEASE/scripts/version-shared-assets.py" "$RELEASE"

# Artifact ZIP extraction may create root-only (0700) directories. PHP-FPM
# executes as an unprivileged user and requires +x access to every directory.
find "$RELEASE" -type d -exec chmod 755 {} +
python3 "$RELEASE/scripts/seo-static-qa.py"
python3 "$RELEASE/scripts/content-quality-qa.py"

[[ -d "$CURRENT" ]] || { echo "Missing production root" >&2; exit 2; }
mkdir -p "$PREVIOUS"
# Keep an immediately usable rollback.
rsync -a --delete --chmod=D755,F644 "$CURRENT/" "$PREVIOUS/"

rollback() {
  echo "Deployment health check failed; restoring previous release." >&2
  rsync -a --delete --chmod=D755,F644 "$PREVIOUS/" "$CURRENT/"
}
trap rollback ERR
rsync -a --delete --chmod=D755,F644 "$RELEASE/" "$CURRENT/"

# Test as the PHP-FPM container's unprivileged www-data account, not root.
docker exec -u www-data smartwebutility_php php -r '
  foreach (["/srv/site/api/common.php", "/srv/site/api/seo-audit.php", "/srv/site/api/http-status.php"] as $file) {
    if (!is_readable($file)) { fwrite(STDERR, "Unreadable API file: $file\n"); exit(1); }
  }
'
# Missing URL intentionally returns a JSON error; HTTP 400 is expected.
# A 404 HTML/PHP-FPM "File not found" response must never pass this check.
python3 -c '
import json, urllib.request, urllib.error
for p in ("seo-audit.php", "http-status.php"):
    url = "https://smartwebutility.com/api/" + p
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; SmartWebUtilityDeployHealth/1.0; +https://smartwebutility.com/)",
            "Accept": "application/json",
        },
    )
    try:
        response = urllib.request.urlopen(request, timeout=20)
    except urllib.error.HTTPError as exc:
        response = exc
    with response:
        body = response.read()
        assert response.status == 400, (p, response.status, body[:100])
        assert "application/json" in response.headers.get("Content-Type", ""), (p, body[:100])
        data = json.loads(body)
        assert "error" in data, (p, data)
print("Production API routing and JSON smoke checks passed")
'
trap - ERR
echo "Release deployed; rollback preserved at $PREVIOUS"
