#!/usr/bin/env python3
"""AdSense-readiness heuristic for SmartWebUtility.

This is not a Google approval predictor and does not encode fake minimum word-count
rules. It flags objective trust/structure problems and prioritizes pages with less
publisher-authored context for manual review.
"""
from __future__ import annotations
import re, json
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
TRUST_PATHS={"/about/","/privacy/","/terms/","/contact/","/methodology/"}
TOOL_MARKERS=("tool-shell","tool-card","tool-panel","generator","checker","counter","formatter","tester","converter","decoder","encoder")

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title=[]; self.in_title=False; self.in_script=False; self.in_style=False
        self.text=[]; self.desc=""; self.canonical=""; self.links=[]; self.ids=set(); self.classes=[]
    def handle_starttag(self,tag,attrs):
        a={k:(v or "") for k,v in attrs}; tag=tag.lower()
        if tag=="title": self.in_title=True
        elif tag=="script": self.in_script=True
        elif tag=="style": self.in_style=True
        elif tag=="meta" and a.get("name","").lower()=="description": self.desc=a.get("content","").strip()
        elif tag=="link" and "canonical" in a.get("rel","").lower().split(): self.canonical=a.get("href","").strip()
        elif tag=="a" and a.get("href"): self.links.append(a["href"])
        if a.get("id"): self.ids.add(a["id"])
        if a.get("class"): self.classes.extend(a["class"].split())
    def handle_endtag(self,tag):
        tag=tag.lower()
        if tag=="title": self.in_title=False
        elif tag=="script": self.in_script=False
        elif tag=="style": self.in_style=False
    def handle_data(self,d):
        if self.in_title:self.title.append(d)
        if not self.in_script and not self.in_style:self.text.append(d)

def words(s): return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’.-]*",s)

def main():
    rows=[]
    for path in sorted(ROOT.glob("**/index.html")):
        if ".git" in path.parts: continue
        p=P(); raw=path.read_text(encoding="utf-8"); p.feed(raw)
        rel=path.relative_to(ROOT).as_posix()
        url="/" if rel=="index.html" else "/"+rel[:-len("index.html")]
        visible=" ".join(p.text)
        wc=len(words(visible))
        trust=sum(1 for t in TRUST_PATHS if any((h==t or h.endswith(t)) for h in p.links))
        internal=sum(1 for h in p.links if h.startswith("/"))
        placeholders=[x for x in ("lorem ipsum","coming soon","under construction","todo","placeholder") if x in visible.lower()]
        structural=[]
        if not "".join(p.title).strip(): structural.append("missing-title")
        if not p.desc: structural.append("missing-description")
        if not p.canonical: structural.append("missing-canonical")
        if trust<4: structural.append("weak-trust-navigation")
        if internal<3: structural.append("weak-internal-linking")
        if placeholders: structural.append("placeholder-content")
        is_tool=any(m in (" ".join(p.classes)+" "+rel).lower() for m in TOOL_MARKERS)
        # Internal prioritization only; Google publishes no minimum word count.
        if structural:
            bucket="HIGH-PRIORITY"
        elif is_tool and wc<350:
            bucket="REVIEW"
        elif (not is_tool) and wc<450 and "/guides/" in url:
            bucket="REVIEW"
        else:
            bucket="READY-CANDIDATE"
        rows.append(dict(url=url,words=wc,is_tool=is_tool,trust_links=trust,internal_links=internal,bucket=bucket,issues=structural))
    counts={k:sum(r["bucket"]==k for r in rows) for k in ("READY-CANDIDATE","REVIEW","HIGH-PRIORITY")}
    print("AdSense readiness heuristic (not an approval prediction)")
    print(json.dumps(counts,sort_keys=True))
    for r in sorted(rows,key=lambda x:({"HIGH-PRIORITY":0,"REVIEW":1,"READY-CANDIDATE":2}[x["bucket"]],x["words"])):
        print(f'{r["bucket"]:15} {r["words"]:4} words  trust={r["trust_links"]} internal={r["internal_links"]:2}  {r["url"]}  {",".join(r["issues"]) or "-"}')
    return 1 if counts["HIGH-PRIORITY"] else 0

if __name__=="__main__": raise SystemExit(main())
