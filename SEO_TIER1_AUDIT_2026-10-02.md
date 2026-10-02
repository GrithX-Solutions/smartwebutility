# Smart Web Utility — Tier-1 SEO Audit & Growth Map

Updated: 2026-10-02
Primary markets: United States first; United Kingdom, Canada and Australia second.
Goal: grow qualified organic traffic without thin pages, keyword stuffing or duplicate-intent URLs.

## Technical baseline

Latest Ubersuggest crawl after the 88-page release:
- Overall site health: **100/100**
- Crawled/successful: **88 / 88**
- Broken: **0**
- Redirected: **0**
- Errors: **0**
- Warnings: **0**
- Recommendations: **0**

Static repository scan across all 88 HTML pages:
- Missing titles/descriptions/canonicals: 0
- H1 count errors: 0
- Duplicate titles/descriptions: 0
- Pages below 250 visible words: 0
- Pages with fewer than 8 internal links: 0

All current functional pages are covered by browser smoke tests, and the sitemap receives a full initialization-error sweep.

## Performance baseline

| Device | FCP | LCP | CLS | TBT | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 1.0 s | 1.4 s | 0.000 | 2.8 s | 3.3 s |
| Mobile | 3.7 s | 6.7 s | 0 | 35 ms | 5.8 s |

Ubersuggest PageSpeed reports mobile unused JavaScript of about 223 KB with about 1.5 s estimated savings, plus about 630 ms redirect overhead. The homepage is the only current HTML page loading the AdSense library. This audit lowers its fetch priority while preserving async monetization code.

## Authority baseline

Ubersuggest:
- Domain Authority: **2**
- Backlinks: **8**
- Referring domains: **8**

Comparable utility domains show that low DA alone is not the whole story:
- utilitycove.com: DA 6, 127 referring domains
- devina.io: DA 18, 356 referring domains
- it-tools.tech: DA 1 but a very large historical referring-domain footprint

Technical SEO is no longer the main constraint. Discovery is beginning, but Smart Web Utility still needs topical history and legitimate referring domains.

## Google Search Console — first-party evidence

Cached Search Console data for 2026-09-01 through 2026-10-02. Hourly refresh is unavailable on the connected Windsor trial plan.

### Pages already showing promising positions

| URL | Impressions | Clicks | Avg. position | Action |
| --- | ---: | ---: | ---: | --- |
| / | 7 | 4 | 7.14 | Preserve homepage global DNS intent |
| /website-tools/ | 2 | 1 | 3.5 | Preserve category relevance |
| /guides/too-many-redirects-loop/ | 2 | 0 | 3.5 | Do not over-edit |
| /json-formatter/ | 1 | 0 | 7 | Preserve exact intent |
| /guides/ssl-certificate-still-old-after-renewal/ | 3 | 0 | 8.33 | Support from SSL tool |
| /http-status-checker/ | 2 | 0 | 8.5 | Support from HTTP cluster |
| /guides/mobile-vs-desktop-lighthouse-speed/ | 2 | 0 | 9.5 | Support from speed tool |
| /canonical-tag-checker/ | 1 | 0 | 10 | Near-miss; preserve alignment |
| /dnssec-checker/ | 7 | 0 | 10.29 | Priority near-miss |
| /guides/ssl-certificate-hostname-mismatch/ | 4 | 0 | 24.25 | Strengthen supporting links |
| /website-speed-test/ | 1 | 0 | 34 | Keep Lighthouse intent explicit |
| /meta-tag-checker/ | 2 | 0 | 45 | Build topical support |
| /schema-markup-generator/ | 6 | 0 | 64.83 | Long-term authority target |
| /redirect-checker/ | 2 | 0 | 84.5 | Recently upgraded; allow recrawl |
| /ssl-checker/ | 4 | 0 | 88.5 | Target lower-difficulty variants |

Exact queries already surfacing include dnssec checker (~10.17), dnssec validator (11), canonical tag checker (10), website speed test lighthouse (34), x robots tag checker (80), 301 redirect checker (84.5), schema org generator variants (~58–76), and ssl certificate issuer (88.5).

Country evidence includes **20 US impressions**, plus early impressions from Australia, Canada, Germany and other countries. The sample is still small and should guide priorities without being over-interpreted.

## Validated US keyword opportunities mapped to existing URLs

Only metrics returned by Ubersuggest are recorded.

