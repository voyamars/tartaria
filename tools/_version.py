"""Shared by stamp-assets.py and build-investment.py: the content-hash version of all local CSS/JS."""
import hashlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {"_private", "tools", "_source", ".git", "node_modules"}

def site_files():
    return [p for p in ROOT.rglob("*") if p.is_file() and not (set(p.relative_to(ROOT).parts) & SKIP)]

def asset_version(files=None):
    h = hashlib.sha256()
    for p in sorted(p for p in (files or site_files()) if p.suffix in (".css", ".js")):
        h.update(p.relative_to(ROOT).as_posix().encode()); h.update(p.read_bytes())
    return h.hexdigest()[:10]
