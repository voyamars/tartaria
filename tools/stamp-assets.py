#!/usr/bin/env python3
"""Cache-busting: one predictable version for every local CSS/JS reference.

    python3 tools/stamp-assets.py

The version is a short hash of the CONTENT of all local .css/.js files, so it changes if (and only if) an asset
changes. Every <link>/<script> that points at a local .css/.js gets '?v=<hash>' in every .html file (and any older
?v= value is replaced). Run it before each deploy; verifies that each referenced file exists.
"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _version import ROOT, site_files, asset_version

files = site_files()
ver = asset_version(files)

ref = re.compile(r'((?:href|src)=")(/[^"?#:]+?\.(?:css|js))(?:\?v=[^"]*)?(")')
bad = []
for page in (p for p in files if p.suffix == ".html"):
    txt = page.read_text(encoding="utf-8")
    def sub(m):
        if not (ROOT / m.group(2).lstrip("/")).is_file():
            bad.append((page.relative_to(ROOT).as_posix(), m.group(2)))
        return f"{m.group(1)}{m.group(2)}?v={ver}{m.group(3)}"
    new = ref.sub(sub, txt)
    if new != txt:
        page.write_text(new, encoding="utf-8")
print("version", ver)
if bad:
    print("MISSING:", *bad, sep="\n  "); sys.exit(1)
