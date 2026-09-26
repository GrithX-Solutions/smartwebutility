# Smart Web Utility — International SEO Rollout

Last reviewed: 2026-09-27

## Scope

Target languages:
- English (source): en
- German: de
- Spanish: es
- French: fr
- Dutch: nl
- Arabic: ar

Public URL model when a locale is launched:
- English: https://smartwebutility.com/
- German: https://smartwebutility.com/de/
- Spanish: https://smartwebutility.com/es/
- French: https://smartwebutility.com/fr/
- Dutch: https://smartwebutility.com/nl/
- Arabic: https://smartwebutility.com/ar/

Phase 1 uses language-level URLs and generic hreflang codes. Do not split into region variants such as ar-SA, ar-AE, de-DE or es-ES unless later data proves the extra maintenance is justified.

## SEO architecture rules

1. Every localized page gets a distinct crawlable URL.
2. Every localized page uses a self-referencing canonical.
3. Hreflang clusters must be reciprocal and include the English source.
4. Use en, de, es, fr, nl and ar in phase 1.
5. Use x-default pointing to the English source until a true language-selector page exists.
6. Never auto-redirect users or crawlers by IP or browser language.
7. A visible language switcher may suggest a language, but the user chooses.
8. Main content, tool labels, result labels, FAQs, metadata and contextual links must be localized—not only the template.
9. Do not clone all current pages at once. Each locale launches as a controlled pilot.
10. Native search intent and terminology decide titles/H1s/slugs; literal translation does not.

Google supports HTML, HTTP-header or sitemap hreflang. Smart Web Utility will use HTML hreflang as the primary implementation and separate locale sitemaps for operational monitoring.

## Arabic-specific requirements

Arabic is first-class, not a cosmetic translation.

Required:
- html lang="ar" dir="rtl"
- full desktop/mobile RTL QA
- use logical CSS properties where practical
- domain/URL/IP/code inputs remain visually LTR where needed
- DNS names, URLs, IPs, HTTP headers, JWTs and code snippets use direction isolation
- technical identifiers remain exact
- retain common Latin protocol acronyms such as DNS, SSL/TLS, HTTP, JWT and JSON when that is natural for Arabic technical users
- Arabic metadata must be native copy, not transliterated English

Phase-1 Arabic uses /ar/ and hreflang="ar". Country variants are deferred.

## Pilot page set

Each locale pilot should contain 8–12 genuinely localized pages selected from:
1. locale homepage / diagnostic landing page
2. DNS Checker
3. DNS Propagation Checker
4. SSL Checker
5. Redirect Checker
6. HTTP Status Checker
7. Methodology / editorial standards
8. About / trust page
9. DNS changed but website still points to old IP
10. DNS propagation / resolver-cache disagreement
11. renewed SSL but old certificate is still served
12. SSL certificate hostname mismatch
13. ERR_TOO_MANY_REDIRECTS / redirect loop

Exact localized slugs are not locked until native keyword and SERP research is complete.

## Keyword research protocol

For each candidate page:
1. Find native terminology in current SERPs and autocomplete.
2. Compare synonymous formulations rather than assuming literal English translation.
3. Pull live volume/CPC/SEO difficulty when provider quota is available.
4. Inspect top-ranking page type, authority and freshness.
5. Confirm the query intent matches the actual Smart Web Utility implementation.
6. Record final native title, H1, slug and semantic terms.
7. Check cannibalization against the locale homepage and sibling tools.

No numeric keyword metric is stored unless retrieved from a live provider.

## Current qualitative SERP evidence

Arabic:
- current Arabic SERPs contain dedicated pages around فحص شهادة SSL, فاحص شهادات SSL and فحص DNS.
- Arabic domain-monitoring products combine DNS, SSL, HTTP and SEO concepts, confirming a real native technical vocabulary.

German:
- current native pages use phrases such as DNS prüfen, SSL Zertifikat prüfen and Domain Check.

Spanish:
- current native tool pages use comprobar/comprobación/análisis with DNS, SSL and website diagnostics.

French:
- current native tools use vérifier, recherche DNS, certificat SSL, en-têtes HTTP and analyse.

Dutch:
- current native tools use controleren, DNS, SSL-certificaat and domein.

These are qualitative SERP observations, not search-volume claims.

## Rollout gate

Do not choose the first full public locale solely by intuition. Compare:
- verified native search demand
- CPC/commercial signal
- SERP difficulty and niche competitors
- fit with our strongest DNS/SSL/HTTP tools
- native editorial QA burden
- monetization geography
- ability to publish genuinely native support content

If keyword metrics remain unavailable, use a 3-page test before expanding to the full locale pilot.

## Localized navigation

Language switcher labels:
- English
- Deutsch
- Español
- Français
- Nederlands
- العربية

Only link to locale equivalents that actually exist. No dead language links and no forced redirect.

## Hreflang rule

For a published cluster, every page lists itself, every other published language version, and x-default. Do not include an unpublished locale.

## Sitemap plan

When the first locale launches:
- /sitemap.xml becomes a sitemap index
- /sitemap-en.xml
- /sitemap-de.xml when German exists
- /sitemap-es.xml when Spanish exists
- /sitemap-fr.xml when French exists
- /sitemap-nl.xml when Dutch exists
- /sitemap-ar.xml when Arabic exists

Do not submit empty locale sitemaps.

## Measurement

Google Search Console:
- index status by locale path
- page/query/country/device
- localized query vocabulary
- CTR/title alignment
- generative AI reporting when available

Bing Webmaster Tools:
- search visibility
- IndexNow status
- AI Performance / cited pages where available

GA4:
- landing path by locale
- country/device at aggregate level
- tool-start/tool-complete events when implemented

## Publishing safeguards

- no bulk machine-translated 230-page launch
- no untranslated English body with localized title/nav
- no doorway country pages
- no forced language redirects
- no cross-language canonical to English
- no fake native keyword metrics
- no localized claim that exceeds actual tool capability

## Current execution state

Completed:
- six-language architecture defined
- Arabic added with explicit RTL requirements
- language-subdirectory model selected
- generic hreflang codes selected
- pilot scope defined
- validation scaffold added

Pending before public rollout:
- live keyword metrics for each locale (Ubersuggest daily report quota is currently exhausted)
- native slug/title/H1 decisions
- first-locale selection
- native editorial QA
- AdSense review resolution or explicit decision to launch during review
