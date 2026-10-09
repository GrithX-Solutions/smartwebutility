# Smart Web Utility — Durable Decisions

## 2026-10-03 — Content quality is a hard release gate

Status: ACTIVE

Every public page must satisfy the requirements in `CONTENT_QUALITY_STANDARD.md`: semantic optimization, skimmability, demonstrated useful value versus relevant current competitors, easy readability, native-quality language, grammar/punctuation QA, and active voice by default.

Automated QA enforces objective structural signals only. It must not claim to prove semantic completeness, competitor superiority, native-language quality, perfect grammar, or whether every passive construction is justified.

## 2026-10-03 — No artificial content length target

Status: ACTIVE

Do not pad pages to reach a fixed word count. Use content length only as a review signal. Coverage, accuracy, task completion, limitations, examples, interpretation, and competitor gaps determine whether more copy is needed.

## 2026-10-03 — One canonical URL per primary intent

Status: ACTIVE

Strengthen an existing intent owner instead of creating near-duplicate pages for semantic keyword variants, geographic modifiers, or closely overlapping tasks.

## 2026-10-03 — Production release requires green gates

Status: ACTIVE

Do not merge or deploy material changes until applicable Build and Chromium/browser checks pass. Production activation must use the verified deployment artifact and preserve rollback.

## 2026-10-03 — Content QA treats inline code as technical tokens

Status: ACTIVE

Grammar/punctuation heuristics must not classify punctuation inside inline `<code>` examples as prose errors. Code/protocol literals remain subject to technical correctness but are excluded from ordinary prose punctuation matching.


## 2026-10-04 — ZTHosting isolated CI is the approved GitHub Actions fallback

Status: ACTIVE

When GitHub-hosted Actions cannot allocate runners, reaches package/quota limits, or otherwise fails before repository tests execute, do not block the audit or consume repeated hosted reruns.

Use the ZTHosting MCP server as an isolated CI fallback with these constraints:
- GitHub remains authoritative for source, commits and PR history.
- Verify the exact source/runtime handoff using an authenticated artifact or a proven runtime-equivalent green checkpoint plus Git diff evidence.
- Verify artifact SHA-256 on the server before testing.
- Use `/srv/smartwebutility-ci/` or another explicitly non-production workspace.
- Never use `/srv/smartwebutility/site.current`, `site.prev`, production release directories or running production containers as the CI worktree.
- Mirror the applicable Build gate: PHP/JavaScript syntax, static SEO QA and content QA.
- Mirror Chromium with the pinned project Playwright version; currently Playwright 1.55.1.
- A server fallback PASS can unblock the next page, but it does not authorize production deployment.
- Production still requires the final one-go verified release, rollback preservation and live checks.


## 2026-10-05 — Page-by-page audit validation cadence

Decision:
- Audit and update exactly one public page at a time.
- After each page, run page-scoped functionality/regression checks plus applicable static SEO/content checks.
- Do not require the full 89-page Chromium/sitemap sweep after every single page, because unrelated-page/CDN flakiness can block an otherwise verified page.
- Before merge/deploy, run the complete Build + SEO QA + content QA + full Chromium/sitemap sweep across the entire accumulated batch.
- Any failure on the currently edited page remains a hard blocker. Unrelated failures discovered during optional broad checks are recorded separately and fixed before final release.

Rationale:
- preserves strict one-page scope;
- keeps evidence tied to the page being audited;
- avoids mixing unrelated maintenance into the current page;
- retains a full-site release gate before production.


## 2026-10-06 — Ubersuggest rank tracking follows each verified page

Status: ACTIVE

After a search-targeted page is VERIFIED under the page-by-page audit gate:
- add 1–3 strategic keywords for that canonical URL to the SmartWebUtility Ubersuggest project;
- default tracking market is U.S. English;
- preserve all existing tracked keywords when updating the project;
- prefer the page's primary attainable term plus one or two distinct high-value secondary terms;
- do not consume tracking slots on every semantic variant;
- expand a keyword to UK/CA/AU only when demand, business value or country-specific evidence justifies the extra location slots;
- record tracking as measurement, not as evidence that rankings or traffic have improved.

This tracking step does not replace GSC/Bing first-party performance measurement and does not authorize production deployment.