| Existing URL | Keyword | US volume | SD | CPC | Decision |
| --- | --- | ---: | ---: | ---: | --- |
| /uuid-generator/ | uuid generator | 22,200 | 28 | $0.80 | Existing page; recent upgrade |
| /uuid-generator/ | guid generator | 9,900 | 23 | — | Same page; avoid duplicate |
| /redirect-checker/ | website redirect checker | 3,600 | 15 | $4.36 | Existing page; recent upgrade |
| /yaml-formatter/ | yaml formatter | 2,400 | 18 | $21.91 | Existing page |
| /chmod-calculator/ | chmod calculator | 1,900 | 27 | $10.41 | Live tool |
| /mac-address-generator/ | mac address generator | 1,900 | 29 | $0 | Existing page; recent upgrade |
| /uuid-generator/ | guid generator online | 1,600 | 21 | — | Same page |
| /uuid-generator/ | uuid generator online | 1,300 | 23 | — | Same page |
| /mac-address-generator/ | generate mac address | 1,000 | 25 | $0 | Same page |
| /ssl-checker/ | web ssl checker | 880 | 14 | $6.72 | Existing page; aligned in this audit |
| /regex-escaper/ | regex escaper | 720 | 18 | $0 | Existing page |
| /word-counter/ | online word counter free | 720 | 13 | $0.49 | Existing page; aligned in this audit |
| /meta-tag-checker/ | meta tag checker | 590 | 39 | $9.90 | Existing page |
| /ssl-checker/ | online ssl checker | 590 | 20 | $6.05 | Same page |
| /xml-to-csv/ | change xml to csv | 480 | 7 | — | Existing page |
| /toml-formatter-validator/ | toml formatter | 480 | 23 | — | Existing combined page |
| /word-counter/ | letter and word counter | 320 | 7 | $0.34 | Same page |
| /uuid-validator/ | uuid validator | 320 | 15 | — | Existing page |
| /json-diff/ | json diff tools | 260 | 13 | — | Existing page |
| /ulid-generator/ | ulid generator | 210 | 17 | — | Existing page |
| /random-port-generator/ | random port generator | 170 | 11 | — | Existing page |
| /dnssec-checker/ | dnssec checker | 590 | 50 | $12.09 | GSC near-miss; same page |
| /dnssec-checker/ | dnssec validator | 140 | 51 | $16.36 | GSC position ~11; same page |
| /canonical-tag-checker/ | canonical tag checker | 70 | 26 | $11.13 | GSC position 10 |
| /website-speed-test/ | website speed test lighthouse | 10 | 5 | $0 | Exact GSC impression |
| /meta-tag-checker/ | x robots tag checker | 10 | 7 | $0 | Existing functionality |
| /case-converter/ | title case converter | 8,100 | 25 | $0.18 | Existing functionality; aligned |
| /case-converter/ | lower case converter | 27,100 | 33 | $0.01 | Existing functionality; aligned |

Harder head terms remain useful but are not relied on for initial cash-flow:
- xml formatter — 27,100 / SD 41
- ssl checker — 9,900 / SD 64
- schema markup generator — 1,000 / SD 63

## Semantic intent ownership — avoid cannibalization

### Global DNS
- Homepage owns live multi-country/worldwide DNS propagation sampling.
- /dns-propagation-checker/ owns named-resolver comparison.
- /dns-checker/ owns focused DNS record lookup.
- /dnssec-checker/ owns DNSSEC checker + validator, DS and DNSKEY validation.

### Identifier & DevOps
- /uuid-generator/ owns UUID generator + GUID generator variants.
- /uuid-validator/ owns UUID validator + GUID validator.
- /ulid-generator/ owns ULID generation.
- /chmod-calculator/ owns chmod / Unix permissions calculation.
- /mac-address-generator/ owns random/test MAC generation.
- /random-port-generator/ owns random TCP/UDP ports.

### Structured data / formatters
- /json-formatter/ owns JSON format / validate / minify.
- /xml-formatter-validator/ owns XML format + validate.
- /yaml-formatter/ owns YAML formatting/validation supported by the tool.
- /toml-formatter-validator/ owns TOML formatter + validator.
- Directional converters remain on their existing directional URLs.

### Website diagnostics
- /redirect-checker/ owns one-URL redirect chains.
- /bulk-redirect-checker/ owns multi-URL redirect checks.
- /http-status-checker/ owns HTTP status.
- /http-header-checker/ owns response headers.
- /cache-control-checker/ owns cache policy.
- /security-headers-checker/ owns browser-facing security headers.
- /ssl-checker/ owns online website/domain certificate diagnostics.
- /website-speed-test/ owns Lighthouse mobile/desktop testing.

