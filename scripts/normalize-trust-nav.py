#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
TRUST='<div class="footer-links"><a href="/about/">About</a><a href="/methodology/">Methodology</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a><a href="/sitemap.xml">Sitemap</a></div>'
pat=re.compile(r'<div class="footer-links">.*?</div>(?=</div></footer>)',re.S)
changed=0
checked=0
for path in sorted(ROOT.glob("**/index.html")):
    if ".git" in path.parts:
        continue
    checked+=1
    src=path.read_text(encoding="utf-8")
    if '<footer' not in src:
        continue
    if not pat.search(src):
        raise SystemExit(f"Footer links block not found: {path.relative_to(ROOT)}")
    out=pat.sub(TRUST,src,count=1)
    if out!=src:
        path.write_text(out,encoding="utf-8")
        changed+=1
print(f"Trust navigation normalized: {checked} HTML pages checked, {changed} updated")
