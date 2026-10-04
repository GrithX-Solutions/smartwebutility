# Smart Web Utility — Project State

Last verified: 2026-10-03

## Objective

Run the remaining content/SEO re-audit page by page. Research, improve, test and commit exactly one page at a time in GitHub. Do not deploy page-by-page; perform one controlled production deployment only after the complete audit batch is finished, merged and fully green.

## Source / deployment state

- Current production source/artifact SHA: `04ce96286f0baaff1a175f4cae7c9491b0607688`
- Current GitHub main state-only head before this batch: `ee460eb96606bbf93cd7a8347e51be8c851672d3`
- Working branch: `content-reaudit-page-by-page-2026-10-03`
- Production remains unchanged during this audit batch.
- Rollback remains preserved at `/srv/smartwebutility/site.prev`.

## Page-by-page rule

ACTIVE:
- One public page is selected from evidence, not intuition.
- Only that page and directly required JS/tests/search metadata are changed before moving on.
- Each page gets a documented demand/SERP/semantic/competitor-gap decision.
- A no-change decision is valid when no real gap exists.
- Each changed page must pass Build + SEO QA + content QA + Chromium before page #N+1 starts.
- Do not merge/deploy piecemeal to production.
- After the complete batch is finished, use one final merge/release/deploy sequence.

## Completed page

### Page 1 — /uuid-generator/

Status: VERIFIED GREEN ON BRANCH.

Research evidence:
- `uuid generator`: 22,200 US searches/month, SD 28, transactional.
- `guid generator`: 9,900, SD 23.
- `guid generator online`: 1,600, SD 21.
- `online uuid generator`: 1,300, SD 23.
- `random uuid generator`: 1,300, SD 24.
- `v4 uuid generator`: 720, SD 18.
- Smart Web Utility currently has no Ubersuggest US ranking-keyword data for this page.

Confirmed gap:
- Previous UUID v7 generation used unrelated random suffixes for each identifier.
- Same-millisecond UUID v7 values therefore had no strict generation-order guarantee.
- RFC 9562 gives monotonicity guidance for high-rate/batch UUID v7 generation.

Implemented:
- same-session monotonic UUID v7 payload handling;
- Web Crypto random 74-bit payload and cryptographically random positive increments;
- clock rollback handling;
- same-millisecond batch ordering;
- explicit local-session limitation in visible content;
- updated WebApplication/FAQ text;
- relevant tool-search aliases;
- Chromium regression test that freezes time and verifies 100 same-millisecond UUID v7 values are unique and lexicographically monotonic.

Research record:
- `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md`

## Current page

### Page 11 — /json-escape-unescape/

Status: VERIFIED ON BRANCH.

Research evidence:
- `json escape`: 1,900 US searches/month, SD 32.
- `json escape chars`: 590, SD 13.
- `json escape online`: 320, SD 31.
- Current SERP includes a DA 16 utility at position 1.

Confirmed gap:
- implementation was already correct for JSON strings;
- page under-explained context boundaries and the practical purpose of optional `\/`.

Implemented:
- explicit JSON-vs-HTML/URL/SQL/shell boundary guidance;
- explain `</script>` and optional slash escaping;
- clarify ordinary Unicode need not be forced to `\uXXXX`;
- preserve focused scope: no new HTML-safe or ASCII-only toggle because verified direct demand is minimal;
- update search aliases and sitemap lastmod;
- add browser regression for slash escaping, Unicode preservation and existing malformed-escape rejection.

Research record:
- `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md`

## Tests / evidence

Previous production release remains VERIFIED:
- deployed source `04ce96286f0baaff1a175f4cae7c9491b0607688`;
- production runtime healthy;
- prior SEO/content/browser/API/live gates passed.

Page 1 branch validation:
- Implementation commits: VERIFIED in GitHub.
- Build run 575: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 259: SUCCESS.
- Forced same-millisecond UUID v7 monotonicity test: PASS.
- Full sitemap browser sweep: PASS.

