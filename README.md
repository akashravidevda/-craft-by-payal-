# Craft by Payal

Website for **Craft by Payal** — handmade, personalised miniature frames and gifts.
Designed & developed by [Kaxon](https://kaxon.in).

## Structure

| Folder | What's in it |
|---|---|
| `site/` | The static website (open `site/index.html`, or serve the folder) |
| `site/css`, `site/js` | Styles and scripts (cart, wishlist, filters, checkout) |
| `tools/` | Python scripts that generate the pages from shared templates |
| `brand/` | Logo source files and exports |

## Run locally

```bash
python -m http.server 5522 -d site
```

Then open http://localhost:5522.

## Rebuilding pages

The homepage (`site/index.html`) holds the shared header, footer and icons. After editing it, regenerate the other pages:

```bash
python tools/build_catalog.py      # product data -> site/js/catalog.js
python tools/build_collection.py   # collection page
python tools/build_pages.py        # product, cart, checkout, info and policy pages
```

## Before launch

- Product photos and catalogue are placeholders linked from a reference store — replace with Craft by Payal's own.
- WhatsApp number (`tools/shell.py`, `site/js/forms.js`, `site/js/checkout.js`) and email are dummies.
- Policy pages contain `[bracketed]` items to confirm.
- Online payment runs in demo mode — connect a payment gateway (see `site/js/checkout.js`).
