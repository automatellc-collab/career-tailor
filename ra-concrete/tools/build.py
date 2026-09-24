"""Build step to run after any change to the site:

    python3 tools/build.py

1. Stamps every local asset link in index.html and brand.html with a
   content hash (styles.css?v=1a2b3c4d), so browsers fetch a changed file
   immediately instead of reusing an old cached copy.
2. Regenerates es/index.html from index.html (tools/build_es.py).
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "brand.html"]
ASSET_RE = re.compile(r'(assets/[\w./-]+\.(?:css|js|svg|png|jpg|woff2))(?:\?v=[0-9a-f]+)?')


def file_hash(rel):
    return hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:8]


def stamp(page):
    path = ROOT / page
    html = path.read_text()

    def sub(m):
        rel = m.group(1)
        if not (ROOT / rel).exists():
            sys.exit(f"{page}: missing asset {rel}")
        return f"{rel}?v={file_hash(rel)}"

    new = ASSET_RE.sub(sub, html)
    if new != html:
        path.write_text(new)
    print(f"stamped {page}")


if __name__ == "__main__":
    for page in PAGES:
        stamp(page)
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import build_es  # noqa: E402

    build_es.main()
