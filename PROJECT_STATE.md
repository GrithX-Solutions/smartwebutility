# Smart Web Utility — Project State

Last verified: 2026-10-03

## Objective

Continue evidence-driven content and SEO improvement after successfully releasing Content Re-Audit Batch 2. Production now includes the researched YAML/JSON and Base64 improvements plus the active-voice cleanup, while evidence-based no-change decisions remain documented for pages where expansion would add filler.

## Source / deployment state

- Deployed source/artifact SHA: `04ce96286f0baaff1a175f4cae7c9491b0607688`
- Batch 2 implementation merge SHA: `3fea7c0ee44be66d366c3e1a6a5980de491ec81d`
- Merged PR: #44 — Improve YAML converters and Base64 from content re-audit
- Production release directory: `/srv/smartwebutility/releases/04ce962-content-reaudit-batch2`
- Staged ZIP: `/srv/smartwebutility/releases/04ce962-content-reaudit-batch2.zip`
- Verified artifact SHA-256: `02ad71b6bffeb2d5668e4b8516bcbcf501c26edfc044d5f6846364ea077a1341`
- Rollback preserved at `/srv/smartwebutility/site.prev`.
- Production runtime after activation: VERIFIED healthy, 22/22 containers running, 0 unhealthy, 0 unstable, 0 stopped.

## Last completed work

VERIFIED:
- Ubersuggest Tier 3 research used the United States market (`locId 2840`).
- Research and semantic briefs are recorded in `CONTENT_REAUDIT_BATCH2_2026-10-03.md`.
- YAML to JSON now supports multi-document YAML streams and 2/4-space JSON indentation.
- JSON to YAML now supports 2/4-space YAML indentation.
- Base64 now supports local file-to-Base64 encoding up to 5 MB while keeping decode output intentionally UTF-8 text only.
- Browser regression tests cover the new YAML and Base64 behavior.
- Search aliases and sitemap lastmod were updated for the three materially changed pages.
- Avoidable passive constructions were rewritten across 14 existing pages without adding search-targeting filler.
- Password Generator and Text Tools were researched and intentionally left compact because no justified content gap was identified for their difficult/navigational U.S. head terms.
- PR #44 merged with an exact head-SHA guard.
- The exact current-main artifact was checksum-verified and ZIP-tested on the production host before extraction.
- Guarded production deployment completed with rollback preservation and on-host QA.
- Live HTTPS verification returned HTTP 200 with the new content/controls for:
  - `/yaml-to-json/`
  - `/json-to-yaml/`
  - `/base64-encoder-decoder/`
- Live API smoke verification returned the expected HTTP 400 JSON error contract for:
  - `/api/seo-audit.php`
  - `/api/http-status.php`
- IndexNow accepted the three materially upgraded canonical URLs with HTTP 200.

## Research evidence

Ubersuggest US:
- `yaml to json`: 1,600 volume, SD 23.
- `yaml to json convert`: 720 volume, SD 7.
- `yaml to json conversion`: 320 volume, SD 6.
- `json to yaml`: 1,300 volume, SD 35, CPC $11.31.
- `json to yaml conversion`: 590 volume, SD 6, CPC $4.67.
- `json to yaml converter`: 480 volume, SD 28.
- `base64 encoder decoder`: 260 volume, SD 29.
- `base64 encoder/decoder`: 260 volume, SD 18.
- `base64 decoder`: 74,000 volume, SD 31.
- `password generator`: 246,000 volume, SD 70 — no-change decision.
- `text tools`: 720 volume, SD 78, navigational intent — no-change decision.

## Tests / evidence

VERIFIED on final PR head `d128dd2ca20272cc83f11cce1cea872b8cc7fc15`:
- Build run 571: SUCCESS.
- Chromium run 255: SUCCESS.
- Static SEO QA: 89 HTML pages, 0 errors, 0 warnings.
- Content QA: 89 HTML pages, 0 errors, 2 advisory warnings.
- Full sitemap initialization/browser sweep passed.

