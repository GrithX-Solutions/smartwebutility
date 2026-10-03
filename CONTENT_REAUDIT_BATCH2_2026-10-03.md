# Content Re-Audit Batch 2 — 2026-10-03

Market: United States, English  
Ubersuggest location: United States (`locId 2840`)  
Scope: compact search-facing warning queue from `scripts/content-quality-qa.py`

## Decision summary

This batch reviews five compact-warning pages. It changes three pages where current demand, SERP composition and product gaps justify work:

- `/yaml-to-json/` — REWRITE + FUNCTIONAL UPGRADE
- `/json-to-yaml/` — REWRITE + FUNCTIONAL UPGRADE
- `/base64-encoder-decoder/` — REWRITE + FUNCTIONAL UPGRADE
- `/password-generator/` — NO CONTENT EXPANSION IN THIS BATCH
- `/text-tools/` — NO CONTENT EXPANSION IN THIS BATCH

No new URLs are created. Existing canonical intent owners remain unchanged.

## Ubersuggest demand and difficulty

### YAML to JSON

Primary cluster:
- `yaml to json`: 1,600 US searches/month, SD 23
- `yaml to json convert`: 720, SD 7, CPC $5.58
- `yaml to json converter`: 480, SD 21
- `yaml to json conversion`: 320, SD 6
- `convert yaml to json`: 320, SD 29
- `yaml to json converter online`: 90, SD 28

Current Ubersuggest SERP:
- OnlineYAMLTools ranks #1 for `yaml to json`; Ubersuggest reports page authority 38 and 167 referring domains for that URL.
- Lower-authority results are also present, including Dadroit in the top three in the Ubersuggest snapshot.

Observed competitor capabilities from the current SERP/web review:
- multi-document YAML handling;
- configurable JSON formatting;
- local browser processing;
- parser errors;
- explicit comments/anchors/type limitations.

Gap in Smart Web Utility before this batch:
- single-document parsing only;
- fixed two-space JSON indentation;
- compact explanation of YAML-specific loss/normalization behavior.

Implementation:
- parse YAML with `jsyaml.loadAll()`;
- one YAML document -> one JSON value;
- multiple YAML documents -> top-level JSON array in source order;
- 2- or 4-space JSON indentation;
- explicit comments/anchors/tags/mapping-key/schema limitations;
- browser/file privacy disclosure.

### JSON to YAML

Primary cluster:
- `json to yaml`: 1,300 US searches/month, SD 35, CPC $11.31
- `json to yaml conversion`: 590, SD 6, CPC $4.67
- `json to yaml converter`: 480, SD 28
- `convert json to yaml`: 320, SD 34
- `online json to yaml converter`: 260, SD 25

Current Ubersuggest SERP:
- BairesDev ranks #1 in the current snapshot.
- OnlineYAMLTools ranks in the top three with domain authority 28.
- Jam.dev and other mid-authority utility pages also rank in the top ten.

Observed competitor capabilities:
- bidirectional conversion on some tools;
- indentation controls;
- local/browser conversion;
- explicit format and privacy explanations.

Cannibalization decision:
- keep `/json-to-yaml/` and `/yaml-to-json/` separate because the direction changes the primary task and limitations.
- link the two pages directly rather than merging them into one ambiguous canonical URL.

Gap in Smart Web Utility before this batch:
- fixed YAML indentation;
- limited explanation of invalid JSON, ambiguous scalar serialization and schema boundaries.

Implementation:
- 2- or 4-space YAML indentation;
- clearer invalid-JSON behavior;
- clearer type, quoting, comment and domain-schema limitations;
- links to JSON Formatter and YAML Formatter for the next validation step.

### Base64 Encoder / Decoder

Relevant cluster:
- `base64 encoder decoder`: 260 US searches/month, SD 29
- `base64 encoder/decoder`: 260, SD 18
- `base64 encoder decoder online`: 5,400, SD 42
- `base64 decoder`: 74,000, SD 31
- Ubersuggest competitor keyword data also shows combined encoder/decoder variants around the same bidirectional intent.

Current Ubersuggest SERP includes low/mid-authority tools such as phcode.io (DA 26) alongside stronger brands.

