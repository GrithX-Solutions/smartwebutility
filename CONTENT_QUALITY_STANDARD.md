# Smart Web Utility Content Quality Standard

Updated: 2026-10-03
Status: HARD RELEASE GATE

This standard applies to every public page. A page is not complete because the tool works or because its title/meta/schema are valid. Content quality is part of the product.

## Non-negotiable rules

Every public page must meet all seven editorial requirements below.

### 1. Semantic optimization

- Assign one primary user intent to the page and keep one canonical URL for that intent.
- Cover the entities, attributes, standards, terminology, relationships, common problems and follow-up questions a user needs to complete the task.
- Use primary, secondary and semantic phrases naturally. Never insert keyword variants only to satisfy a list or reach a density target.
- Explain technically important terms in context.
- Keep supporting sections aligned with the page's main intent so they strengthen, rather than cannibalize, the page.

A page fails this rule when it repeats a keyword but leaves important task concepts, limitations or interpretation gaps unanswered.

### 2. Skimmability

- Put the direct answer or task explanation near the top of the main content.
- Use descriptive H2/H3 headings that tell the reader what each section answers.
- Keep paragraphs focused. Split dense paragraphs before they become difficult to scan.
- Use lists, tables, code blocks, examples and cards only when they make information easier to consume.
- Put warnings, limitations and next actions where users need them.
- Avoid walls of text, vague headings such as "More information", and filler sections.

For the current English site, a paragraph over 120 words is a content-QA failure unless the text is a legal quotation or another justified exception.

### 3. Better value than the current top competitors

For every search-targeted tool or guide, review the live SERP in the target market before publishing or materially rewriting the page.

The review must record the useful content/features offered by the leading relevant results and the gaps Smart Web Utility can solve. We do not copy competitor wording and we do not make a page longer merely to look more comprehensive.

The Smart Web Utility page must deliver a meaningful advantage in one or more of these areas:
- a genuinely useful working tool or workflow;
- clearer explanations;
- more accurate technical interpretation;
- important edge cases or limitations competitors omit;
- stronger privacy/local-processing behavior;
- better examples or troubleshooting steps;
- better accessibility, speed or mobile usability;
- better connection between the result and the user's next action.

"Better" means more useful for the target intent, not more words.

Trust, legal and contact pages are reviewed against completeness, clarity, accuracy and user needs rather than padded to compete for a transactional keyword.

### 4. Easy to read

- Prefer plain, precise English over inflated marketing language.
- Keep sentences direct and reasonably short.
- Explain jargon the first time it matters.
- Avoid unnecessary nominalizations, filler, repetition and stacked clauses.
- Write for the intended user: technical terminology is acceptable when it improves precision, but the surrounding explanation must remain clear.
- Do not target an arbitrary word count or keyword density.

### 5. Native-language quality

The current canonical site is English. English copy must read as natural, idiomatic professional English for an international audience.

For future localized pages:
- write or professionally rewrite in the target language;
- do not publish literal machine-translated copy as final editorial content;
- use the correct language and direction attributes;
- use terminology that native users actually use for the technical task;
- perform native-language editorial QA before release.

### 6. Grammar and punctuation

- Publish no known spelling, grammar or punctuation errors.
- Use consistent capitalization for protocols, standards and product names.
- Use punctuation that improves comprehension; avoid comma splices, sentence fragments and duplicated punctuation.
- Proofread visible text after templating so navigation, labels, headings and body copy are all checked.
- Code, protocol tokens and literal examples are exempt from ordinary prose punctuation rules when appropriate.

### 7. Active voice

Use active voice by default.

Prefer "The tool checks the certificate" over "The certificate is checked by the tool." Passive voice is acceptable only when the actor is unknown, irrelevant, or the passive construction is materially clearer in technical context. Pages with repeated avoidable passive constructions must be rewritten before release.

## Required content coverage for tool pages

A tool page is expected to answer the following when relevant to the task:
- What does the tool do?
- What input does it accept?
- What output does it produce?
- How should the user interpret the result?
- What are the important limitations or edge cases?
- What are realistic use cases?
- What privacy/network behavior matters?
- What related tool or next diagnostic step is useful?

Do not add sections that do not help the user merely to satisfy this list.

## Required content coverage for guides

A guide should:
- state the symptom or question clearly;
- give the fastest useful answer early;
- explain likely causes in a logical diagnostic order;
- show how to verify each important claim or condition;
- distinguish observed facts from likely causes;
- state limits and exceptions;
- connect the user to the relevant diagnostic tool;
- cite authoritative standards/documentation when a technical claim depends on them.

## Competitive review record

For each new search-targeted page or material content rewrite, keep a short review record in the PR description or research document containing:
- target query and market;
- search intent;
- date reviewed;
- leading relevant result types/pages;
- useful competitor coverage;
- gaps or weak points;
- specific Smart Web Utility value advantage;
- semantic entities/questions added because they help the task.

The review is evidence for editorial decisions, not permission to imitate another publisher.

## Automated QA vs editorial QA

Automation can enforce structural signals such as language declarations, paragraph size, missing content, placeholder text and heading structure. Automation cannot reliably prove:
- factual superiority over competitors;
- natural/native writing quality;
- perfect grammar;
- semantic completeness;
- whether every passive construction is justified.

Those points require editorial review. Passing the automated script never replaces this standard.

## Release decision

A page is blocked from release when any of the seven non-negotiable rules is knowingly unmet.

The governing principle is simple: functionality + useful original publisher content + clear language + verifiable technical accuracy. Search optimization must improve the user's experience rather than create pages for search engines alone.