### SEO
- /meta-tag-checker/ owns title/description/canonical/meta robots/X-Robots inspection.
- /canonical-tag-checker/ owns canonical diagnostics.
- /robots-txt-tester/ owns crawler-rule testing.
- /robots-txt-generator/ owns robots generation.
- /schema-markup-generator/ owns JSON-LD/schema generation.
- /seo-tools/ owns broad free technical SEO audit intent.

### Text
- /word-counter/ owns free online word counting plus combined letter/character totals.
- /character-counter/ owns exact character-count workflows.
- /case-converter/ owns uppercase/lowercase/title/sentence/code casing.
- /slug-generator/ owns URL slug generation.

## Held / mismatched intents

Do not force these into existing pages:
- reverse dns checker — **6,600 US/mo, SD 16**
- ip to dns checker — **880 US/mo, SD 6**

These are materially different network lookup tasks and stay held for the next keyword-first new-tool review after this audit sprint.

PDF/Excel/Google Docs/social-platform queries are also not added to Word/Character Counter pages unless the product actually supports those workflows.

## Content plan from current evidence

Immediate order:
1. DNSSEC Checker & Validator — align exact validator wording and internal anchors.
2. Canonical Tag Checker — preserve exact match and support from SEO hub/audit tool.
3. Redirect-loop, SSL-renewal and Lighthouse guides — preserve ranking pages and add only natural support.
4. JSON Formatter + HTTP Status Checker — avoid disruptive rewrites while they already show page-one signals.
5. Website Speed Test — keep Lighthouse terminology explicit.
6. Meta Tag Checker — strengthen X-Robots coverage through existing functionality.
7. Continue strengthening existing validated utility pages before opening unrelated clusters.

Supporting guides should be published or expanded only when they solve a concrete problem, link naturally to a working tool, and are supported by Search Console or attainable live SERP evidence.

## Cross-market Tier-1 validation

Selected existing-page targets were checked separately in UK, Canada and Australia rather than assuming US metrics transfer unchanged.

| Keyword | UK volume / SD | Canada volume / SD | Australia volume / SD | Read |
| --- | ---: | ---: | ---: | --- |
| uuid generator | 5,400 / 26 | 3,600 / 37 | 1,900 / 27 | Strong global English demand; same canonical page |
| website redirect checker | 1,300 / 14 | 720 / 71 | 480 / 59 | Excellent UK quick-win; materially harder in CA/AU |
| chmod calculator | 590 / 23 | 260 / 27 | 210 / 13 | Attainable DevOps utility across all three |
| yaml formatter | 590 / 17 | 390 / 14 | 260 / 32 | Strong UK/Canada fit; harder in Australia |
| title case converter | 880 / 32 | 1,000 / 34 | 390 / 25 | Meaningful cross-market text-tool demand |
| online word counter free | 210 / 15 | 260 / 17 | 320 / 14 | Low-difficulty support intent in all three |

Decision:
- Keep one English canonical URL per intent across US/UK/Canada/Australia.
- Do not create country doorway pages.
- Measure rankings and Search Console country performance independently because difficulty varies substantially by market.
- UK appears especially attractive for Redirect Checker and YAML Formatter; Australia for chmod and free word-counter intent; Canada for YAML/word-counter before harder redirect terms.

## Tier-1 growth rules

1. United States is the primary keyword-research and rank-tracking market.
2. UK, Canada and Australia use the same English canonical pages initially.
3. Do not create country doorway pages.
4. Use standards-based, globally understandable English.
5. Earn relevant references from developer, hosting, sysadmin, web-performance, SEO and education/resource sites.
6. With only 8 referring domains, authority acquisition is a real bottleneck.

## Indexing and discovery

- Keep every public page indexable with one H1 and a self-canonical.
- Keep sitemap.xml complete and parseable.
- Keep robots.txt open to public crawling and declare the sitemap.
- Submit materially changed priority URLs through IndexNow after releases.
- Use Google Search Console as the first-party feedback loop for impressions, pages, queries, CTR and position.
- A 100/100 external crawl is not proof of Google indexing.
- Strengthen pages entering positions ~8–30 before opening unrelated clusters.

## Release guards strengthened in this audit

- Static QA rejects duplicate titles.
- Static QA rejects duplicate meta descriptions.
- Static QA rejects literal backslash-n corruption in sitemap.xml.
- Browser tests verify active category navigation for recently added Developer, Website and SEO tools.
- Existing sitemap-wide browser initialization sweep remains required.

## Gate before the next new tool

Do not start a new tool until this audit branch passes Build + Chromium CI, production deploy passes SEO/API smoke checks, changed priority URLs are submitted for discovery, and the post-deploy Ubersuggest crawl is clean.

After that, resume keyword-first discovery. Reverse DNS is a held candidate, not an approved build yet.
