"""Generate site/js/catalog.js from a Shopify collection's public products.json.

Usage:  python tools/build_catalog.py [collection-handle]
Images stay as live CDN links (placeholders until Craft by Payal's own photography exists).
Filter facets (occasion, theme, size, lighting) are derived from real tags, titles and variant options.
"""
import json, os, re, sys, urllib.request

HANDLE = sys.argv[1] if len(sys.argv) > 1 else "miniature-frame"
SRC = f"https://craftingtale.com/collections/{HANDLE}/products.json?limit=250"
OUT = os.path.join(os.path.dirname(__file__), "..", "site", "js", "catalog.js")
FULL = os.path.join(os.path.dirname(__file__), "data", "catalog-full.json")  # gallery + variants, used by build_pages.py
# Reference-store info graphics (size charts, upload instructions with their contact details) — never show these.
EXCLUDE = set(json.load(open(os.path.join(os.path.dirname(__file__), "data", "exclude-images.json"))))

SMALL = {"of", "the", "and", "a", "to", "for", "in", "on", "cum"}

def nice_title(t):
    t = re.sub(r'["“”]', "", t).replace("|", "–")
    t = re.sub(r"\s+", " ", t).strip(" -–")
    words = []
    for i, w in enumerate(t.split(" ")):
        lw = w.lower()
        if i and lw in SMALL:
            words.append(lw)
        elif re.fullmatch(r"\d+", w):
            words.append(w)
        else:
            words.append(lw[:1].upper() + lw[1:])
    t = " ".join(words)
    return re.sub(r"\s-\s+", " – ", t).replace("'S ", "'s ")

OCCASIONS = [
    ("Anniversary", lambda tags, t: "anniversary" in tags),
    ("Wedding & Engagement", lambda tags, t: "wedding" in tags or "engagement" in t),
    ("Birthday", lambda tags, t: "birthday" in tags or "celebration" in t),
    ("Valentine's", lambda tags, t: "valentine" in tags or "love" in t or "heart" in t),
    ("Baby & Kids", lambda tags, t: re.search(r"baby|kids|parents|newborn", t)),
    ("Mother's & Father's Day", lambda tags, t: {"mother", "father"} & tags or "mother" in t or "father" in t),
    ("Festive", lambda tags, t: {"rakhi", "christmas"} & tags or "christmas" in t),
    ("House Warming", lambda tags, t: re.search(r"\bhome\b|living room|key holder", t)),
]
THEMES = [
    ("Couple", lambda t: re.search(r"wedding|engagement|love|heart|museum of us|happy place|sofa", t)),
    ("Family", lambda t: re.search(r"family|home|baby|kids|parents|mother|father", t)),
    ("Profession", lambda t: re.search(r"teacher|doctor|office|corporate|baker|graduation", t)),
    ("Personal Corner", lambda t: re.search(r"happy corner|library|traveller", t)),
    ("Celebration", lambda t: re.search(r"celebration|classical|christmas", t)),
]

def sizes(p):
    out = set()
    for v in p["variants"]:
        for o in (v.get("option1"), v.get("option2"), v.get("option3")):
            m = re.search(r"(\d+)\s*\*\s*(\d+)", o or "")
            if m:
                out.add(f"{m.group(1)}×{m.group(2)} in")
    return sorted(out, key=lambda s: [int(x) for x in re.findall(r"\d+", s)])

def lighting(p):
    vals = " ".join(str(v.get(k) or "") for v in p["variants"] for k in ("option1", "option2", "option3")).lower()
    out = []
    if re.search(r"(?<!out )with ?light", vals): out.append("With light")
    if "without light" in vals: out.append("Without light")
    return out

def variant_info(v):
    raw = " ".join(str(v.get(k) or "") for k in ("option1", "option2", "option3"))
    m = re.search(r"(\d+)\s*\*\s*(\d+)", raw)
    low = raw.lower()
    light = "Without light" if "without light" in low else ("With light" if re.search(r"with ?light", low) else None)
    return {"size": f"{m.group(1)}×{m.group(2)} in" if m else None, "light": light,
            "price": int(float(v["price"])), "available": bool(v["available"])}


def main():
    req = urllib.request.Request(SRC, headers={"User-Agent": "Mozilla/5.0"})
    data = json.load(urllib.request.urlopen(req, timeout=30))["products"]
    items, full = [], []
    for i, p in enumerate(data):
        tags = {t.lower() for t in p["tags"]}
        t = p["title"].lower()
        prices = [float(v["price"]) for v in p["variants"]]
        photos = [im["src"] for im in p["images"][:10] if im["src"].split("?")[0] not in EXCLUDE]  # first 10 were screened
        imgs = photos[:2]
        name = nice_title(p["title"])
        items.append({
            "id": p["handle"],
            "name": name,
            "price": int(min(prices)),
            "priceFrom": len(set(prices)) > 1,
            "compareAt": None,
            "inStock": any(v["available"] for v in p["variants"]),
            "image": imgs[0] if imgs else "",
            "image2": imgs[1] if len(imgs) > 1 else None,
            "alt": f"{name} – handmade personalised miniature frame",
            "isNew": "new" in tags,
            "created": p["created_at"][:10],
            "order": i,
            "occasion": [n for n, f in OCCASIONS if f(tags, t)],
            "theme": [n for n, f in THEMES if f(t)] or ["Celebration"],
            "size": sizes(p),
            "light": lighting(p),
            "variants": [variant_info(v) for v in p["variants"]],
        })
        full.append({**items[-1], "images": photos[:8], "type": p.get("product_type") or ""})
    js = ("// Generated by tools/build_catalog.py — do not edit by hand.\n"
          "// Placeholder catalogue (reference store data, live image links) until Craft by Payal's own products are added.\n"
          f"window.CBP_COLLECTION = {json.dumps({'handle': HANDLE, 'title': 'Miniature Frame'})};\n"
          f"window.CBP_CATALOG = {json.dumps(items, ensure_ascii=False, indent=1)};\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    os.makedirs(os.path.dirname(FULL), exist_ok=True)
    with open(FULL, "w", encoding="utf-8") as f:
        json.dump(full, f, ensure_ascii=False, indent=1)
    print(f"{len(items)} products -> {os.path.normpath(OUT)} (+ {os.path.normpath(FULL)})")

if __name__ == "__main__":
    main()