Page 2 branch validation:
- Initial Chromium run 269 exposed a test-timing issue; implementation had no browser exception.
- Async test wait fixed in commit `fca172ee846931a04e39a70a4d0e123a5688bd0b`.
- Build run 586: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 270: SUCCESS.
- Maskable favicon regression checks: PASS.
- Full sitemap browser sweep: PASS.

Page 3 branch validation:
- Build 599 exposed one meta-description length warning; fixed before acceptance.
- Final implementation head `c426b2264c485e85131d07048d66b66d5f99b978`.
- Build run 600: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 284: SUCCESS.
- Symbolic chmod command and special-bit regression checks: PASS.
- Full sitemap browser sweep: PASS.

Page 5 JWT Decoder validation:
- Implementation commits: VERIFIED in GitHub.
- Build run 657: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 341: SUCCESS.
- Bearer/signature/exp/nbf regressions: PASS.
- Full sitemap browser sweep: PASS.

Page 7 Meta Tag Generator validation:
- Implementation commits: VERIFIED in GitHub.
- Build run 666: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 350: SUCCESS.
- Escaping/Open Graph/Twitter-X/privacy regressions: PASS.
- Full sitemap browser sweep: PASS.

Page 7 ULID Generator validation:
- Implementation commits: VERIFIED in GitHub.
- Build run 675: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 359: SUCCESS.
- Automatic clock-rollback monotonic regression: PASS.
- Full sitemap browser sweep: PASS.

Page 8 Random Port Generator validation:
- Implementation/content commits: VERIFIED in GitHub.
- Build run 679: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 363: SUCCESS.
- Existing random-port functional regressions: PASS.
- Full sitemap browser sweep: PASS.

Page 9 Markdown to HTML validation:
- Implementation commits: VERIFIED in GitHub.
- Build run 686: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 370: SUCCESS.
- Sanitized/raw-output XSS regression: PASS.
- Sandboxed raw-preview non-execution regression: PASS.
- Full sitemap browser sweep: PASS.

Page 10 YAML Formatter validation:
- Implementation/content commits: VERIFIED in GitHub.
- Final Build run 696: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Initial Chromium run 379 exposed only a test whitespace assertion mismatch; formatter behavior itself passed.
- Corrected Chromium run 380: SUCCESS.
- Single/multi-document/invalid-stream regressions: PASS.
- Full sitemap browser sweep: PASS.

Page 11 JSON Escape / Unescape validation:
- Implementation/content commits: VERIFIED in GitHub.
- Build run 701: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 385: SUCCESS.
- Slash/Unicode/malformed-escape regressions: PASS.
- Full sitemap browser sweep: PASS.

## Deployment / indexing

- Page 1 production deployment: NOT STARTED.
- Page 1 IndexNow submission: NOT STARTED.
- No production mutation is allowed until the full page-by-page batch is complete.

## Blockers

- No Page 1 blocker remains. A docs-only validation-state commit is being recorded before Page 2 research begins.

## Risks

- UUID v7 monotonicity is guaranteed only within the current browser page session. Independent tabs/devices/processes do not share state.
- Ranking/traffic gains remain UNKNOWN until first-party/provider data appears.
- Long-running audit work must not leave production and GitHub state confused; production source remains explicitly tracked separately from the working branch.

## Work in progress

Pages 1–3 (UUID Generator, Favicon Generator, chmod Calculator) are fully green on the audit branch. Production remains unchanged.

## Affected files — completed/current pages

Page 1:
- `uuid-generator/index.html`
- `assets/uuid.js`

Page 2:
- `favicon-generator/index.html`
- `assets/favicon-generator.js`
- `assets/favicon-generator.css`

Page 3:
- `chmod-calculator/index.html`
- `assets/chmod-calculator.js`

Material sitemap updates:
- `sitemap.xml`

Shared direct requirements:
- `assets/tool-catalog.json`
- `tests/browser-smoke.cjs`
- `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md`
- `PROJECT_STATE.md`

## NEXT ACTION

Verify the documentation-only Page 3 state head. If green, select exactly one Page 4 from fresh U.S. demand + current SERP evidence. Do not deploy production.
