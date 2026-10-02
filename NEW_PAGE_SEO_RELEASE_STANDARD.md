# New Page / Tool SEO Release Standard

Updated: 2026-10-03

This checklist is mandatory for every new public page, tool or guide. A page is not production-ready when only the functionality is complete.

## 1. Keyword and intent evidence

Before implementation:
- Define one primary search intent and one canonical owner URL.
- Validate the primary keyword with current Ubersuggest data in the target market; US English is the default research market.
- Record useful semantic/secondary variants, entities, abbreviations, standards and problem-language that the same page genuinely satisfies.
- Validate SERP intent and avoid creating a duplicate page for a keyword already owned by an existing URL.
- Check Tier-1 transferability where material: United Kingdom, Canada and Australia are tracked separately rather than assumed to match US difficulty.
- Do not add unsupported keyword variants merely for volume.

## 2. Semantic content

Every tool page must explain the topic in natural language, not keyword repetitions:
- Clear H1 matching the actual task.
- Answer-first introduction explaining what the tool does and what input/output the user gets.
- Relevant semantic concepts, standards, entities and terminology needed to understand the task.
- Real use cases and workflows.
- Important limitations, edge cases and interpretation guidance.
- Examples where they make the task clearer.
- FAQs only when there are genuine recurring questions; visible FAQ content and structured data must agree.
- Descriptive internal links to related tools/guides without cannibalizing the primary intent.

Semantic keywords are coverage signals, not a stuffing checklist.

## 3. SEO

Required:
- Unique, useful title and meta description.
- One H1.
- Self-referencing canonical.
- Crawlable/indexable public response.
- Correct Open Graph/Twitter metadata.
- Appropriate JSON-LD (WebApplication, WebPage/Article, BreadcrumbList and FAQPage only where applicable).
- Sitemap entry and accurate lastmod for material changes.
- Internal links from the correct category/topic hub.
- No broken links, duplicate metadata, thin placeholder copy or doorway variants.

## 4. AEO

Optimize for direct answers without sacrificing the tool experience:
- Put the concise answer/definition close to the task.
- Use clear question-oriented headings where they genuinely match user questions.
- Explain outputs and decisions in plain language.
- Make important facts extractable as normal HTML text.
- Use lists/tables only when they improve comprehension.
- Do not manufacture FAQ content solely for schema.

## 5. GEO / AIO

Make the page easy for search and answer systems to understand and trust:
- State the tool purpose, scope, inputs, outputs and limitations explicitly.
- Use consistent entity names and technical terminology.
- Reference authoritative standards or official documentation when factual interpretation depends on them.
- Keep Methodology/About/trust links available.
- Distinguish observed output from interpretation.
- Never claim guaranteed rankings, AI citations or search-engine approval.
- Structured data must match visible content and actual functionality.

## 6. SXO and product quality

Traffic pages must also be good tools:
- Primary task visible quickly and usable without signup where practical.
- Mobile-first responsive layout with no horizontal overflow.
- Keyboard-accessible controls and meaningful labels.
- Helpful validation/errors and clear result states.
- Copy/download/export where the workflow benefits from them.
- Browser-side processing where network access is not required.
- Avoid unnecessary third-party JavaScript and large framework payloads.
- Preserve Core Web Vitals and prevent avoidable layout shifts.

## 7. Navigation and discoverability

Every new live tool must:
- Be added to exactly the appropriate category hub as a live tool card.
- Be added to assets/tool-catalog.json with title, description, category and useful semantic aliases.
- Be included in the active-navigation category map.
- Receive an icon/category treatment consistent with the global menu.
- Be considered for a direct-menu shortcut when it is high-demand, high-value or strategically important.
- Have natural related-tool links from relevant existing pages when useful.

The static SEO QA intentionally fails if live category-hub tools and the global tool-search catalog drift apart.

## 8. Functional and regression testing

Before merge:
- Add or update a Chromium functional smoke case.
- Ensure the sitemap-wide browser initialization sweep stays clean.
- Run JavaScript/PHP/deploy-script validation.
- Run static SEO QA.
- Test mobile navigation and layout.
- Test any new structured exports, edge cases or state transitions.
- Performance-test changes that add meaningful script/network/layout cost.

## 9. Release and indexing

Production release requires:
- PR reviewable diff.
- Build CI pass.
- Chromium/browser CI pass.
- Pre-deploy SEO QA pass.
- Rollback-safe production release.
- Live HTTP/functionality verification.
- IndexNow submission for materially changed priority URLs.
- Search Console/Bing feedback used as the first-party discovery/ranking loop.
- Ubersuggest post-release crawl/rank tracking where appropriate.

## 10. Traffic priority

The governing goal is qualified organic traffic from Tier-1 markets and globally. Therefore:
- Strengthen pages already earning impressions before creating unrelated pages.
- Prefer attainable high-intent opportunities over vanity head terms.
- Preserve one canonical URL per intent cluster.
- Build legitimate topical authority and referring domains; do not use spam links, fake pages or mass-generated doorway content.
