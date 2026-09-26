# Smart Web Utility — SEO & AI Visibility Measurement

Last reviewed: 2026-09-26

## Principle

Measure visibility before expanding content. Do not substitute article count, backlink count, arbitrary SEO scores or AI-citation guesses for first-party search data.

## Google Search Console

### Standard Search performance

Track:
- clicks
- impressions
- CTR
- average position as directional context, not a universal ranking score
- page
- query
- country
- device
- date

Use this data to identify:
- tool pages gaining transactional impressions
- guide pages gaining troubleshooting or informational impressions
- queries whose intent does not match the current title/snippet
- potential cannibalization between the homepage, tool pages and supporting guides
- country-level demand without creating thin country doorway pages

### Generative AI performance — Search

Google's Generative AI performance report for Search can show organic impressions from generative AI features, pages receiving those impressions, and dimensions such as country/device when sufficient data exists.

Check:
- total generative-AI impressions over time
- pages receiving AI-feature impressions
- country/device mix
- changes after major content or architecture updates

Do not infer that an impression proves a citation caused a click or conversion unless the reporting surface explicitly provides that evidence.

### Search generative AI control

In Search Console:
Settings → Search generative AI

Confirm the property is included in Search generative AI features unless there is a deliberate reason to exclude it.

## Bing Webmaster Tools

### Search performance / indexing

Track normal search visibility, crawl/index status, sitemap processing and URL inspection.

### IndexNow

After a production deployment, submit only URLs that were added, updated or deleted.

Monitor the IndexNow area for:
- URLs submitted
- submission time/source
- crawl status
- index status
- first indexed time where available

IndexNow is a discovery notification, not an indexing or ranking guarantee.

### AI Performance

Track:
- total citations
- cited pages
- citation activity over time
- intents
- topics
- citation share
- compare views when available

Treat Citation Share as an observational visibility metric, not a ranking score.

## Google Analytics 4

Current measurement ID: G-TKF8FWKQN6

Use GA4 to understand what happens after users land:
- landing pages
- page views
- device category
- source / medium
- country at an aggregate reporting level
- engagement patterns

Future custom events should focus on meaningful tool actions such as:
- analysis started
- analysis completed
- copy/download action
- related diagnostic opened

Do not invent conversion meaning before these events are actually implemented.

## Content-cluster review

For each cluster (DNS, SSL/TLS, HTTP/redirects, technical SEO, developer utilities), review:

1. Which pages are indexed?
2. Which queries create impressions?
3. Which pages receive clicks?
4. Which supporting guides send users into a working tool?
5. Which tool pages lead users to a relevant guide or next diagnostic?
6. Is Google/Bing associating the site with the intended topic, or are impressions coming from unrelated queries?
7. Are AI systems citing the pages in Bing AI Performance or Google generative-AI reporting?

Expand a cluster when the evidence shows demand or topical association. Rework or merge pages when they overlap heavily or consistently fail to match intent.

## Reporting cadence

Weekly during the early launch phase:
- indexing status
- new queries/impressions
- IndexNow submission/crawl status
- priority tool pages
- new guide pages
- Bing AI citations if present
- Google generative-AI impressions if present

Monthly:
- cluster-level trends
- country/device changes
- CTR/title opportunities
- internal-link opportunities
- content requiring factual refresh
- performance and UX regressions

## Guardrails

- No guaranteed rankings.
- No fake keyword metrics.
- No interpretation of zero data as proof of zero demand when the site is still newly indexed.
- No mass publishing simply because one cluster exists.
- No paid/spam backlinks as a substitute for useful content.
- No separate AI-spam pages for every query variation.
