# Smart Web Utility — Project State

Last verified: 2026-10-05

## Objective

Run the remaining content/SEO re-audit page by page. Research, improve, test and commit exactly one page at a time in GitHub. Do not deploy page-by-page; perform one controlled production deployment only after the complete audit batch is finished, merged and fully green.

## Source / deployment state

- Current production source/artifact SHA: `04ce96286f0baaff1a175f4cae7c9491b0607688`
- Current GitHub main state-only head before this batch: `ee460eb96606bbf93cd7a8347e51be8c851672d3`
- Working branch: `content-reaudit-page-by-page-2026-10-03`
- Page 15 implementation head before CI-result state sync: `faee67d5881be04c1df8e988a02dd7055591a867`.
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
- When GitHub-hosted Actions cannot allocate a runner or quota/package limits block execution, the approved ZTHosting isolated CI fallback may satisfy the same gate. GitHub remains the source of truth for code/commits; production paths must not be used as the CI workspace.
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

### Page 16 — /xml-formatter-validator/

Status: IMPLEMENTED ON BRANCH; CI PENDING.

Research evidence:
- `xml formatter`: 27,100 US searches/month, SD 41, CPC $4.24.
- `online xml formatter`: 4,400, SD 38, CPC $7.40.
- `xml formatter and validator`: 50, SD 4.
- Current SERP includes DA 5–25 utility competitors.

Confirmed gap:
- formatting/minification/well-formedness behavior was already strong;
- parser errors were flattened rather than surfacing parser-reported source location.

Implemented:
- normalize browser XML parser line/column when available;
- preserve original parser detail;
- keep validation scope explicitly at XML well-formedness only;
- update semantic copy, search aliases and sitemap lastmod;
- add Chromium malformed multi-line XML regression.

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

Current-head ZTHosting CI fallback validation:
- GitHub audit head: `89d6a59e8d675de0cd19bc4febfd5dfde8f8c65c`.
- Current head differs from green Page 14 checkpoint `896e7f8cb3473c947c16f5f500afb5206b1aa03a` only in `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md` and `PROJECT_STATE.md`; runtime/test/public files are identical.
- GitHub-hosted current-head Build 757 and Chromium 441 failed before checkout/test execution because no hosted runner was allocated; no repository-test log was produced.
- Reused verified Build 748 artifact ID `11309366580` for the runtime-identical checkpoint.
- GitHub artifact SHA-256: `3e74cadc820cc6be506db4dba02b0df24fd1b9437b41a8b73aad13e06708477f`.
- ZTHosting server-side artifact SHA-256: exact match.
- Isolated CI root: `/srv/smartwebutility-ci/`; production tree `/srv/smartwebutility/` was not used or mutated.
- Cached browser image: `mcr.microsoft.com/playwright:v1.55.1-noble` (image digest `sha256:2f29369043d81d6d69a815ceb80760f55e85f5020371ad06a4d996f18503ad1c`).
- ZTHosting SEO QA: 89 pages, 0 errors, 0 warnings.
- ZTHosting content QA: 89 pages, 0 errors, 2 intentionally retained advisories.
- ZTHosting PHP lint: PASS.
- ZTHosting JavaScript syntax + Chromium smoke: 144 passed, 0 failed.
- Full 89-page browser initialization sweep, navigation checks, global search and mobile layout checks: PASS.
- Production deployment: NOT STARTED.

Page 15 cURL Converter validation:
- Implementation/content commits: VERIFIED in GitHub.
- Material staged files matched current GitHub branch blobs exactly for page HTML, converter JS, tool catalog, browser test and sitemap.
- ZTHosting isolated SEO QA: 89 pages, 0 errors, 0 warnings.
- ZTHosting isolated content QA: 89 pages, 0 errors, 2 intentionally retained advisory warnings.
- ZTHosting isolated PHP lint: PASS.
- JavaScript syntax: PASS in pinned Playwright 1.55.1 container.
- Chromium functional smoke: 144 passed, 0 failed.
- cURL `--json` regressions: PASS.
- Full 89-page browser initialization sweep: PASS.
- Active navigation checks: PASS.
- Global tool search/navigation: PASS.
- Mobile navigation/layout: PASS.
- Production deployment: NOT STARTED.

## Deployment / indexing

- Page 1 production deployment: NOT STARTED.
- Page 1 IndexNow submission: NOT STARTED.
- No production mutation is allowed until the full page-by-page batch is complete.

## Blockers

- GitHub-hosted Actions runner allocation remains unreliable for this branch.
- This does not currently block the audit because the approved ZTHosting isolated CI fallback has passed the equivalent Page 15 Build/static/browser gate on a non-production workspace.
- Production deployment remains intentionally blocked until the complete page-by-page batch is finished and one final controlled release gate is approved.

## Risks

- UUID v7 monotonicity is guaranteed only within the current browser page session. Independent tabs/devices/processes do not share state.
- Ranking/traffic gains remain UNKNOWN until first-party/provider data appears.
- Long-running audit work must keep production and GitHub state explicit; production source remains `04ce96286f0baaff1a175f4cae7c9491b0607688` until the one-go release.
- GitHub-hosted Actions instability remains an infrastructure risk; use the approved isolated fallback only when hosted runs fail before repository tests execute.

## Work in progress

Pages 1–15 are complete/verified on the audit branch. Page 16 XML Formatter & Validator is implemented and awaiting CI. Production remains unchanged.

## Affected files — completed/current pages

Page 15:
- `curl-converter/index.html`
- `assets/curl-converter.js`

Shared direct requirements:
- `assets/tool-catalog.json`
- `tests/browser-smoke.cjs`
- `sitemap.xml`
- `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md`
- `PROJECT_STATE.md`

## NEXT ACTION

Run Build/static/Chromium CI on the final Page 16 XML Formatter & Validator head. Fix any XML/SEO/content/browser failure before researching Page 17. Do not deploy production.

## CI infrastructure status

Status: PARTIALLY VERIFIED.

- GitHub-hosted Actions remain unreliable for this long-running branch; several runs have failed before checkout/test execution with no repository-test logs.
- The approved ZTHosting isolated fallback is VERIFIED operational and passed Page 15 on the exact staged material files.
- Fallback isolation root: `/srv/smartwebutility-ci/`.
- Production paths `/srv/smartwebutility/site.current`, `site.prev` and running production containers are not used as CI workspaces.
- Pinned browser image: `mcr.microsoft.com/playwright:v1.55.1-noble`.
- Production deployment remains NOT STARTED for this audit batch.
