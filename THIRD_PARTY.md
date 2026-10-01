# Third-Party Browser Dependencies

Updated: 2026-10-02

Smart Web Utility prefers native browser APIs. When a specialized format requires a third-party library, the dependency must be pinned and documented.

## SheetJS Community Edition

Used by: /xml-to-excel/ and /json-to-excel/ for writing real XLSX workbooks in the browser.

- Project: SheetJS Community Edition
- Pinned browser version: 0.20.3
- Browser source: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
- License: Apache License 2.0
- Purpose: create the downloadable XLSX workbook after XML has been parsed and flattened locally.

The XML payload is not sent to a Smart Web Utility conversion API. The browser loads the pinned library from the SheetJS CDN; normal network metadata for that script request is therefore visible to the CDN provider.

Before a future production release, consider vendoring the pinned browser file into the repository if bundle size and licensing-notice handling are acceptable. Vendoring is preferred by SheetJS documentation for general stability, but it is not required for the current repository-only prototype to function.
