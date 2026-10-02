# Batch 1 SEO Hardening — Repository Record

Updated: 2026-10-02

Status: **implemented in GitHub branch; not deployed to production**.

## Scope

Pages:
- /xml-to-json/
- /json-to-csv/
- /yaml-to-json/
- /json-to-yaml/

## Completed basics

- Unique title, meta description, H1 and canonical retained per page.
- Explicit index/follow crawl directive with unrestricted snippet/image preview settings.
- Existing WebApplication structured data retained.
- BreadcrumbList structured data added to match Home → Developer Tools → tool-page navigation.
- Task-specific conversion steps and static input/output examples added as indexable supporting content.
- Generic use-case copy replaced with page-specific workflows and limitations.
- Cross-links between all four structured-data converters reinforced.
- Developer Tools hub gains a dedicated structured-data converter silo block.
- Browser smoke tests now assert WebApplication + BreadcrumbList schema, crawl directive, example content and hub linkage on all four pages.

## Release rule

Do not activate production from this work alone. Continue planned batches and repository-wide SEO/content QA first. Production release occurs only after the final release gate is approved for a one-go deployment.

## Final pre-deploy checks

- CI browser smoke: pass.
- Static SEO QA: pass with zero structural errors.
- Review structured-data output with Google Rich Results Test where supported.
- Confirm sitemap URLs and canonicals match final production paths.
- Confirm no accidental noindex or robots.txt blocks.
- Re-check mobile layout and page initialization across the sitemap sweep.
