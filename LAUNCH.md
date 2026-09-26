# Smart Web Utility — Launch & Monetization Plan

## Product goal
Build a fast, useful English-first web utility site that attracts organic traffic globally and can monetize with Google AdSense without compromising usability.

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
- Avoid thin city/country doorway pages such as "JSON Formatter USA" or "JSON Formatter UK".
- Build category hubs around Developer, Website/Network, SEO and Text tools.
- Add original explanations, practical use cases, limitations and related tools before monetization.
- Keep titles and descriptions natural; do not keyword-stuff.
- Prioritize developer, hosting, security, SaaS, website and SEO workflows.

## Current readiness status — September 26, 2026

Completed in the repository:
- [x] 43 indexable HTML pages are represented by 43 sitemap URLs.
- [x] robots.txt allows crawling and points to sitemap.xml.
- [x] Canonical URLs, titles and meta descriptions are present across indexable pages.
- [x] About, Privacy, Terms and Contact pages exist and are linked site-wide.
- [x] contact@smartwebutility.com is published as the contact address.
- [x] Priority tool pages have useful explanatory content, limitations, related tools and FAQs.
- [x] Diagnostic API responses send X-Robots-Tag: noindex, nofollow.
- [x] Breadcrumb structured data is generated from the visible breadcrumb UI.
- [x] Homepage has WebSite and Organization identity markup.
- [x] 64x64 PNG favicon fallback is available alongside the SVG favicon.
- [x] Frontend asset caching no longer uses a one-year immutable policy on unversioned CSS/JS.
- [x] No AdSense script, ca-pub ID or ad unit is present before account details are known.
- [x] No placeholder ads.txt publisher ID is published.\n- [x] No ad units have been inserted; the AdSense script is currently present for site verification only.
- [x] Privacy Policy includes Google advertising-cookie and personalized-ad choice disclosures for future AdSense use.
- [x] Performance baseline is strong in the current PageSpeed audit (desktop and mobile).\n- [x] Google Analytics 4 measurement ID G-TKF8FWKQN6 is installed globally through the shared theme script.\n- [x] Analytics consent defaults are restricted for EEA/UK/Switzerland, while ad storage and ad personalization remain denied site-wide until a CMP/AdSense flow is enabled.

External/account actions still required:
- [x] Latest main branch deployment confirmed by the site owner.
- [x] Google Search Console ownership configured.
- [x] https://smartwebutility.com/sitemap.xml submitted in Google Search Console.
- [ ] Inspect the homepage and priority tool URLs in Search Console and request indexing where appropriate.
- [x] Bing Webmaster Tools configured and sitemap submitted.
- [ ] Confirm priority pages are indexed before the AdSense application.
- [x] smartwebutility.com added to the AdSense Sites list.
- [x] AdSense verification snippet for publisher ca-pub-5136695583106589 added to the homepage head.
- [x] Real publisher ID received: pub-5136695583106589; root ads.txt published with Google DIRECT seller declaration.
- [ ] Configure a Google-certified CMP for EEA/UK/Swiss traffic before serving personalized Google ads there.
- [ ] After site approval, add ad units conservatively and verify mobile accidental-click spacing.

## AdSense implementation rules
Before approval:
- Do not invent or guess a publisher ID.
- Do not publish placeholder AdSense code or a fake ads.txt seller line.
- Keep interactive tools and publisher content fully usable without ads.
- Keep traffic acquisition organic/direct/referral; do not purchase invalid or incentivized traffic.
- Do not click live ads or ask others to click them.

After approval:
- Add only the publisher ID and code supplied by the approved AdSense account.
- Keep publisher content visually dominant.
- Avoid ad placements immediately beside primary buttons, inputs, copy controls or tool results where accidental clicks are plausible.
- Reserve layout space for ads to reduce layout shift.
- Test light/dark mode, mobile widths and keyboard navigation after ad insertion.
- Monitor the AdSense Policy Center and site status.

## Technical launch checklist
- [ ] Production runtime provides PHP 8.1+ with cURL, OpenSSL and dns_get_record.
- [ ] HTTPS is forced.
- [ ] Canonical host is https://smartwebutility.com (non-www).
- [ ] www redirects to non-www.
- [ ] Outbound DNS, HTTPS and TLS requests work for diagnostic APIs.
- [ ] API rate limiter can write to the system temporary directory.
- [ ] Brotli/gzip and HTTP/2 or HTTP/3 are enabled where supported.
- [ ] Security headers are preserved in production.
- [x] Repository includes a custom 404 page.
- [x] robots.txt and sitemap.xml are present.
- [x] Form labeling/accessibility has been improved on priority pages.
- [x] Desktop/mobile PageSpeed baseline has been measured.

## Content quality phase
Priority content pages completed:
1. [x] SSL Checker
2. [x] DNS Checker / DNS Propagation Checker
3. [x] HTTP Header Checker / HTTP Status Checker
4. [x] Redirect Checker
5. [x] JSON Formatter
6. [x] JWT Decoder
7. [x] Hash Generator
8. [x] Meta Tag Checker / Generator
9. [x] Schema Markup Generator
10. [x] Sitemap Checker

Next content targets should be selected by real demand and quality gap rather than by adding near-duplicate pages.

## Post-launch expansion
Only after indexing, policy readiness and quality are stable:
- QR Code Generator
- IP tools where privacy/safety design is clear
- additional encoding/conversion utilities
- carefully selected calculators with global search demand

Avoid adding dozens of near-duplicate pages simply to increase URL count.
