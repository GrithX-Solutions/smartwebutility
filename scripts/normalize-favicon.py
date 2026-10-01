#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
VERSION="v5"
ICON='/favicon-sw-v5.svg?v=20261001e'
ICON_TAG=f'<link rel="icon" href="{ICON}" type="image/svg+xml" sizes="any">'

files=[p for p in ROOT.glob("**/index.html") if ".git" not in p.parts]
not_found=ROOT/"404.html"
if not_found.exists():
    files.append(not_found)

icon_re=re.compile(r'<link\s+rel=["\'](?:icon|shortcut icon)["\'][^>]*>',re.I)
changed=0
for path in files:
    src=path.read_text(encoding="utf-8")
    out=icon_re.sub("",src)
    # Put the normalized favicon immediately before the first site JS/CSS/manifest link.
    marker='<script src="/assets/theme.js"></script>'
    if marker in out:
        out=out.replace(marker,ICON_TAG+marker,1)
    else:
        manifest='<link rel="manifest" href="/site.webmanifest">'
        if manifest in out:
            out=out.replace(manifest,ICON_TAG+manifest,1)
        elif '</head>' in out:
            out=out.replace('</head>',ICON_TAG+'</head>',1)
        else:
            raise SystemExit(f"No head insertion point: {path.relative_to(ROOT)}")
    if out!=src:
        path.write_text(out,encoding="utf-8")
        changed+=1
print(f"Favicon references normalized: {len(files)} HTML files checked, {changed} updated; {ICON}")
