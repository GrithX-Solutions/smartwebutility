# Smart Web Utility — Tool Growth Roadmap

Updated: 2026-10-02

## Objective

Grow SmartWebUtility.com into a focused, AdSense-ready utility platform by shipping useful tools in topical batches. New SEO-led tools must pass a live keyword/SERP gate before implementation. Current priority is US English, then UK/Canada/Australia.

## Repository-first release policy

All planned tool batches, supporting content and SEO QA are developed and reviewed in GitHub first. Production deployment is intentionally held until the planned repository work is complete and a final one-go release is explicitly approved. Pull-request CI may build test artifacts, but those artifacts must not be treated as production activation.

## Selection gate for SEO-led tools

Prefer:
- Search Difficulty (SD/KD) 0–9.
- At least ~1,000 monthly searches when possible; smaller terms are accepted only when they strengthen a proven topical cluster.
- Clear click intent: the user needs an interactive tool, not a one-line answer Google can satisfy directly.
- Evidence of weak SERPs: low-authority domains, thin/outdated tools, forums or poor UX in the top results.
- Browser-side implementation where practical for speed, privacy and low infrastructure cost.
- Enough unique page value for AdSense: working tool, examples, limitations, FAQs, related workflows and original explanatory content.

Avoid:
- Thin near-duplicate pages.
- YMYL calculators where incorrect output could materially harm users.
- Tools whose primary use is abusive, deceptive or policy-sensitive.
- Bulk publishing before search intent and SERP fit are validated.

## Existing live pillars

### Developer
JSON Formatter, Base64 Encoder/Decoder, Unix Timestamp Converter, UUID Generator, Hash Generator, JWT Decoder, Regex Tester, URL Encoder/Decoder, HTML Entity Encoder/Decoder, Cron Expression Helper, Password Generator, Random String Generator.

### Website & Network
DNS Checker, DNS Propagation Checker, SSL Checker, HTTP Status Checker, Website Speed Test, HTTP Header Checker, Cache-Control Checker, Security Headers Checker, Redirect Checker, Bulk Redirect Checker, Sitemap Checker, Meta Tag Checker, Open Graph Checker, Favicon Generator, DNSSEC Checker.

### SEO
SEO Audit hub, Meta Tag Generator, Robots.txt Generator, Robots.txt Tester, Schema Markup Generator, Canonical Tag Checker, Open Graph Preview, Slug Generator.

### Text
Word Counter, Character Counter, Case Converter, Lorem Ipsum Generator.

## Batch 1 — Structured data converters — SEO HARDENING IN REPO (NOT DEPLOYED)

Primary SEO targets already validated in live US data:
- XML to JSON — ~2,400 US/mo, KD 5.
- JSON to CSV — ~1,900 US/mo, KD 8.
- YAML to JSON — ~720 US/mo, KD 7.
- JSON to YAML — ~590 US/mo, KD 6.

Implementation:
- /xml-to-json/
- /json-to-csv/
- /yaml-to-json/
- /json-to-yaml/
- Shared browser-side conversion engine.
- Homepage + Developer hub + sitemap + nav + smoke-test integration.
- Batch 1 SEO hardening: explicit crawl directives, breadcrumb structured data, task-specific conversion steps/examples, richer use-case copy and reinforced converter-cluster internal links.

## Batch 2 — File/data conversion cluster — IN REPO, NOT DEPLOYED

Validated and implemented:
- TXT to CSV / CSV to TXT — one bidirectional page; primary US query ~1,900/mo, KD 6, with additional same-intent low-KD variants. Tier-1 secondary markets also remain low difficulty.
- XML to Excel / XLSX — primary US query ~1,000/mo, KD 9, with DA 9/11/14 specialist pages observed in prominent SERP positions.
- JSON to Excel / XLSX — primary US query ~1,000/mo, KD 7; UK KD 8, Canada/Australia KD 6, with DA 10 and DA 6 specialist competitors observed.

Evidence and rejected/held candidates are recorded in KEYWORD_RESEARCH_BATCH2.md.

Held or rejected for this batch despite apparently low keyword-difficulty scores:
- VCF to CSV — hold; valid US opportunity but weaker Tier-1 breadth.
- XLSX to CSV — hold; top 10 remains authority-heavy.
- CSV to Excel — reject for this batch; high volume but authority-heavy SERP.

Further data-format candidates must pass the same live research gate before code is added.

## Batch 3 — Developer encoding & debugging expansion

