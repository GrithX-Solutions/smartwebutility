#!/usr/bin/env python3
"""Content-quality QA for Smart Web Utility.

This script enforces objective editorial guardrails. It deliberately does not
pretend to prove semantic completeness, competitor superiority, native-language
quality, or perfect grammar; those remain mandatory editorial review items in
CONTENT_QUALITY_STANDARD.md.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MIN_MAIN_WORDS = 120
MAX_PARAGRAPH_WORDS = 120
MIN_SECTION_HEADINGS = 2
LONG_SENTENCE_WARNING = 30
PASSIVE_WARNING_RATIO = 0.25

WORD_RE = re.compile(r"\b[A-Za-z0-9][A-Za-z0-9’'_-]*\b")
SENTENCE_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")
PASSIVE_RE = re.compile(
    r"\b(?:am|is|are|was|were|be|been|being)\s+"
    r"(?:\w+ly\s+)?\w+(?:ed|en)\b",
    re.IGNORECASE,
)
REPEATED_WORD_RE = re.compile(r"(?<![-’'])\b([A-Za-z]{3,})\s+\1\b", re.IGNORECASE)
SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+[,.!?;:](?=\s|$)")
DUPLICATE_PUNCT_RE = re.compile(r"(?:!!+|\?\?+|,,+|;;+)")
PLACEHOLDER_RE = re.compile(
    r"\b(?:TODO|TKTK|FIXME|coming soon|under construction)\b",
    re.IGNORECASE,
)


class ContentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.html_lang = ""
        self.in_main = False
        self.main_depth = 0
        self.skip_depth = 0
        self.current_p: list[str] | None = None
        self.inline_code_depth = 0
        self.main_text: list[str] = []
        self.paragraphs: list[str] = []
        self.section_headings = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = {str(k).lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.html_lang = a.get("lang", "").strip()
        if tag == "main":
            self.in_main = True
            self.main_depth = 1
            return
        if self.in_main:
            if tag in ("script", "style", "noscript", "svg"):
                self.skip_depth += 1
            elif tag == "main":
                self.main_depth += 1
            elif tag in ("h2", "h3") and self.skip_depth == 0:
                self.section_headings += 1
            elif tag == "p" and self.skip_depth == 0:
                self.current_p = []
                self.inline_code_depth = 0
            elif tag == "code" and self.skip_depth == 0 and self.current_p is not None:
                self.inline_code_depth += 1
                self.current_p.append("CODETOKEN")

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self.in_main:
            if tag in ("script", "style", "noscript", "svg") and self.skip_depth:
                self.skip_depth -= 1
            elif tag == "code" and self.inline_code_depth:
                self.inline_code_depth -= 1
            elif tag == "p" and self.current_p is not None:
                text = re.sub(r"\s+", " ", "".join(self.current_p)).strip()
                if text:
                    self.paragraphs.append(text)
                self.current_p = None
                self.inline_code_depth = 0
            elif tag == "main":
                self.main_depth -= 1
                if self.main_depth <= 0:
                    self.in_main = False

    def handle_data(self, data):
        if not self.in_main or self.skip_depth:
            return
        if self.current_p is not None and not self.inline_code_depth:
            self.current_p.append(data)
        self.main_text.append(data)


def words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    return [s.strip() for s in SENTENCE_RE.split(cleaned) if words(s)]


def is_search_targeted(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return rel not in {
        "about/index.html",
        "contact/index.html",
        "privacy/index.html",
        "terms/index.html",
    }


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    pages = 0

    for path in sorted(ROOT.glob("**/index.html")):
        if any(part.startswith(".") for part in path.parts):
            continue
        rel = path.relative_to(ROOT).as_posix()
        html = path.read_text(encoding="utf-8", errors="replace")

        parser = ContentParser()
        try:
            parser.feed(html)
        except Exception as exc:
            errors.append(f"{rel}: HTML parse failure during content QA: {exc}")
            continue

        pages += 1
        main_text = re.sub(r"\s+", " ", " ".join(parser.main_text)).strip()
        main_words = words(main_text)

        if not parser.html_lang:
            errors.append(f"{rel}: missing html lang attribute")
        elif not parser.html_lang.lower().startswith("en"):
            warnings.append(
                f"{rel}: non-English lang={parser.html_lang!r}; native-language editorial QA required"
            )

        if not main_text:
            errors.append(f"{rel}: no readable <main> content")
            continue

        if len(main_words) < MIN_MAIN_WORDS:
            errors.append(
                f"{rel}: only {len(main_words)} readable words in <main>; "
                f"below internal publisher-content floor {MIN_MAIN_WORDS}"
            )

        if parser.section_headings < MIN_SECTION_HEADINGS:
            errors.append(
                f"{rel}: only {parser.section_headings} H2/H3 headings; "
                "content is not sufficiently structured for scanning"
            )

        for idx, paragraph in enumerate(parser.paragraphs, 1):
            count = len(words(paragraph))
            if count > MAX_PARAGRAPH_WORDS:
                errors.append(
                    f"{rel}: paragraph {idx} has {count} words; "
                    f"split paragraphs above {MAX_PARAGRAPH_WORDS} words"
                )
            if REPEATED_WORD_RE.search(paragraph):
                errors.append(f"{rel}: paragraph {idx} contains a repeated word")
            if SPACE_BEFORE_PUNCT_RE.search(paragraph):
                errors.append(f"{rel}: paragraph {idx} contains whitespace before punctuation")
            if DUPLICATE_PUNCT_RE.search(paragraph):
                errors.append(f"{rel}: paragraph {idx} contains duplicated punctuation")

        if rel != "lorem-ipsum-generator/index.html" and PLACEHOLDER_RE.search(main_text):
            errors.append(f"{rel}: contains placeholder/unfinished-content wording")

        page_sentences = sentences(" ".join(parser.paragraphs))
        sentence_lengths = [len(words(s)) for s in page_sentences if words(s)]
        if sentence_lengths:
            avg = sum(sentence_lengths) / len(sentence_lengths)
            if avg > LONG_SENTENCE_WARNING:
                warnings.append(
                    f"{rel}: average prose sentence length is {avg:.1f} words; readability review"
                )

            passive_hits = sum(1 for s in page_sentences if PASSIVE_RE.search(s))
            ratio = passive_hits / len(page_sentences)
            if ratio > PASSIVE_WARNING_RATIO:
                warnings.append(
                    f"{rel}: passive-voice heuristic matched {ratio:.0%} of prose sentences; "
                    "manual active-voice review required"
                )

        if is_search_targeted(path) and len(main_words) < 400:
            warnings.append(
                f"{rel}: compact search-facing page ({len(main_words)} words); "
                "confirm semantic and live-SERP coverage without padding"
            )

    print(
        f"Content QA: {pages} HTML pages, {len(errors)} errors, {len(warnings)} warnings"
    )
    for item in warnings:
        print("WARN:", item)
    for item in errors:
        print("ERROR:", item, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
