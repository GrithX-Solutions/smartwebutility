#!/usr/bin/env python3
"""Static SEO QA for Smart Web Utility.

Fails CI only for objective structural problems. Editorial heuristics are reported
as warnings so character-count folklore does not become a fake ranking rule.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://smartwebutility.com"

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts=[]
        self.in_title=False
        self.h1=0
        self.meta={}
        self.canonical=[]
        self.links=[]
        self.jsonld=[]
        self._json_script=False
        self._json_buf=[]
    def handle_starttag(self, tag, attrs):
        a={str(k).lower():(v or "") for k,v in attrs}
        tag=tag.lower()
        if tag=="title": self.in_title=True
        elif tag=="h1": self.h1+=1
        elif tag=="meta":
            key=(a.get("name") or a.get("property") or "").lower()
            if key: self.meta[key]=a.get("content","").strip()
        elif tag=="link" and "canonical" in a.get("rel","").lower().split():
            self.canonical.append(a.get("href","").strip())
        elif tag=="a" and a.get("href"):
            self.links.append(a["href"].strip())
        elif tag=="script" and a.get("type","").lower()=="application/ld+json":
            self._json_script=True; self._json_buf=[]
    def handle_endtag(self, tag):
        tag=tag.lower()
        if tag=="title": self.in_title=False
        elif tag=="script" and self._json_script:
            self.jsonld.append("".join(self._json_buf).strip())
            self._json_script=False; self._json_buf=[]
    def handle_data(self, data):
        if self.in_title: self.title_parts.append(data)
        if self._json_script: self._json_buf.append(data)

def expected_url(path: Path) -> str:
    rel=path.relative_to(ROOT).as_posix()
    if rel=="index.html": return BASE+"/"
    return BASE+"/"+rel[:-len("index.html")]

def target_exists(href: str, page: Path) -> bool:
    if not href or href.startswith(("#","mailto:","tel:","javascript:")):
        return True
    u=urllib.parse.urlsplit(href)
    if u.scheme in ("http","https"):
        if u.netloc.lower()!="smartwebutility.com": return True
        path=u.path
    elif u.scheme or u.netloc:
        return True
    else:
        if href.startswith("/"): path=u.path
        else:
            base="/" + page.relative_to(ROOT).parent.as_posix().strip("/") + "/"
            if base=="//": base="/"
            path=urllib.parse.urljoin(base,u.path)
    path=urllib.parse.unquote(path)
    if path=="/": candidate=ROOT/"index.html"
    elif path.endswith("/"): candidate=ROOT/path.lstrip("/")/"index.html"
    else: candidate=ROOT/path.lstrip("/")
    return candidate.exists()

def main() -> int:
    errors=[]
    warnings=[]
    pages={}
    canonicals={}
    for path in sorted(ROOT.glob("**/index.html")):
        if any(part.startswith(".") for part in path.parts):
            continue
        p=PageParser()
        try: p.feed(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.relative_to(ROOT)}: HTML parse failure: {exc}")
            continue
        rel=path.relative_to(ROOT).as_posix()
        title=re.sub(r"\s+"," ","".join(p.title_parts)).strip()
        desc=p.meta.get("description","")
        exp=expected_url(path)
        pages[exp]=path
        if not title: errors.append(f"{rel}: missing <title>")
        if not desc: errors.append(f"{rel}: missing meta description")
        if len(p.canonical)!=1: errors.append(f"{rel}: expected exactly one canonical, found {len(p.canonical)}")
        elif p.canonical[0]!=exp: errors.append(f"{rel}: canonical {p.canonical[0]!r} != expected {exp!r}")
        else:
            if exp in canonicals: errors.append(f"{rel}: duplicate canonical also used by {canonicals[exp]}")
            canonicals[exp]=rel
        if p.h1!=1: errors.append(f"{rel}: expected one H1, found {p.h1}")
        robots=p.meta.get("robots","").lower()
        if re.search(r"(^|[,\s])noindex([,\s]|$)",robots):
            errors.append(f"{rel}: public page carries noindex")
        for idx,raw in enumerate(p.jsonld,1):
            if not raw: continue
            try: json.loads(raw)
            except Exception as exc: errors.append(f"{rel}: invalid JSON-LD block {idx}: {exc}")
        for href in p.links:
            if not target_exists(href,path):
                errors.append(f"{rel}: broken internal link {href!r}")
        if title and not 30<=len(title)<=65:
            warnings.append(f"{rel}: editorial title-length review ({len(title)} chars)")
        if desc and not 90<=len(desc)<=170:
            warnings.append(f"{rel}: editorial description-length review ({len(desc)} chars)")
        for key in ("og:title","og:description","og:url"):
            if not p.meta.get(key): warnings.append(f"{rel}: missing optional social field {key}")
        if not p.meta.get("twitter:card"): warnings.append(f"{rel}: missing optional twitter:card")
        if not p.jsonld: warnings.append(f"{rel}: no JSON-LD block")

    sitemap=ROOT/"sitemap.xml"
    try:
        tree=ET.parse(sitemap)
        ns={"s":"http://www.sitemaps.org/schemas/sitemap/0.9"}
        listed={el.text.strip() for el in tree.findall(".//s:loc",ns) if el.text}
    except Exception as exc:
        errors.append(f"sitemap.xml: parse failure: {exc}")
        listed=set()
    for url in pages:
        if url not in listed: errors.append(f"sitemap.xml: public page missing: {url}")
    for url in listed:
        if url.startswith(BASE+"/") and url not in pages and not url.endswith((".xml",".txt")):
            errors.append(f"sitemap.xml: listed HTML URL has no index.html: {url}")

    print(f"SEO QA: {len(pages)} HTML pages, {len(errors)} errors, {len(warnings)} warnings")
    for item in warnings: print("WARN:",item)
    for item in errors: print("ERROR:",item,file=sys.stderr)
    return 1 if errors else 0

if __name__=="__main__":
    raise SystemExit(main())