Candidate tools:
- URL Query String Parser
- JWT Expiry / Claims Inspector
- Base64 File Encoder
- Hex Encoder / Decoder
- Unicode Escape / Unescape
- HTML Minifier
- CSS Minifier
- JavaScript Minifier
- SQL Formatter
- Markdown Preview
- Markdown to HTML
- JSONPath Tester
- Regex Escaper
- UUID Validator
- ULID Generator
- Random Port Generator
- IP to Integer Converter

## Batch 4 — Date, time & DevOps utilities

Candidate tools:
- Date Difference Calculator
- Add/Subtract Days
- Business Days Calculator
- Time Duration Calculator
- Hours & Minutes Calculator
- Timezone Converter
- ISO 8601 Converter
- Epoch Milliseconds Converter
- Cron Generator / Validator
- CIDR / Subnet Calculator
- chmod Calculator
- Docker Run to Compose helper
- Environment Variable / .env Formatter

## Batch 5 — Text transformation cluster

Candidate tools:
- Remove Duplicate Lines
- Remove Line Breaks
- Sort Lines
- Reverse Text
- Trim Whitespace
- Find & Replace
- Text Diff
- Duplicate Word Finder
- Sentence Counter
- Reading Time Calculator
- Text to List / List to Text
- Comma Separator
- Invisible Character utility (only if AdSense/search intent remains clean)
- Markdown Cleaner
- HTML to Plain Text

## Batch 6 — Website & network diagnostics expansion

Candidate tools:
- WHOIS / RDAP Lookup
- IP Lookup
- Reverse DNS Lookup
- Port Checker
- CORS Checker
- HSTS Checker
- CSP Analyzer
- TLS Version Checker
- Certificate Chain Viewer
- MX / SPF / DMARC Checker
- DKIM Record Checker
- HTTP Compression Checker
- CDN / Hosting Detector
- TTFB Checker
- Broken Link Checker

Server-side tools must use SSRF-safe target validation, strict timeouts and bounded response sizes.

## Batch 7 — SEO & indexing utilities

Candidate tools:
- SERP Snippet Preview
- Title & Meta Length Checker
- Hreflang Generator / Validator
- XML Sitemap Generator
- Sitemap URL Extractor
- Robots Meta Tag Generator
- Schema Validator / Inspector
- Internal Link Checker
- Canonical Map Checker
- Indexability Checker
- Heading Structure Checker
- Keyword Density / N-gram Analyzer
- Open Graph / Twitter Card Generator

Do not publish pseudo-AI scores that cannot be objectively measured. GEO/AIO features must show evidence or clearly label heuristics.

## Batch 8 — Image utilities

Only after keyword/SERP validation and performance testing:
- Image Compressor
- Image Resizer
- Crop Image
- JPG ↔ PNG ↔ WebP
- AVIF Converter
- Image Metadata Viewer / Stripper
- SVG Optimizer
- SVG to PNG
- Color Picker from Image
- Image Dimensions Checker

Prefer client-side Canvas/Web APIs to minimize hosting cost and protect uploads.

## Batch 9 — Calculators

Research gate is especially strict because many calculator SERPs are highly competitive or zero-click:
- Percentage Increase / Decrease
- Hours / Work Hours
- Aspect Ratio
- Ratio
- Average / Mean
- Unit conversions with click-worthy UI
- Screen / resolution calculators
- Developer-specific calculators where SERPs are weaker

Avoid medical, tax, loan, legal and other high-stakes calculators unless a separate quality/compliance decision is made.

## Batch 10 — Growth from Search Console evidence

After the first batches index:
- Export queries/pages with impressions but low positions.
- Build tools/supporting content only around demonstrated demand.
- Strengthen pages already entering positions 8–30 before opening unrelated categories.
- Use internal links from strong hubs and related tools.
- Refresh titles/content when CTR or intent mismatch is visible.
- Expand internationally only after the English canonical architecture is stable.

## Release checklist for every batch

1. Keyword/SERP validation recorded.
2. Functional tool works with valid and invalid inputs.
3. Browser-side privacy claim matches implementation.
4. Mobile layout checked.
5. Unique title, description, H1 and canonical.
6. WebApplication structured data where appropriate.
7. Breadcrumbs and related-tool links.
8. Original explanatory content, limitations and FAQs.
9. Category hub + homepage catalog updated when appropriate.
10. sitemap.xml updated.
11. Navigation active-state mapping updated.
12. Browser smoke tests updated.
13. No JavaScript initialization errors across sitemap sweep.
14. After the final repository-wide release gate is approved, deploy once; then submit priority URLs through the indexing workflow.
15. Measure impressions, clicks and indexing before the next major expansion.
