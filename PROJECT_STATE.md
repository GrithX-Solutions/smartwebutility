# Smart Web Utility — Project State

Last verified: 2026-10-04

## Objective

Run the remaining content/SEO re-audit page by page. Research, improve, test and commit exactly one page at a time in GitHub. Do not deploy page-by-page; perform one controlled production deployment only after the complete audit batch is finished, merged and fully green.

## Source / deployment state

- Current production source/artifact SHA: `04ce96286f0baaff1a175f4cae7c9491b0607688`
- Current GitHub main state-only head before this batch: `ee460eb96606bbf93cd7a8347e51be8c851672d3`
- Working branch: `content-reaudit-page-by-page-2026-10-03`
- Verified recovery content baseline: `ba595d2a3c5d09539ad62fd5995df445895df686`.
- Recovery baseline has zero file diff versus verified/blocker checkpoint `ee5a1742b593ad5984a8bb0ba57f2f3f31110cbb`; only Git history differs.
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

### Page 14 — /css-minifier/

Status: VERIFIED ON BRANCH.

Research evidence:
- `css minifier`: 720 US searches/month, SD 26, transactional.
- `online css minifier`: 110, SD 46.
- Current U.S. SERP includes several DA 4–19 utility domains.

Confirmed gap:
- existing CSSO call forced `comments:false`;
- that removed `/*! ... */` banners often used for license/copyright/build notices.

Implemented:
- preserve CSSO exclamation comments by default;
- user can explicitly remove all comments;
- ordinary comments still removed;
- Clear restores safer default;
- stats disclose comment mode;
- updated visible guidance, WebApplication metadata, search aliases and sitemap lastmod;
- Chromium regression for preserved/removed comment modes plus existing restructuring behavior.

Production remains unchanged.

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

Page 12 HTML to Markdown validation:
- Implementation/content commits: VERIFIED in GitHub.
- Build run 714: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 398: SUCCESS.
- Sanitizer/dangerous-URL/external-request regression: PASS.
- Browser smoke: 144 passed, 0 failed.
- Full sitemap browser sweep: PASS.

Page 12 checkpoint note:
- Page 12 remained VERIFIED on its functional head.
- Later checkpoint Build 723 succeeded, while Chromium 407 failed twice because of HTML Minifier worker startup.
- Diagnostic head Build 729 and Chromium 413 succeeded.
- The HTML Minifier reliability issue is tracked as Page 13.

Page 13 HTML Minifier validation:
- Implementation/content commits: VERIFIED in GitHub.
- Build run 735: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 419: SUCCESS.
- Primary-provider failure / secondary-provider fallback regression: PASS.
- Existing minifier regressions and full sitemap browser sweep: PASS.

Page 14 CSS Minifier validation:
- Implementation/content commits: VERIFIED in GitHub.
- Build run 746: SUCCESS.
- JavaScript syntax validation: PASS.
- Static SEO QA: 89 pages, 0 errors, 0 warnings.
- Content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- Chromium run 430: SUCCESS.
- Important-comment preservation/removal regressions: PASS.
- Structural optimization regression: PASS.
- Full sitemap browser sweep: PASS.

## Deployment / indexing

- Page 1 production deployment: NOT STARTED.
- Page 1 IndexNow submission: NOT STARTED.
- No production mutation is allowed until the full page-by-page batch is complete.

## Blockers

- BLOCKED: GitHub-hosted Actions is not allocating a runner to the current audit branch.
- Current failures occur before checkout or any repository test step; repository code is not implicated by those runs.
- Page 15 must not start until an exact current-head Build + Chromium run receives a runner and passes.

## Risks

- UUID v7 monotonicity is guaranteed only within the current browser page session. Independent tabs/devices/processes do not share state.
- Ranking/traffic gains remain UNKNOWN until first-party/provider data appears.
- Long-running audit work must not leave production and GitHub state confused; production source remains explicitly tracked separately from the working branch.

## Work in progress

Pages 1–14 are complete/verified on the audit branch, including the documented CSV-to-JSON no-change decision where applicable. Production remains unchanged. Page 15 is intentionally not started because the current-head CI gate is blocked before runner allocation.

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

Page 14 documentation checkpoint is green: Build 748 SUCCESS and Chromium 432 SUCCESS. Research exactly one Page 15 candidate using Ubersuggest and current US SERPs. Do not deploy production.
