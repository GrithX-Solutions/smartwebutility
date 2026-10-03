# Full-Site Content Re-Audit — 2026-10-03

Scope: current `main` at commit `993c4d6441c6dd1ac26321d512782251fc285b89`

This audit is the baseline for the new hard content-quality rule in `CONTENT_QUALITY_STANDARD.md`.

## Inventory

- Public `index.html` pages audited: **89**
- Pages with an explicit HTML language: **89/89**
- Current language on audited pages: **English**
- Pages with paragraphs above 120 words in the structural pass: **0**
- Pages carrying the legacy `data-quality-content` marker: **80**
- Pages without that legacy marker: **9**

The legacy marker is not treated as proof of editorial quality. It is an inconsistent historical signal and will be superseded by the sitewide content QA gate.

## What is already strong

Across the current site:
- page copy is generally broken into short paragraphs;
- H2/H3 usage is extensive rather than relying on walls of text;
- tool pages usually explain purpose, use cases and limitations;
- the stronger diagnostic pages already distinguish measured output from interpretation;
- English language declarations are consistent;
- many pages already include privacy/local-processing explanations and related-tool paths.

These strengths should be preserved during rewrites.

## Pages missing the legacy content-quality marker

Search/tool pages:
- `/base64-encoder-decoder/`
- `/bulk-redirect-checker/`
- `/security-headers-checker/`
- `/unix-timestamp-converter/`
- `/website-speed-test/`

Trust/support pages:
- `/about/`
- `/contact/`
- `/privacy/`
- `/terms/`

Several of these pages already contain useful content; their absence from the legacy marker shows why the marker cannot remain the release gate.

## Semantic-depth review queue

The following search-facing pages have relatively compact visible copy in the current build. This is **not** a Google word-count rule. They are flagged because compact pages deserve a manual check for missing entities, examples, limitations, interpretation guidance and competitor gaps:

1. `/xml-to-csv/` — ~271 visible words
2. `/lorem-ipsum-generator/` — ~352
3. `/unix-timestamp-converter/` — ~366
4. `/case-converter/` — ~368
5. `/open-graph-preview/` — ~375
6. `/slug-generator/` — ~384
7. `/character-counter/` — ~387
8. `/robots-txt-generator/` — ~393
9. `/yaml-formatter/` — ~398

The review question for each page is: **does the page completely satisfy the target task better than the relevant current search results?** If yes, do not pad it. If not, add only the missing useful coverage.

## Trust/support pages

`/about/`, `/contact/`, `/privacy/` and `/terms/` should not be expanded merely to imitate SEO competitors. Their quality standard is clarity, completeness, accuracy, transparent ownership/contact information, user expectations, and easy navigation.

## Content risks found in this re-audit

### 1. Editorial enforcement is weaker than technical SEO enforcement

The existing `scripts/seo-static-qa.py` hard-fails objective SEO defects such as missing titles, duplicate descriptions, wrong canonicals, broken internal links and sitemap drift. Editorial quality is mostly documented rather than enforced.

**Action:** add a separate content-quality QA gate to CI.

### 2. "Better than competitors" is not yet recorded as evidence

Existing research documents contain SERP/keyword work, but the release standard does not require every material page rewrite to record what competing results cover and what unique value Smart Web Utility adds.

**Action:** require a competitive review record for search-targeted pages.

### 3. Native-language and proofreading requirements are implicit

The current English pages consistently use `lang="en"`, but the standard did not explicitly block literal machine-translated future localized pages or require native-quality editorial review.

**Action:** make native-language QA a hard release requirement.

### 4. Active voice is not an explicit release rule

Most current copy is direct, but active voice has not been a named editorial criterion.

**Action:** active voice becomes the default; repeated avoidable passive constructions require rewriting.

### 5. Content quality cannot be reduced to length

Some simple utilities can completely satisfy intent with concise copy, while complex diagnostics need deeper interpretation. A fixed minimum word count would create filler and contradict people-first content principles.

**Action:** use coverage requirements and live SERP comparison; use length only as a review signal.

## New hard release decision

From this audit forward, a new or materially edited public page is not complete until it satisfies:
1. semantic optimization;
2. skimmability;
3. demonstrated value versus current relevant competitors;
4. easy readability;
5. native-language quality;
6. grammar and punctuation QA;
7. active-voice review.

Technical SEO, AEO, GEO/AIO, SXO, navigation and functional QA remain mandatory in addition to these rules.

## Immediate remediation order

Priority 1:
- strengthen the compact search-facing pages where a semantic/competitor gap is confirmed;
- verify the five search/tool pages missing the legacy quality marker;
- add automated content QA to CI.

Priority 2:
- re-review category hubs for concise but useful category-level semantic coverage;
- review every material future change against current live SERPs in the target market;
- keep legal/trust pages concise but complete rather than SEO-padded.

## Baseline conclusion

The site is not starting from low-quality or wall-of-text content. The main gap is **consistency of editorial enforcement**. The new standard converts content quality from an informal goal into a release gate and creates a clear queue for the pages most likely to need deeper semantic review.
