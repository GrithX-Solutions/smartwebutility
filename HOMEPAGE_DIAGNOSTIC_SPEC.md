# Smart Web Utility — Homepage Diagnostic Console SEO Specification

Last reviewed: 2026-09-26

## Decision

Do not turn the homepage into a literal collection of every full tool. Reposition the hero as a domain-first diagnostic console while preserving dedicated tool URLs for their own search intent.

Working product concept:

Enter one public domain or URL once, then expose an overview across DNS, SSL/TLS, HTTP, Performance and Technical SEO. Each summary section links to the specialist tool that owns the deeper workflow.

Do not deploy this redesign while the current AdSense site review is in progress. Research/specification can continue; production changes should wait for a deliberate release.

## Why this architecture

Current SERPs show two strong patterns:

1. Global DNS checker pages are highly focused. Their primary page intent is DNS propagation/lookup, with record selectors, global locations and resolver detail immediately available.
2. Website analyzer/health-check pages use one URL input to produce a multi-category overview covering combinations of SEO, HTTP, SSL, security and performance.

Therefore Smart Web Utility should combine the PRODUCT experience at the homepage without collapsing all SEARCH intents into one URL.

Homepage role: website/domain diagnostic entry point and site-level entity hub.
Dedicated URLs: rank for specific transactional/tool intents such as DNS checker, SSL checker, redirect checker, HTTP status checker and meta tag checker.

## Homepage search-intent rule

Do not lock the final H1 or title until live keyword metrics are available. Candidate concepts include website checker, website analyzer, website health checker and website diagnostic tools, but these are not approved target keywords yet.

Ubersuggest daily report quota was exhausted on the research date. No volume, CPC or SEO difficulty figures should be invented.

Until metrics are available, the working hero copy should be descriptive rather than over-optimized:

Working H1: Check Any Website — DNS, SSL, HTTP, Speed & SEO
Working supporting line: Run a fast technical overview, then open the specialist checker for deeper diagnostics.

## Proposed above-the-fold experience

Replace the current oversized generic hero/search emphasis with:

- Clear diagnostic H1.
- One domain/URL input.
- Primary CTA: Analyze Website.
- Lightweight category switcher: Overview | DNS | SSL | HTTP | Performance | SEO.
- Short trust line: free, no signup, public-site checks only.

Do not run expensive network/performance checks before the user submits a domain. Initial homepage load must stay lightweight.

## Overview module

After submit, return a progressive summary rather than one arbitrary score.

Recommended summary language:
- DNS: passed / needs attention / could not verify
- SSL: passed / needs attention / could not verify
- HTTP: passed / needs attention / could not verify
- Technical SEO: X checks passed, Y need attention
- Performance: show measured metrics, not a vague proprietary grade

Avoid a universal SEO score unless a transparent scoring methodology is later designed and documented.

## DNS module

Current-record checks:
- A
- AAAA
- CNAME
- MX
- TXT
- NS
- CAA
- SOA where supported
- TTL
- authoritative nameservers

Existing Smart Web Utility DNS Checker currently supports A, AAAA, MX, TXT, CNAME, NS and CAA using Cloudflare DNS-over-HTTPS.

Global propagation experience:
- Do not label ordinary public-resolver queries as genuine country measurements.
- A country/map view requires real geographic probes or resolver vantage points.
- Candidate infrastructure: Globalping or RIPE Atlas, subject to API limits, terms, cost and reliability review.
- Always disclose number of tested locations and that no finite sample represents every resolver worldwide.

## DNS history

Live DNS cannot reconstruct historical records.

Only add 'DNS History' when a real passive-DNS/historical provider is integrated. Candidate providers can include commercial passive-DNS datasets, subject to licensing and pricing review.

Never infer or fabricate historical IP, MX or NS records.

## SSL/TLS module

Use the existing SSL endpoint as the base:
- validity
- issuer
- subject
- SANs
- valid from/to
- days remaining
- resolved IP
- signature type
- TLS connect timing

Summary should link to:
- /ssl-checker/
- /guides/ssl-certificate-still-old-after-renewal/
- /guides/ssl-certificate-hostname-mismatch/

Do not market this as a complete cipher/protocol security audit unless that functionality is actually built.

## HTTP module

Combine existing read-only diagnostics:
- first HTTP status
- final URL
- response time
- resolved IP
- content type
- server header when present
- redirect location
- redirect chain via Redirect Checker
- response headers via HTTP Header Checker

