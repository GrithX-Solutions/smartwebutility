# AGENTS.md

## Repository operating rules

Smart Web Utility is a production utility platform focused on fast, technically credible tools, sustainable organic search traffic, Tier-1 markets, and AdSense-compatible user experience.

Before material work, read:
1. `README.md`
2. `AGENTS.md`
3. `PROJECT_STATE.md`
4. `DECISIONS.md`
5. `NEW_PAGE_SEO_RELEASE_STANDARD.md`
6. `CONTENT_QUALITY_STANDARD.md`
7. `LAUNCH.md`
8. relevant deploy/API/security files for the change

## Source of truth

Use evidence in this order:
production/live telemetry > current default branch/deployed artifact > CI/build/tests > current official documentation > `PROJECT_STATE.md` / `DECISIONS.md` > chat history.

Never report a merge, deployment, indexing result, test pass, ranking gain, or traffic gain without verification.

## Engineering workflow

For material implementation work:
- start from a verified source SHA;
- use a branch and reviewable PR;
- preserve SSRF/rate-limit/security controls for network tools;
- run applicable PHP/JavaScript/static SEO/content/browser checks;
- require green CI before merge;
- deploy only a verified build artifact with rollback preserved;
- verify production after activation;
- update `PROJECT_STATE.md` after material work or interruption.

Do not commit secrets.

## Search/content workflow

Before a new search-targeted page or material rewrite:
- validate demand and intent with current evidence;
- use Ubersuggest as the primary keyword/competitive source when available;
- inspect the current SERP and leading relevant competitors;
- avoid cannibalizing an existing canonical intent owner;
- define the semantic brief and the concrete user-value advantage;
- follow `NEW_PAGE_SEO_RELEASE_STANDARD.md` and `CONTENT_QUALITY_STANDARD.md`.

No fixed word-count target or keyword-density target is a substitute for useful coverage.

## Release status language

Use these status labels precisely in project records:
- VERIFIED
- PARTIALLY VERIFIED
- UNKNOWN
- BLOCKED
- FAILED

## State discipline

`PROJECT_STATE.md` must contain exactly one `NEXT ACTION` entry.
Durable policy and architecture decisions belong in `DECISIONS.md`.
