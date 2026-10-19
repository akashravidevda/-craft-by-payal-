"""Build site/collections/miniature-frame.html.

Shared chrome (icon sprite, announcement bar, header, footer, drawers) is copied from site/index.html,
so edit those parts on the homepage and re-run:  python tools/build_collection.py
"""
import os, sys

sys.path.insert(0, os.path.dirname(__file__))
from shell import chrome, WA_NUMBER, SITE_URL

ROOT = os.path.join(os.path.dirname(__file__), "..", "site")
OUT_DIR = os.path.join(ROOT, "collections")
OUT = os.path.join(OUT_DIR, "miniature-frame.html")

_c = chrome("../")
sprite, header, footer, drawers = _c["sprite"], _c["header"], _c["footer"], _c["drawers"]
header = header.replace('<li class="has-menu">\n            <button type="button" aria-expanded="false">Collections',
                        '<li class="has-menu is-current">\n            <button type="button" aria-expanded="false">Collections', 1)
header = header.replace('href="../collections/miniature-frame.html">Miniature Frame</a>',
                        'href="miniature-frame.html" aria-current="page">Miniature Frame</a>', 1)

HERO_IMG = "https://cdn.shopify.com/s/files/1/0844/8655/3892/files/1df2cb48-95e2-4e94-8d41-a644eaf7361f.png?v=1775039537"

