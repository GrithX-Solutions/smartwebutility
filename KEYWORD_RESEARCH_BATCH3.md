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

## HOLD — Hex / ASCII conversion

Evidence:
- ascii hex to ascii — ~9,900 US/month, KD 7.
- hex to ascii conversion — ~1,600 US/month, KD 5.
- neapay.com (DA 19) appeared around #3; hexcalculator.org (DA 19) around #15.
- SERP also contains an AI overview plus several established conversion/reference sites.

Decision:
- Valid query family, but weaker top-10 gap than Morse. Hold until the current higher-confidence batch is complete.

## REJECT FOR CURRENT BATCH — Decimal / Binary conversion

Evidence:
- decimal to binary number conversion — ~3,600 US/month, KD 6.
- conversion binary to decimal — ~1,600 US/month, KD 5.
- Top results are dominated by established education/conversion domains and multiple video results.
- AI overview is present.

Decision:
- Low provider KD does not override authority-heavy/zero-click SERP conditions. Do not build in this batch.
