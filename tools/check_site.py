"""Pre-deploy check for site/: broken local links/assets, leftover template placeholders,
missing <title>/<h1>, and missing deploy files. Exits 1 on any error.

Usage:  python tools/check_site.py
"""
import glob, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "site"))
errors, warnings = [], []

for f in sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)):
    rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
    s = open(f, encoding="utf-8").read()
    if "{P}" in s:
        errors.append(f"{rel}: unreplaced {{P}} placeholder")
    if not re.search(r"<title>[^<]+</title>", s):
        errors.append(f"{rel}: missing <title>")
    if len(re.findall(r"<h1\b", s)) != 1 and rel != "order-confirmation.html":
        warnings.append(f"{rel}: {len(re.findall(r'<h1', s))} <h1> elements")
    for url in re.findall(r'\b(?:href|src|action)="([^"]+)"', s):
        if url.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:")) or "${" in url:
            continue
        path = url.split("#")[0].split("?")[0]
        if not path:
            continue
        target = os.path.join(ROOT, path.lstrip("/")) if path.startswith("/") else os.path.join(os.path.dirname(f), path)
        if not os.path.exists(os.path.normpath(target)):
            errors.append(f"{rel}: broken link -> {url}")

for need in ("index.html", "404.html", "robots.txt", "sitemap.xml", "favicon.ico", "assets/og-image.png"):
    if not os.path.exists(os.path.join(ROOT, need)):
        errors.append(f"missing {need}")

todo = sum(open(f, encoding="utf-8", errors="ignore").read().count("TODO") for f in glob.glob(os.path.join(ROOT, "**", "*.*"), recursive=True))
pages = len(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))
for w in warnings:
    print("warning:", w)
for e in errors:
    print("ERROR:", e)
print(f"{pages} pages checked — {len(errors)} errors, {len(warnings)} warnings, {todo} TODO notes left in site/")
sys.exit(1 if errors else 0)