page = f'''<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Miniature Frames | Personalised Handmade Gifts | Craft by Payal</title>
  <meta name="description" content="Explore personalised handmade miniature frames for birthdays, anniversaries, weddings, house warmings and special occasions from Craft by Payal.">
  <meta name="theme-color" content="#FBF7F0">
  <meta name="author" content="Kaxon (kaxon.in)">
  <link rel="canonical" href="{SITE_URL}/collections/miniature-frame.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Craft by Payal">
  <meta property="og:title" content="Miniature Frames | Craft by Payal">
  <meta property="og:description" content="Personalised handmade miniature frames for birthdays, anniversaries, weddings and house warmings.">
  <meta property="og:url" content="{SITE_URL}/collections/miniature-frame.html">
  <meta property="og:image" content="{SITE_URL}/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="../assets/icon.svg">
  <link rel="icon" type="image/png" sizes="64x64" href="../assets/favicon-64.png">
  <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Placeholder imagery: product photos are linked from the reference store's CDN until Craft by Payal's own photography is ready. -->
  <link rel="preload" as="image" href="{HERO_IMG}&width=1100" imagesrcset="{HERO_IMG}&width=700 700w, {HERO_IMG}&width=1100 1100w, {HERO_IMG}&width=1500 1500w" imagesizes="(min-width: 900px) 58vw, 100vw">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/collection.css">
  <script type="application/ld+json">
  {{"@context":"https://schema.org","@graph":[
    {{"@type":"CollectionPage","name":"Miniature Frame","description":"Personalised handmade miniature frames by Craft by Payal."}},
    {{"@type":"BreadcrumbList","itemListElement":[
      {{"@type":"ListItem","position":1,"name":"Home","item":"../index.html"}},
      {{"@type":"ListItem","position":2,"name":"Gifts by Type"}},
      {{"@type":"ListItem","position":3,"name":"Miniature Frame"}}]}}]}}
  </script>
</head>
<body class="page-collection">
  {sprite}

  <a class="skip-link" href="#products">Skip to products</a>

  {header}

  <main id="main">
    <!-- HERO -->
    <section class="c-hero" aria-labelledby="c-title">
      <div class="container c-hero__grid">
        <div class="c-hero__copy">
          <p class="c-eyebrow">Gifts by type</p>
          <h1 id="c-title" class="c-hero__title">Miniature Frame<svg class="doodle" aria-hidden="true"><use href="#doodle-heart"/></svg></h1>
          <p class="c-hero__lede">Tiny rooms, real memories. Every Craft by Payal miniature frame is handmade and personalised with your photos, names and little details — for birthdays, anniversaries, weddings, baby showers, house warmings and every story in between.</p>
          <ul class="c-hero__trust" role="list">
            <li><span class="c-ic"><svg aria-hidden="true"><use href="#i-heart-lg"/></svg></span>100% Handmade</li>
            <li><span class="c-ic"><svg aria-hidden="true"><use href="#i-pencil"/></svg></span>Customisable Designs</li>
            <li><span class="c-ic"><svg aria-hidden="true"><use href="#i-truck"/></svg></span>Safe Packaging</li>
            <li><span class="c-ic"><svg aria-hidden="true"><use href="#i-gift"/></svg></span>Made to Order</li>
          </ul>
        </div>
        <div class="c-hero__visual">
          <div class="c-hero__frame">
            <img src="{HERO_IMG}&width=1100" srcset="{HERO_IMG}&width=700 700w, {HERO_IMG}&width=1100 1100w, {HERO_IMG}&width=1500 1500w"
                 sizes="(min-width: 900px) 58vw, 100vw" width="1500" height="1000" fetchpriority="high"
                 alt="Warm-lit handmade family miniature wall frame with tiny figures, shelves and photos">
          </div>
          <div class="note note--taped c-hero__note" aria-hidden="true">Small<br>Frames.<br>Big<br>Emotions.<svg class="doodle doodle--xs"><use href="#doodle-heart"/></svg></div>
          <svg class="c-hero__sprig" aria-hidden="true"><use href="#branch"/></svg>
        </div>
      </div>
    </section>

    <nav class="crumbs" aria-label="Breadcrumb">
      <ol class="container">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../index.html#collections">Gifts by Type</a></li>
        <li><span aria-current="page">Miniature Frame</span></li>
      </ol>
    </nav>

    <!-- COLLECTION -->
    <section class="shop" id="products" aria-label="Miniature frames">
      <svg class="shop__flower" aria-hidden="true"><use href="#branch"/></svg>
      <div class="container shop__grid">
        <aside class="filters" id="filters" aria-label="Product filters" data-filters>
          <div class="filters__sheet" role="dialog" aria-modal="false" aria-labelledby="filters-title" data-filter-sheet>
            <div class="filters__head">
              <h2 id="filters-title" class="filters__title"><svg aria-hidden="true"><use href="#i-sliders"/></svg> Filters</h2>
              <button class="icon-btn filters__close" type="button" aria-label="Close filters" data-filter-close><svg><use href="#i-close"/></svg></button>
            </div>
            <form class="filters__body" data-filter-form>
              <details class="fgroup" open>
                <summary>Availability</summary>
                <div class="fgroup__opts" data-facet="avail"></div>
              </details>
              <details class="fgroup" open>
                <summary>Price Range</summary>
                <div class="price" data-price>
                  <div class="price__track"><span class="price__fill" data-price-fill></span>
                    <label class="visually-hidden" for="pmin">Minimum price</label>
                    <input id="pmin" type="range" step="50" data-price-min>
                    <label class="visually-hidden" for="pmax">Maximum price</label>
                    <input id="pmax" type="range" step="50" data-price-max>
                  </div>
                  <p class="price__vals"><span data-price-min-out></span><span data-price-max-out></span></p>
                </div>
              </details>
              <details class="fgroup" open>
                <summary>Occasion</summary>
                <div class="fgroup__opts" data-facet="occasion"></div>
              </details>
              <details class="fgroup" open>
                <summary>Theme</summary>
                <div class="fgroup__opts" data-facet="theme"></div>
              </details>
              <details class="fgroup" open>
                <summary>Size</summary>
                <div class="fgroup__opts" data-facet="size"></div>
              </details>
              <details class="fgroup" open>
                <summary>Lighting</summary>
                <div class="fgroup__opts fgroup__opts--chips" data-facet="light"></div>
              </details>
              <button class="btn-outline filters__clear" type="button" data-clear>Clear All</button>
            </form>
            <div class="filters__foot">
              <button class="btn-outline" type="button" data-clear>Clear All</button>
              <button class="btn btn--coral" type="button" data-filter-close data-show-count>Show results</button>
            </div>
          </div>
          <div class="custom-cta">
            <svg class="custom-cta__flower" aria-hidden="true"><use href="#doodle-flower"/></svg>
            <p class="custom-cta__title">Can't find what you are looking for?</p>
            <p class="custom-cta__text">We'll create a custom design just for you!</p>
            <a class="btn btn--coral btn--sm" href="https://wa.me/{WA_NUMBER}?text=Hi%20Craft%20by%20Payal%2C%20I%27d%20like%20a%20custom%20miniature%20frame." target="_blank" rel="noopener">Request Custom Frame <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
          </div>
        </aside>

        <div class="results">
          <div class="toolbar">
            <p class="toolbar__count" aria-live="polite" data-count>43 Products</p>
            <button class="toolbar__filter" type="button" aria-controls="filters" aria-expanded="false" data-filter-open>
              <svg aria-hidden="true"><use href="#i-sliders"/></svg> Filter <span class="toolbar__badge" data-filter-badge hidden></span>
            </button>
            <label class="toolbar__sort"><span>Sort by:</span>
              <select data-sort>
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="az">Alphabetical</option>
              </select>
              <svg aria-hidden="true"><use href="#i-chev"/></svg>
            </label>
          </div>
          <ul class="chips" role="list" aria-label="Active filters" data-chips></ul>
          <ul class="cgrid" role="list" data-grid>
            <li class="cgrid__noscript">Loading frames…</li>
          </ul>
          <div class="empty" data-empty hidden>
            <p class="script">No frames match those filters yet…</p>
            <p>Try removing a filter, or ask us for a custom design.</p>
            <button class="btn btn--coral" type="button" data-clear>Clear all filters</button>
          </div>
          <nav class="pager" aria-label="Pagination" data-pager></nav>
        </div>
      </div>
    </section>

    <!-- TRUST STRIP -->
    <section class="trust" aria-label="Why shop with us">
      <ul class="container trust__grid" role="list">
        <li><svg aria-hidden="true"><use href="#i-pencil"/></svg><p><strong>Personalised</strong><span>for every story</span></p></li>
        <li><svg aria-hidden="true"><use href="#i-heart-lg"/></svg><p><strong>Handmade</strong><span>with love</span></p></li>
        <li><svg aria-hidden="true"><use href="#i-gift"/></svg><p><strong>Gift-ready</strong><span>packaging</span></p></li>
        <li><svg aria-hidden="true"><use href="#i-shield"/></svg><p><strong>Secure</strong><span>payments</span></p></li>
      </ul>
    </section>

    <!-- NEWSLETTER -->
    <section class="inspire" aria-labelledby="ins-title">
      <svg class="inspire__edge inspire__edge--top" viewBox="0 0 1440 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 26V12C120 4 220 18 360 10S600 2 760 12s300 8 420-2 200-6 260 4V26z" fill="currentColor"/></svg>
      <svg class="inspire__edge inspire__edge--bottom" viewBox="0 0 1440 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0v12c140 10 260-6 400 4s260 8 420-2 300-10 440 2 140 6 180-2V0z" fill="currentColor"/></svg>
      <svg class="inspire__flower inspire__flower--l" aria-hidden="true"><use href="#doodle-flower"/></svg>
      <div class="container inspire__grid">
        <div>
          <h2 id="ins-title" class="inspire__title">Stay Inspired</h2>
          <p>Get updates on new designs, special offers and workshop dates.</p>
        </div>
        <form class="inspire__form" data-newsletter novalidate>
          <label class="visually-hidden" for="nl-email">Email address</label>
          <input id="nl-email" type="email" name="email" placeholder="Enter your email address" autocomplete="email" required>
          <button class="btn btn--coral" type="submit">Subscribe <svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
          <p class="newsletter__msg" role="status" aria-live="polite" data-newsletter-msg></p>
        </form>
        <svg class="inspire__plane" viewBox="0 0 110 50" aria-hidden="true"><path d="M8 26L50 8 42 34 32 27zM32 27L50 8M32 27l-1 9 6-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M50 30c10 6 18 8 22 2 3-5-3-9-6-5-4 6 6 12 16 10 8-2 14-6 20-10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
    </section>
  </main>

  {footer}

  <!-- TODO: replace the placeholder WhatsApp number with Craft by Payal's real number. -->
  <a class="wa-float" href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
    <svg aria-hidden="true"><use href="#i-whatsapp"/></svg><span class="wa-float__tip" aria-hidden="true">Need help? Chat with us</span>
  </a>

  {drawers}

  <script src="../js/catalog.js"></script>
  <script src="../js/main.js"></script>
  <script src="../js/collection.js"></script>
</body>
</html>
'''
os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(page)
print("wrote", os.path.normpath(OUT))
