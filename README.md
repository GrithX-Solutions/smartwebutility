# Smart Web Utility

Performance-first static website for https://smartwebutility.com.

## Live tools
- `/dns-checker/` — A, AAAA, MX, TXT, CNAME, NS and CAA lookup.
- `/ssl-checker/` — inspect certificate validity, issuer, expiry and hostname coverage.
- `/http-status-checker/` — check status code, headers, resolved IP and timing.
- `/redirect-checker/` — follow redirect chains and final destination.
- `/json-formatter/` — format, validate and minify JSON in the browser.
- `/base64-encoder-decoder/` — encode and decode Base64 with UTF-8 and URL-safe support.
- `/unix-timestamp-converter/` — convert Unix epoch seconds or milliseconds to dates and back.
- `/uuid-generator/` — generate secure UUID v4 values individually or in bulk.
- `/hash-generator/` — generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes for text or files.
- `/jwt-decoder/` — decode JWT headers, payloads and standard claims locally in the browser.
- `/regex-tester/` — test JavaScript regular expressions, capture groups and replacements.
- `/url-encoder-decoder/` — encode and decode URLs and URL components.
- `/html-entity-encoder-decoder/` — encode HTML entities and decode them back to text.
- `/cron-expression-helper/` — explain common 5-field cron expressions and presets.
- `/meta-tag-generator/` — generate essential SEO meta tags with a preview.
- `/robots-txt-generator/` — create common robots.txt directives and sitemap references.
- `/schema-markup-generator/` — generate basic JSON-LD Schema.org markup.
- `/open-graph-preview/` — generate Open Graph tags and preview social metadata.
- `/sitemap-checker/` — validate XML sitemaps and sitemap indexes.
- `/meta-tag-checker/` — inspect title, description, canonical, robots and H1 metadata.
- `/open-graph-checker/` — inspect Open Graph metadata on public pages.
- `/http-header-checker/` — inspect HTTP response headers, status, IP and timing.
- `/dns-propagation-checker/` — compare DNS answers across independent resolvers.

## Run locally
```bash
python3 -m http.server 8080 --directory .
```

Open `http://localhost:8080/`.

## Deploy
Works on Cloudflare Pages, Netlify, nginx, Apache, or any static host for frontend pages. Network tools under `/api/*.php` require PHP hosting.

## Recommended launch settings
- Force HTTPS and redirect `www` to the chosen canonical host (currently non-www).
- Enable Brotli, HTTP/2 and HTTP/3 when the host supports them.
- Keep JS deferred and avoid third-party scripts in the critical path.
- Add Search Console and privacy-respecting analytics after deployment.

## PHP requirements
- PHP 8.1+
- `curl`
- `openssl`
- `dns_get_record` enabled
- outbound web/TLS connections permitted by the host

The PHP API validates targets and redirect hops and rejects private/reserved IP ranges to reduce SSRF risk.
