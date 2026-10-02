#!/usr/bin/env python3
"""Version shared frontend assets and rewrite HTML references for CDN-safe deploys."""
from __future__ import annotations
import hashlib
import re
import sys
from pathlib import Path

def short_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]

def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: version-shared-assets.py <release-root>", file=sys.stderr)
        return 2
    root=Path(sys.argv[1]).resolve()
    theme=root/"assets/theme.js"
    styles=root/"assets/styles.css"
    catalog=root/"assets/tool-catalog.json"
    for path in (theme,styles,catalog):
        if not path.is_file():
            raise SystemExit(f"Missing shared asset: {path}")

    catalog_hash=short_hash(catalog)
    theme_text=theme.read_text(encoding="utf-8")
    theme_text=re.sub(
        r"(/assets/tool-catalog\.json\?v=)[^'\"]+",
        r"\g<1>"+catalog_hash,
        theme_text,
    )
    theme.write_text(theme_text, encoding="utf-8")

    theme_hash=short_hash(theme)
    style_hash=short_hash(styles)
    changed=0
    for path in root.rglob("*.html"):
        text=path.read_text(encoding="utf-8")
        updated=re.sub(r'(/assets/theme\.js)(?:\?v=[^"\']*)?', r'\1?v='+theme_hash, text)
        updated=re.sub(r'(/assets/styles\.css)(?:\?v=[^"\']*)?', r'\1?v='+style_hash, updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    print(f"Asset cache versions: theme={theme_hash} styles={style_hash} catalog={catalog_hash} html={changed}")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
