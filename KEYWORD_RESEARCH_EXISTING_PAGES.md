# Existing-Page Keyword Opportunities

Updated: 2026-10-02

Rule: when a verified keyword matches a real capability already present on Smart Web Utility, strengthen the existing page instead of publishing a near-duplicate doorway page.

## PNG to ICO → consolidate into /favicon-generator/

Validated query: **change from png to ico**

Provider estimates:
- Global: ~27,100/month.
- US: ~5,400/month, KD 7, CPC ~$0.51.
- UK: ~1,000/month, KD 6, CPC ~$1.03.
- Canada: ~720/month, KD 7, CPC ~$0.47.
- Australia: ~590/month, KD 6, CPC ~$0.66.

SERP observation:
- Large converter sites dominate the strongest positions.
- picflow.com (DA ~33) appeared around #8.
- tinyimagepro.com (DA ~8) appeared just outside the top 10 around #11.
- Reddit and Microsoft community results are also present, indicating mixed tool/how-to intent.

Decision:
- Do **not** create /png-to-ico/ as a second page.
- The existing /favicon-generator/ already accepts PNG input and builds a real ICO container with 16x16, 32x32 and 48x48 icon entries in browser JavaScript.
- Add natural PNG→ICO terminology, a conversion explanation, visible steps and a matching FAQ to the existing page.
- Keep the main page useful for the broader favicon-generator intent; do not turn the entire page into a single-keyword landing page.

Implementation evidence:
- The favicon engine builds the ICO directory and embeds generated icon PNG bytes rather than renaming a PNG file.
- Browser smoke generates the favicon package and verifies that an .ico download is produced.

## Rejected image-format ideas for now

- SVG → JPG: ~6,600 US / KD 7, but current top results are authority-heavy; no strong low-authority top-10 gap was observed.
- SVG → PNG: ~1,600 US / KD 5; SERP has some mid-authority specialists but is not as compelling as the existing PNG→ICO consolidation opportunity.
- TIFF → JPG: ~1,900 US / KD 8 and a DA ~18 result near the top, but robust TIFF decoding requires an additional codec/library. Hold until the implementation and dependency are fully audited.
- HEIC → JPG: brand-heavy/autocomplete-heavy variants appeared; a correct browser implementation requires a real HEIC decoder. Do not publish a fake Canvas-only converter.