VERIFIED post-merge on `3fea7c0ee44be66d366c3e1a6a5980de491ec81d`:
- Build run 572: SUCCESS.
- Chromium run 256: SUCCESS.
- Static SEO QA: 89 HTML pages, 0 errors, 0 warnings.
- Content QA: 89 HTML pages, 0 errors, 2 advisory warnings.

VERIFIED on deployed artifact source `04ce96286f0baaff1a175f4cae7c9491b0607688`:
- Build run 573: SUCCESS.
- Chromium run 257: SUCCESS.
- Artifact ID: `11271413114`.
- GitHub artifact SHA-256: `02ad71b6bffeb2d5668e4b8516bcbcf501c26edfc044d5f6846364ea077a1341`.
- Production-host SHA-256: exact match.
- ZIP integrity: PASS.
- Required deploy/QA/API/page files present before switch.
- Guarded deploy script: return code 0.
- On-host SEO QA: 89 pages, 0 errors, 0 warnings.
- On-host content QA: 89 pages, 0 errors, 2 advisory warnings.
- Production API routing and JSON smoke checks: PASS.
- Post-deploy runtime health: 22/22 containers healthy/running.

The two retained warnings are:
- `/password-generator/` compact page: reviewed, no justified expansion in this batch.
- `/text-tools/` compact hub: reviewed, no justified expansion in this batch.

They remain visible rather than being suppressed or padded away.

## Deployment / indexing

- PR #44 merge: VERIFIED.
- Post-merge CI: VERIFIED green.
- Batch 2 production deployment: VERIFIED.
- Rollback preservation: VERIFIED.
- Live canonical pages: VERIFIED HTTP 200 with new release content.
- Live API contract checks: VERIFIED.
- IndexNow submission: VERIFIED HTTP 200 for exactly 3 materially upgraded URLs.
- Google sitemap discovery remains available through the existing submitted sitemap and updated `lastmod` values.
- Direct Google Search Console request-indexing status for these three URLs: UNKNOWN / not verified in this deployment workflow.

## Blockers

- None for Batch 2 production completion.

## Risks

- Multi-document YAML has no native JSON document-stream equivalent; the implementation visibly documents its top-level-array mapping.
- Base64 file support encodes binary bytes but does not claim arbitrary binary-file decoding.
- Ranking and traffic gains remain UNKNOWN until first-party performance data accumulates.
- Do not expand Password Generator or Text Tools solely to remove compact-content warnings.
- Historical production release storage remains larger than the preferred current + rollback retention; cleanup requires a separate verified retention task.
- The repository may advance with state-only documentation commits after the deployed source SHA; do not treat those as runtime releases unless separately deployed.

## Work in progress

No production work is currently in progress. Batch 2 is complete and live.

## Affected files

Research/state:
- `CONTENT_REAUDIT_BATCH2_2026-10-03.md`
- `PROJECT_STATE.md`

Functional/search pages:
- `/yaml-to-json/`
- `/json-to-yaml/`
- `/base64-encoder-decoder/`

Functionality/tests:
- `assets/data-converters.js`
- `assets/base64.js`
- `assets/tool-catalog.json`
- `tests/browser-smoke.cjs`
- `sitemap.xml`

Active-voice editorial cleanup:
- `/about/`
- `/guides/`
- `/methodology/`
- `/privacy/`
- `/terms/`
- `/css-minifier/`
- `/csv-to-xml/`
- `/csv-viewer/`
- `/hash-generator/`
- `/html-entity-encoder-decoder/`
- `/html-to-markdown/`
- `/json-diff/`
- `/json-to-csv/`
- `/toml-formatter-validator/`

## NEXT ACTION

Continue the manual content re-audit with the next evidence-backed page set: use Ubersuggest + current U.S. SERPs + existing first-party search data where available, change only pages with a real intent/product/content gap, preserve canonical ownership, and keep Password Generator/Text Tools unchanged unless new evidence justifies expansion.
