# Smart Web Utility — Production Readiness Record

Updated: 2026-10-02

Status: **GitHub production candidate in progress; production deployment intentionally frozen.**

## Release policy

Smart Web Utility is being completed in GitHub first. Do not activate a new production release until the repository-wide content, SEO, functional and monetization-readiness gates are complete and the site owner explicitly approves the one-go deployment.

GitHub Actions may build test artifacts. Those artifacts are validation outputs only and are not authorization to activate production.

## Current repository gates

- Static SEO QA: 62 HTML pages, 0 errors, 0 warnings.
- AdSense readiness heuristic: 62 READY-CANDIDATE, 0 REVIEW, 0 HIGH-PRIORITY.
- AdSense verification script and root ads.txt seller declaration are automatically checked for presence and publisher consistency.
- High-priority AdSense-readiness structural failures now fail CI.
- Browser smoke covers functional tool flows plus a sitemap-wide JavaScript initialization sweep and representative mobile navigation/layout.
- Canonicals, titles, meta descriptions, H1 structure and sitemap coverage are enforced by static QA.

The AdSense readiness heuristic is an internal review aid, not a Google approval prediction and not a substitute for Google Publisher Policies.

## Batch 1 structured-data converter status

Repository pages:
- /xml-to-json/
- /json-to-csv/
- /yaml-to-json/
- /json-to-yaml/

Completed:
- Functional browser-side conversion.
- Unique titles, descriptions, H1s and canonicals.
- Explicit index/follow crawl directives.
- WebApplication structured data.
- BreadcrumbList structured data matching visible hierarchy.
- Task-specific how-to steps.
- Static input/output examples.
- Format-specific limitations and use cases.
- Browser-local privacy explanations.
- Cross-links across the structured-data converter cluster.
- Developer Tools hub silo integration.
- sitemap.xml inclusion and current lastmod values.
- Automated SEO assertions in browser smoke tests.

## Publisher-content / AdSense safeguards

Before approval and ad-unit rollout:
- Keep the working tool and publisher-authored content usable without ads.
- Do not add placeholder ad slots or fake publisher identifiers.
- Do not place ad units beside converter inputs, Convert/Copy/Download controls, errors or result areas.
- Keep publisher content visually dominant.
- Avoid replicated/thin tool pages; each page must retain task-specific content, examples and limitations.
- Keep About, Privacy, Terms, Contact and Methodology accessible through site navigation/trust links.

After approval, before personalized ads are served where consent requirements apply:
- Configure the appropriate Google-certified consent/CMP flow for EEA/UK/Swiss traffic.
- Re-test mobile spacing and accidental-click risk after ad insertion.
- Reserve ad space where necessary to avoid avoidable layout shift.
- Review the AdSense Policy Center after activation.

## Final one-go deployment gate

Before production activation:
1. All intended batches for this release are merged into the final release branch/main.
2. Static SEO QA passes with zero structural errors.
3. AdSense readiness check reports no objective high-priority issue.
4. Browser functional smoke passes.
5. Sitemap-wide initialization sweep passes.
6. Production bundle workflow succeeds.
7. robots.txt, sitemap.xml, ads.txt, canonicals and trust pages are reviewed from the final artifact.
8. No unfinished/placeholder/under-construction pages are included.
9. Final mobile layout review is complete.
10. The site owner explicitly approves deployment.

## Post-deploy verification

After the one-go deployment:
- Verify HTTPS and canonical host behavior.
- Fetch robots.txt, sitemap.xml and ads.txt from production.
- Check the homepage and priority tool URLs return 200 and correct canonicals.
- Re-run browser smoke against production where safe.
- Validate priority structured data with Google's supported testing tools.
- Inspect priority URLs in Search Console and request indexing where appropriate.
- Monitor AdSense site status and Policy Center without making repeated content changes during review unless an actual issue is identified.