Deep links:
- /http-status-checker/
- /redirect-checker/
- /http-header-checker/

## Performance module

Run only on demand after domain submission.

Separate:
- lab performance metrics
- field/real-user metrics when available

Do not call Lighthouse/PageSpeed lab values 'field Core Web Vitals'.

Candidate visible fields:
- LCP
- CLS
- FCP
- TBT for lab diagnostics
- INP only when real field data is actually available
- top performance opportunities

Third-party scripts such as analytics and AdSense can materially affect mobile lab performance, so the homepage diagnostic UI itself must lazy-load heavy modules.

## Technical SEO module

Reuse existing Smart Web Utility functionality where technically valid:
- HTTP status
- title
- meta description
- canonical
- HTML robots meta
- H1 count
- Open Graph
- sitemap presence/validation
- robots.txt generation/checking where implemented
- structured-data presence or generation workflow
- redirects
- HTTPS/SSL
- selected response headers

Important limitations:
- current Meta Tag Checker reads returned HTML and does not render JavaScript
- it does not inspect X-Robots-Tag
- Sitemap Checker validates XML/root type but does not crawl every listed URL or recursively audit every child sitemap

Homepage must reflect these limitations rather than presenting a misleading 'complete SEO audit'.

## Dedicated-page SEO preservation

Homepage should NOT absorb the entire content of specialist pages.

Keep these indexable and internally prominent:
- /dns-checker/
- /dns-propagation-checker/
- /ssl-checker/
- /http-status-checker/
- /http-header-checker/
- /redirect-checker/
- /meta-tag-checker/
- /sitemap-checker/
- /open-graph-checker/
- /schema-markup-generator/

Homepage summary cards should use contextual anchors such as:
- Check DNS records
- Compare DNS propagation
- Inspect SSL certificate
- Trace redirect chain
- Inspect HTTP headers
- Check meta tags

## Developer utilities

JSON, Base64, UUID, hash, JWT, regex, encoders and text utilities remain valuable but should move below the primary domain-diagnostic experience.

They should stay accessible through:
- category navigation
- homepage secondary tool grid
- internal search
- dedicated category pages

This keeps the homepage entity/theme coherent while preserving developer-tool discoverability.

## Suggested page order

1. Domain diagnostic hero.
2. Progressive diagnostic result area (hidden until submit).
3. Popular specialist website tools.
4. Global DNS / DNS troubleshooting feature area.
5. Website troubleshooting guides.
6. Developer utilities.
7. SEO/content utilities.
8. Trust/privacy explanation.

## Performance safeguards

- Initial homepage must not auto-run DNS, HTTP, SSL or performance APIs.
- Lazy-load maps and any large visualization only after the relevant tab is opened.
- Performance audit should require an explicit user action or run after primary lightweight checks.
- Reserve result-card height carefully to reduce layout shift.
- Avoid loading unnecessary third-party visualization libraries.
- Keep tool forms accessible by keyboard and screen reader.

## Security safeguards

- Public hosts only.
- Continue blocking private/internal IP targets in server-side network tools.
- Standard ports only unless a tool explicitly supports and validates another port.
- Rate-limit expensive diagnostics.
- Bound response-body sizes and timeouts.
- Never convert the analyzer into a general-purpose SSRF proxy.

## Global SEO measurement plan

After release:
- inspect homepage indexing and canonical in Search Console
- track homepage queries separately from dedicated tool queries
- watch for cannibalization between homepage and specialist URLs
- if homepage begins appearing for specific tool head terms, compare CTR/position against the dedicated URL before changing titles
- use country-level Search Console data to identify US, UK, Canada, Australia and other valuable English-language demand without creating thin country doorway pages
- expand modules/content only where impressions and real usage support the decision

## Release gate

Do not implement the production redesign until:

1. Current AdSense review status is resolved or a deliberate decision is made to accept a major homepage change during review.
2. Final homepage primary keyword/title is validated with live metrics when quota is available.
3. Existing diagnostic APIs have been mapped into a single safe orchestration flow.
4. Any real global DNS provider has been evaluated for quota, reliability and cost.
5. Mobile performance budget is defined.

## Current conclusion

Recommended direction: YES to a domain-first homepage diagnostic console.

Not recommended: putting the full UI/content of every tool on the homepage or trying to make the homepage rank for all tool keywords simultaneously.

The product should feel unified; the SEO architecture should remain intent-specific.
