# Smart Web Utility — Launch & Monetization Plan

## Product goal
Build a fast, useful English-first web utility site that can attract organic traffic globally and later monetize with Google AdSense without compromising usability.

## Priority audiences
Primary acquisition focus:
- United States
- United Kingdom
- Canada
- Australia
- English-speaking and high-value European traffic

Pakistan remains an important audience, but the site should use globally understood English terminology, examples, units and technical vocabulary unless a tool is intentionally local.

## Search strategy
- Target task-based intent: "JSON formatter", "SSL checker", "HTTP header checker", "meta tag generator", etc.
- Prefer one strong page per real tool/use case.
- Avoid thin city/country doorway pages such as "JSON Formatter USA", "JSON Formatter UK", etc.
- Build category hubs around Developer, Website/Network, SEO and Text tools.
- Add original explanations, practical use cases, limitations and related tools to pages before monetization.
- Keep titles and descriptions natural; do not keyword-stuff.
- Prioritize developer, hosting, security, SaaS, website and SEO workflows.

## AdSense readiness
Before applying:
- Site is fully deployed over HTTPS.
- No unfinished/placeholder pages remain.
- Privacy, Terms, About and Contact are accessible site-wide.
- contact@smartwebutility.com mailbox is active.
- Google Search Console and Bing Webmaster Tools are configured.
- sitemap.xml is submitted and important pages are indexed.
- Core tool pages have useful explanatory content, not only the interactive widget.
- Traffic sources are organic/direct/referral and monitored for invalid activity.
- No ads are placed close enough to buttons, inputs or results to encourage accidental clicks.
- Do not click live ads or ask others to click them.

After AdSense account/site approval:
- Add the exact Google publisher ID.
- Publish a correct /ads.txt using the publisher ID supplied by AdSense.
- Configure a Google-certified CMP for required EEA/UK/Swiss consent flows before personalized ads.
- Add ad units conservatively and keep publisher content visually dominant.
- Test mobile layouts for accidental-click risk.

## Technical launch checklist
- PHP 8.1+ with cURL, OpenSSL and dns_get_record.
- Force HTTPS.
- Canonical host: https://smartwebutility.com (non-www).
- Redirect www to non-www.
- Confirm outbound DNS, HTTPS and TLS requests work for diagnostic APIs.
- Confirm API rate limiter can write to the system temporary directory.
- Enable Brotli/gzip and HTTP/2 or HTTP/3 where supported.
- Preserve security headers.
- Run Lighthouse mobile checks.
- Test keyboard navigation and form labels.
- Test 404 handling.
- Verify robots.txt and sitemap.xml in production.

## Content quality phase
Before AdSense application, expand the most commercially relevant tool pages first:
1. SSL Checker
2. DNS Checker / DNS Propagation Checker
3. HTTP Header Checker / HTTP Status Checker
4. Redirect Checker
5. JSON Formatter
6. JWT Decoder
7. Hash Generator
8. Meta Tag Checker / Generator
9. Schema Markup Generator
10. Sitemap Checker

Each priority page should have:
- what the tool does
- common use cases
- interpretation of results
- limitations
- related tools
- concise FAQ where genuinely useful

## Post-launch expansion
Only after architecture and quality are stable:
- QR Code Generator
- IP tools where privacy/safety design is clear
- additional encoding/conversion utilities
- carefully selected calculators with global search demand

Avoid adding dozens of near-duplicate pages simply to increase URL count.
