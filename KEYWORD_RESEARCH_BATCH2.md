# Batch 2 Keyword & SERP Evidence — File Conversion Cluster

Research date: 2026-10-02
Primary market: United States (English)
Secondary checks: United Kingdom, Canada, Australia

This document records provider estimates and live SERP observations used to decide which pages are allowed into the production candidate. Search volume and difficulty are third-party estimates, not guaranteed Google traffic or ranking outcomes. Closely related keyword variants overlap and must not be summed as unique users.

## PASS — TXT to CSV / CSV to TXT

Primary query: **txt to csv format**

Provider estimates:
- Global search volume: ~12,100/month.
- US: ~1,900/month, KD 6, CPC ~$3.83.
- UK: ~390/month, KD 6.
- Canada: ~320/month, KD 5.
- Australia: ~170/month, KD 5.

Related US query variants from the same intent:
- converting txt to csv — ~1,600, KD 7.
- change txt to csv — ~1,300, KD 7.
- txt to csv conversion — ~590, KD 8.
- change csv to txt — ~1,300, KD 7.
- csv to text file — ~720, KD 6.

These variants are intentionally consolidated into one real bidirectional page, /txt-to-csv/, instead of creating near-duplicate pages.

SERP weakness observed for txt to csv format:
- betterbugs.io — DA 23 at #9.
- flipperfile.com — DA 12 at #10.
- cloudzenia.com — DA 14 at #14.
- Search results also contain Reddit, Superuser and YouTube/tutorial results, showing mixed intent rather than ten dominant specialist tools.

Semantic/search-intent coverage used on the page:
- TXT to CSV converter.
- text file to CSV converter.
- TXT to CSV online.
- TXT to CSV with delimiter.
- tab-delimited TXT to CSV.
- comma / semicolon / pipe / whitespace-delimited text.
- CSV to TXT conversion.
- CSV vs TXT structure.
- quoted CSV fields.
- uneven row/column handling.

Implementation requirement:
- Actual delimiter parsing, not filename renaming.
- Auto-detection only when confidence is sufficient.
- Manual delimiter override.
- Quoted CSV support.
- TXT→CSV and CSV→TXT in one page.
- Browser-side file processing; 5 MB limit documented.

## PASS — XML to Excel / XLSX

Primary query: **xml converter to excel**

Provider estimates:
- Global search volume: ~5,400/month.
- US: ~1,000/month, KD 9, CPC ~$5.33.
- UK: ~210/month, KD 27.
- Canada: ~140/month, KD 21.
- Australia: ~90/month, KD 28.

This is primarily a US low-difficulty opportunity; the page is not represented internally as a low-KD UK/CA/AU opportunity.

Related US variants:
- change xml to excel — ~1,000, KD 9.
- how to change xml to excel — ~390, KD 8.

SERP weakness observed for xml converter to excel:
- dataconverter.io — DA 9 at #3.
- exceltool.io — DA 11 at #9.
- cloudzenia.com — DA 14 at #10.

Semantic/search-intent coverage used on the page:
- XML to Excel converter.
- XML to XLSX.
- XML file to Excel.
- import XML to Excel.
- XML records to rows.
- XML attributes to columns.
- nested XML flattening.
- XML table / spreadsheet output.
- real XLSX download.

Implementation requirement:
- Generate a real XLSX workbook, not a renamed text/HTML file.
- Detect repeated complex XML records.
- Flatten nested single objects with path-based columns.
- Preserve attributes with @-prefixed columns.
- Preserve repeated complex children as JSON text rather than silently dropping data.
- Keep scalar values as text by default; optional safe number/boolean inference.
- Browser-side XML parsing and preview.
- XLSX writer pinned to SheetJS CE browser build 0.20.3.

## HOLD — VCF to CSV

Evidence:
- Global ~2,400/month.
- US ~720/month, KD 5.
- UK/Canada/Australia each ~50/month with KD around 29–30.
- fileconverts.com DA 18 appears in the top 10.

Reason for hold:
- Valid US opportunity, but weaker Tier-1 breadth and lower primary demand than the two PASS pages.
- Keep in the research backlog; do not publish merely to increase page count.

## HOLD — XLSX to CSV

Evidence:
- excel xlsx to csv ~2,400 US/month, KD 6.
- Top 10 is dominated by higher-authority conversion and vendor sites.
- A DA 4 specialist appears only around #15.

Reason for hold:
- Keyword-difficulty score alone is not enough. Current top-10 SERP weakness does not meet the same standard as XML→Excel or TXT→CSV.

## REJECT FOR THIS BATCH — CSV to Excel

Evidence:
- csv to excel format ~3,600 US/month, KD 7.
- Top results are dominated by CloudConvert, Microsoft, FreeConvert, FCC, Convertio and YouTube.
- Lowest observed specialist authority was around DA 31 outside the strongest positions.

Reason for rejection:
- High volume does not override a strong SERP. Do not build this page in Batch 2 unless later SERP evidence changes or first-party Search Console data creates a strong reason.

## Release rule

A candidate page enters production code only when:
1. real tool intent is clear;
2. live keyword data is recorded;
3. SERP weakness is manually checked;
4. implementation can produce the promised output correctly;
5. the page can contain unique task-specific content rather than a template clone;
6. it connects naturally to the existing developer/data-conversion silo.