Current web-result feature pattern:
- UTF-8 text support;
- Base64URL;
- local/browser processing;
- file-to-Base64 workflows on multiple competitors;
- explanation of padding and the Base64URL alphabet.

Gap in Smart Web Utility before this batch:
- text-only encoding;
- no local binary-file encoding path;
- limited explanation of decoder boundaries for binary data.

Implementation:
- local file-to-Base64 encoding up to 5 MB;
- file bytes are encoded directly, not treated as UTF-8;
- Base64URL output for files;
- decoder remains intentionally UTF-8-text-only and rejects arbitrary binary decoded bytes;
- RFC 4648 reference and explicit padding/alphabet guidance.

## No-change decisions

### Password Generator

Ubersuggest:
- `password generator`: 246,000 US searches/month, SD 70.
- Current top results are dominated by LastPass, 1Password, Norton, ESET, Bitwarden, RoboForm, Avast, F-Secure and Proton, with domain authority generally in the 66–91 range.

Decision:
- do not pad the page to clear a compact-content warning.
- the existing page already documents Web Crypto generation, uniqueness, password-manager use, MFA and local processing.
- future work should target a demonstrated product gap or attainable long-tail intent, not the authority-heavy head term.

### Text Tools hub

Ubersuggest:
- `text tools`: 720 US searches/month, SD 78, navigational intent.

Decision:
- do not expand the category hub merely to chase the phrase `text tools`.
- the hub's primary job is navigation/discovery across dedicated canonical tool pages.
- improve the hub when the actual tool inventory or user navigation requires it.

## Semantic briefs

### /yaml-to-json/

Primary intent: convert YAML data to JSON.

Secondary terms:
- YAML to JSON converter
- convert YAML to JSON
- YAML JSON converter
- YAML to JSON conversion

Entities/concepts:
- YAML
- JSON
- mappings
- sequences
- scalar values
- multi-document stream
- `---` document separator
- comments
- anchors and aliases
- tags
- indentation
- parser errors
- application/schema validation
- js-yaml
- browser file APIs

Questions:
- Does it preserve comments?
- What happens to multiple YAML documents?
- Can YAML arrays convert to JSON arrays?
- Can output use 4-space indentation?
- Is input uploaded?

### /json-to-yaml/

Primary intent: convert valid JSON data to YAML.

Secondary terms:
- JSON to YAML converter
- JSON to YAML conversion
- convert JSON to YAML
- online JSON to YAML converter

Entities/concepts:
- JSON parser
- YAML serializer
- objects/mappings
- arrays/sequences
- strings
- numbers
- booleans
- null
- comments
- trailing commas
- quoting
- indentation
- OpenAPI
- Kubernetes
- schema validation

Questions:
- Are arrays preserved?
- Can output use 4-space indentation?
- Are comments preserved?
- Does this validate OpenAPI/Kubernetes?
- Can the result be downloaded?

### /base64-encoder-decoder/

Primary intent: encode and decode Base64/Base64URL data in one workflow.

Secondary terms:
- Base64 encoder
- Base64 decoder
- Base64 encoder decoder
- Base64URL
- Base64 file encoder

Entities/concepts:
- RFC 4648
- UTF-8
- bytes
- standard Base64 alphabet
- URL-safe alphabet
- padding
- binary files
- JWT
- API payloads
- invalid Base64
- text vs binary decode

Questions:
- Can files be encoded?
- Can Base64 decode to a binary file?
- What is Base64URL?
- Is padding required?
- Is Base64 encryption?
- Is data uploaded?

## Competitor-gap conclusion

This batch does not claim sitewide superiority. It closes specific, observed gaps with working functionality and precise interpretation. The strongest opportunity is YAML-to-JSON because Ubersuggest shows meaningful US volume with several low-difficulty variants and a SERP that includes attainable utility domains.

Sources reviewed on 2026-10-03:
- Ubersuggest keyword overview, keyword matching, SERP analysis, page overview and page keyword data for the US market.
- Current SERP/web samples including OnlineYAMLTools, Dadroit, BairesDev, jsonfmt.dev, yamltojsonfree.com, Clean.tools, JSONRender, Delimiter.live, ToolNinja, 712 Tools, Base64 Studio and similar relevant utility results.
- RFC 4648 for Base64/Base64URL semantics.
