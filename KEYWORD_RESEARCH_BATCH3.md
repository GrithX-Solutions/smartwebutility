# Batch 3 Keyword & SERP Evidence — Encoding / Translation Utilities

Research date: 2026-10-02
Primary market: United States (English)
Secondary checks: United Kingdom, Canada, Australia

Provider search-volume and difficulty figures are estimates, not guaranteed traffic or rankings. A page is implemented only when the query has clear interactive intent, SERP evidence supports a realistic entry path, and the promised functionality can be built honestly in the browser.

## PASS — Morse Code Translator with Sound

Primary query: **morse code translator with sound**

Provider estimates:
- Global search volume: ~12,100/month.
- US: ~4,400/month, KD 6, CPC ~$2.46.
- Australia: ~260/month, KD 5.
- UK: ~720/month, KD 26.
- Canada: ~390/month, KD 36.

This is treated as a US/Australia-led low-difficulty opportunity. UK and Canada were explicitly observed at higher difficulty.

SERP weakness observed:
- themorselab.com — DA 13 at #4.
- morsecodeapp.com — DA 10 at #6.
- morsehub.com — DA 14 at #7.
- morsecodeninja.com — DA 14 around #11.
- Search results include Reddit and app listings, showing mixed tool/discussion/app intent.

Semantic/search-intent coverage used on the page:
- Morse code translator with sound.
- text to Morse code.
- Morse code to text / English characters.
- Morse code decoder / encoder.
- dots and dashes translator.
- Morse audio playback.
- Morse code copy and paste.
- Morse code numbers and punctuation.
- WPM playback speed.
- tone frequency.

Implementation requirement:
- Translate text to Morse and Morse back to text.
- Use International Morse mappings for A–Z, 0–9 and common punctuation.
- Report unsupported characters/sequences instead of silently deleting them.
- Generate real browser audio with the Web Audio API.
- Use standard relative timing: dot 1 unit, dash 3, intra-character 1, letter gap 3, word gap 7.
- Adjustable WPM and frequency.
- Limit excessively long playback.
- Explicitly state that the page generates audio but does not decode microphone/audio files.

## PASS — Hex / ASCII conversion

Primary query family:
- ascii hex to ascii — ~40,500 global and ~9,900 US/month, KD 7.
- hex to ascii conversion — ~2,400 global; US ~1,600/KD5, UK ~390/KD5, Canada ~170/KD5, Australia ~140/KD5.
- ascii to hex conversion — ~590 US/month, KD 5, with smaller low-KD secondary-market demand.

SERP evidence:
- neapay.com — DA 19 around #3.
- hexcalculator.org — DA 19 around #15.
- The SERP also includes established reference/conversion sites and an AI overview, so this is not treated as a guaranteed easy rank.

Implementation decision:
- Build one bidirectional /hex-to-ascii/ page instead of separate doorway pages.
- Strict 7-bit ASCII mode plus optional UTF-8 mode.
- Accept continuous hex and common byte separators/0x prefixes.
- Reject invalid or odd-length hex rather than guessing.
- ASCII mode rejects bytes above 0x7F; UTF-8 mode validates UTF-8 byte sequences.
- Text→hex supports spaced, continuous and 0x-prefixed output plus case control.
- Non-printable ASCII control bytes remain visible as escapes rather than silently disappearing.

## PASS — Binary to Text / Text to Binary

Primary query: **binary to text conversion**

Provider estimates:
- Global search volume: ~2,900/month.
- US: ~1,000/month, KD 5.
- UK: ~210/month, KD 5.
- Canada: ~140/month, KD 5.
- Australia: ~110/month, KD 5.

SERP evidence:
- binarytotext.net — DA 26 at #2.
- apivoid.com — DA 22 around #10.
- binarytotext.ai — DA 11 around #13.
- Results also include tool/reference domains and some video content; no AI overview was observed in this checked SERP.

Implementation decision:
- Build one bidirectional /binary-to-text/ page rather than separate Binary→Text and Text→Binary URLs.
- Parse only complete 8-bit bytes; never auto-pad incomplete bit strings.
- Strict ASCII mode rejects values above 0x7F.
- Optional UTF-8 mode validates UTF-8 byte sequences.
- Text→binary supports spaced, continuous and 0b-prefixed output.
- Non-printable ASCII controls remain visible as escapes rather than silently disappearing.
- The page explicitly does not claim numeric-base, file or executable-code decoding.

## REJECT FOR CURRENT BATCH — Decimal / Binary conversion

Evidence:
- decimal to binary number conversion — ~3,600 US/month, KD 6.
- conversion binary to decimal — ~1,600 US/month, KD 5.
- Top results are dominated by established education/conversion domains and multiple video results.
- AI overview is present.

Decision:
- Low provider KD does not override authority-heavy/zero-click SERP conditions. Do not build in this batch.
