# Arabic Pilot — SERP & Localization Research

Last reviewed: 2026-09-27

Status: PRIVATE RESEARCH. Not approved for public rollout yet.

## Why Arabic is included

Current Arabic SERPs contain genuinely Arabic technical tools and diagnostic products rather than only English pages shown to Arabic users. Visible terminology includes:
- فحص الموقع
- فحص DNS
- فحص سجلات DNS
- فحص شهادة SSL
- فاحص شهادات SSL
- فاحص التحويلات
- فحص حالة HTTP / حالة السيرفر
- ترويسات HTTP
- خريطة الموقع
- السيو / SEO

This confirms native technical search vocabulary exists. It does not establish search volume or difficulty.

## Current SERP observations

Website/domain analysis:
- Arabic products use فحص الموقع and تحليل الموقع for broad website-analysis experiences.
- Some Arabic products combine DNS, SSL, HTTP, SEO, performance and security in one domain diagnostic flow.

DNS:
- فحص DNS and فحص سجلات DNS are both visible formulations.
- Arabic pages commonly keep the acronym DNS in Latin characters while surrounding explanation is Arabic.
- Record types A, AAAA, MX, TXT, CNAME, NS, CAA remain protocol identifiers and should not be translated.

SSL/TLS:
- فحص شهادة SSL and فاحص شهادات SSL are common visible formulations.
- SSL/TLS and HTTPS are normally retained as Latin acronyms.
- Arabic result labels should localize issuer, validity, expiry, covered names and remaining days while preserving exact certificate values.

HTTP / redirects:
- Arabic tool ecosystems use فاحص التحويلات, ترويسات HTTP and server/status-check terminology.
- HTTP status codes and header names remain exact technical strings.

## Candidate 3-page Arabic test

If quantitative metrics are still unavailable when a controlled public test is approved, start with three pages where current SERPs show strong native product vocabulary and our implementation is mature:

1. Arabic locale landing / website diagnostic entry
   Candidate user-facing concept: فحص الموقع
   Do NOT lock slug/title until metrics and SERP comparison are complete.

2. DNS Checker
   Candidate concept vocabulary: فحص DNS / فحص سجلات DNS
   Existing implementation supports A, AAAA, MX, TXT, CNAME, NS, CAA.

3. SSL Checker
   Candidate concept vocabulary: فحص شهادة SSL / فاحص شهادة SSL
   Existing implementation reports validity, issuer, dates, SANs, endpoint IP and related certificate details when verification succeeds.

Why these three:
- all have clear native terminology in current Arabic SERPs
- all map to working Smart Web Utility functionality
- they create a coherent domain-diagnostics cluster
- they are easier to native-QA than translating the full 46-page site

## Arabic UX requirements

- html lang="ar" dir="rtl"
- body/interface RTL
- domain/URL inputs should use dir="ltr" and text-align:left where that improves technical entry
- code, IPs, DNS values, URLs and certificate names must be direction-isolated
- avoid mirroring technical symbols or corrupting colon/slash sequences
- navigation order must be visually natural in RTL
- mobile menu, breadcrumbs, tables and result grids require explicit RTL QA
- keep Latin acronyms such as DNS, SSL/TLS, HTTP, HTTPS, JSON, JWT, SEO where Arabic technical usage commonly does

## Native editorial QA checklist

- not literal word-for-word English translation
- terminology consistent across title, H1, form labels and result labels
- Arabic grammar reviewed in context, not sentence-by-sentence only
- technical nouns are understandable to Arab developers/site owners
- no Gulf-only or Egypt-only colloquial phrasing in the generic ar version
- Modern Standard Arabic for broad reach
- do not claim geographic/global coverage the tool does not have
- privacy and methodology wording must preserve the same factual limitations as English

## Quantitative research pending

Ubersuggest daily report quota is exhausted at the time of this research. Therefore:
- no search-volume figures are recorded
- no CPC figures are recorded
- no SEO-difficulty figures are recorded
- no Arabic-first rollout decision is made solely from this SERP evidence

Once metrics are available, compare at minimum:
- فحص DNS
- فحص سجلات DNS
- فحص شهادة SSL
- فاحص شهادة SSL
- فحص الموقع
- تحليل الموقع

Use Saudi Arabia as one high-value Arabic market sample, then cross-check UAE and Egypt before choosing a generic Arabic title. The public locale remains /ar/ unless later evidence supports country-specific variants.
