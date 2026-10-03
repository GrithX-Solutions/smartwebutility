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
