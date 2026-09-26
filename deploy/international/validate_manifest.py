#!/usr/bin/env python3
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / 'locales.json').read_text(encoding='utf-8'))
locales = data.get('locales', {})

required = {'en','de','es','fr','nl','ar'}
missing = required - set(locales)
if missing:
    raise SystemExit(f'Missing locales: {sorted(missing)}')

prefixes = [cfg['prefix'] for cfg in locales.values()]
if len(prefixes) != len(set(prefixes)):
    raise SystemExit('Locale prefixes must be unique')

if locales['ar'].get('direction') != 'rtl':
    raise SystemExit('Arabic must be configured as rtl')

if data.get('sourceLocale') != 'en':
    raise SystemExit('English must remain the source locale in phase 1')

if data.get('xDefaultLocale') != 'en':
    raise SystemExit('x-default must point to English in phase 1')

published = data.get('publishedPages', {})
for key, cluster in published.items():
    if 'en' not in cluster:
        raise SystemExit(f'{key}: every published hreflang cluster needs an English source URL')
    for code, url in cluster.items():
        if code not in locales:
            raise SystemExit(f'{key}: unknown locale {code}')
        expected = locales[code]['prefix']
        path = '/' + url.split('smartwebutility.com/', 1)[-1]
        if code != 'en' and not path.startswith(expected):
            raise SystemExit(f'{key}/{code}: URL does not use locale prefix {expected}')

print(f"International locale manifest valid: {len(locales)} locales, {len(published)} published clusters")
