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

### Page 2 — /chmod-calculator/

Status: IMPLEMENTED ON BRANCH; CI PENDING.

Research evidence:
- `chmod calculator`: 1,900 US searches/month, SD 27, CPC $10.41.
- Current Ubersuggest SERP includes multiple low-to-mid-authority utility domains.
- Smart Web Utility currently has no Ubersuggest US ranking-keyword data for this page.

Confirmed gap:
- existing parser supported 9-character symbolic permissions and special `s/S/t/T` notation;
- it rejected the normal 10-character permission field copied from `ls -l`.

Implemented:
- accept standard leading `ls -l` file-type characters;
- parse `-rwsr-xr-x` and `drwxrwxrwt` correctly;
- normalize output to the 9 chmod permission characters;
- update visible semantic guidance, WebApplication features, tool-search aliases and sitemap lastmod;
- add Chromium regression coverage.

Research record:
- `CONTENT_REAUDIT_PAGE_BY_PAGE_2026-10-03.md`

## Current page

### Page 3 — /chmod-calculator/

Status: IMPLEMENTED ON BRANCH; CI PENDING.

Research evidence:
- `chmod calculator`: 1,900 US searches/month, SD 27, CPC $10.41.
- `linux permissions calculator`: 390, SD 15, CPC $10.02.
- current SERP includes multiple low/mid-authority utility domains.

Existing strengths:
- octal/rwx/ls -l conversion;
- special bits;
- presets;
- umask;
- numeric command generation.

Confirmed gap:
- ranking competitor coverage includes symbolic chmod command generation;
- the page calculated symbolic bits but did not generate an actual symbolic chmod assignment.

Implemented:
- exact `u=...,g=...,o=...` symbolic assignment command;
- special `s`/`t` bits carried into the correct class;
- separate Copy Octal / Copy Symbolic controls;
- clearer distinction between ls-style display strings and chmod symbolic syntax;
- stronger recursive-mode warning;
- exact `linux permissions calculator` search alias;
- regression checks for 1777/sticky and 4655/setuid-without-execute.

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

Page 1 UUID Generator and Page 2 Favicon Generator are fully green. Page 3 chmod Calculator is implemented and awaiting CI. Production remains unchanged.

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

Run Build and Chromium CI for the final Page 3 chmod head. Fix any failure before selecting Page 4. Do not deploy production.
