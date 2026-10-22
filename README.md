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

## Deploy

The site is pre-built static HTML in `site/` — no build step on the host. Pick one:

- **Netlify** — "Add new site → Import from Git", choose this repo. `netlify.toml` already sets the publish folder to `site`.
- **Vercel** — "Add New → Project", import this repo. `vercel.json` sets the output folder to `site`; leave the framework as "Other".
- **Cloudflare Pages** — connect the repo, build command empty, output directory `site`.

All three serve `site/404.html` for unknown URLs and apply the security/cache headers (`site/_headers` or `vercel.json`).
The 404 page uses root-relative links, so serve the site at the domain root (not a sub-folder).

**Before pointing a domain at it**, set the real address in `SITE_URL` in `tools/shell.py` (and the two `og:`/canonical URLs at the top of `site/index.html`), then rebuild — canonical links, social previews, `sitemap.xml` and `robots.txt` all use it.

Check before every deploy (also runs on GitHub on each push):

```bash
python tools/check_site.py
```

## Orders (Google Sheet)

Orders are saved to a Google Sheet that works as the owner's dashboard, and the Track Order page shows each order's live status.
Set it up once by following [backend/google-sheets/SETUP.md](backend/google-sheets/SETUP.md), then paste the web-app URL into `site/js/config.js`.
Until then, orders reach you only through WhatsApp.

## Before launch

- Product photos and catalogue are placeholders linked from a reference store — replace with Craft by Payal's own.
- WhatsApp number (`tools/shell.py`, `site/js/forms.js`, `site/js/checkout.js`) and email are dummies.
- Policy pages contain `[bracketed]` items to confirm.
- Online payment runs in demo mode — connect a payment gateway (see `site/js/checkout.js`).

## Owner catalogue management

The owner dashboard at `site/admin.html` includes **Order book** and **Products** tabs. Products supports adding and editing items, photo links, descriptions, variants, prices, stock, shop visibility and home-page favourites. Deploy the updated Apps Script backend to enable shared product saves; see [product dashboard setup](backend/google-sheets/SETUP.md#owner-product-dashboard). No browser-only product storage is used.

## Sheets production backend (staging implementation)

The readable-table backend and cart/checkout reliability changes are documented in [PRODUCTION.md](backend/google-sheets/PRODUCTION.md). Build its paste-ready Apps Script package with `node tools/build_apps_script.cjs`. The frontend expects the schema-2 published catalogue: verify the staging backend before releasing those website files. No live migration is automatic. Guest checkout and owner-verified UPI are the intended initial release; customer accounts and gateway payments are disabled.
