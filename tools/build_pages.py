"""Build every non-home page: product pages, wishlist, workshop, about, contact, FAQs, track order,
account, policy drafts and 404.

Usage:  python tools/build_pages.py
Requires tools/data/catalog-full.json (run tools/build_catalog.py first).
Shared header/footer/drawers come from site/index.html via tools/shell.py.
"""
import html, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from shell import page, WA_NUMBER
import checkout_pages
import v2_pages

DATA = json.load(open(os.path.join(os.path.dirname(__file__), "data", "catalog-full.json"), encoding="utf-8"))
E = html.escape
WA = f"https://wa.me/{WA_NUMBER}"
EMAIL = "hello@craftbypayal.com"  # TODO: real address


def inr(n):
    s = str(int(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:]); head = head[:-2]
        if head: parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return "₹" + s


def img(src, w):
    return f"{src}&width={w}"


def crumbs(*items):
    li = []
    for i, (label, href) in enumerate(items):
        if i == len(items) - 1:
            li.append(f'<li><span aria-current="page">{E(label)}</span></li>')
        else:
            li.append(f'<li><a href="{href}">{E(label)}</a></li>')
    return f'''    <nav class="crumbs" aria-label="Breadcrumb">
      <ol class="container">{"".join(li)}</ol>
    </nav>'''


def page_head(eyebrow, title, lede="", art=""):
    return f'''    <section class="p-head">
      <div class="container p-head__inner">
        <div>
          <p class="c-eyebrow">{eyebrow}</p>
          <h1 class="p-head__title">{title}<svg class="doodle" aria-hidden="true"><use href="#doodle-heart"/></svg></h1>
          {f'<p class="p-head__lede">{lede}</p>' if lede else ''}
        </div>
        {art}
      </div>
    </section>'''


def card(p, prefix="../"):
    sizes = (f'<span>{len(p["size"])} sizes</span>' if len(p["size"]) > 1 else (f'<span>{p["size"][0]}</span>' if p["size"] else ""))
    light = '<span class="m-light"><svg aria-hidden="true"><use href="#i-bulb"/></svg>Light option</span>' if "With light" in p["light"] else ""
    alt2 = f'<img class="alt" src="{img(p["image2"], 400)}" width="400" height="448" loading="lazy" alt="" aria-hidden="true">' if p.get("image2") else ""
    return f'''<li class="ccard">
          <a class="ccard__media" href="{prefix}products/{p["id"]}.html" tabindex="-1" aria-hidden="true">
            {'<span class="ccard__badge">New</span>' if p["isNew"] else ''}
            <img src="{img(p["image"], 400)}" width="400" height="448" loading="lazy" alt="{E(p["alt"])}">{alt2}
          </a>
          <button class="ccard__wish" type="button" data-wish="{p["id"]}" aria-pressed="false" aria-label="Add {E(p["name"])} to wishlist"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
          <div class="ccard__body">
            <h3 class="ccard__name"><a href="{prefix}products/{p["id"]}.html">{E(p["name"])}</a></h3>
            <p class="ccard__meta">{sizes}{light}</p>
            <div class="ccard__foot">
              <p class="ccard__price">{'<small>From</small>' if p["priceFrom"] else ''}<span class="visually-hidden">Price </span>{inr(p["price"])}</p>
              <button class="add-btn" type="button" data-add="{p["id"]}" aria-label="Add {E(p["name"])} to cart"><svg aria-hidden="true"><use href="#i-cart"/></svg></button>
            </div>
          </div>
        </li>'''


def related(p, n=4):
    def score(q):
        return len(set(q["occasion"]) & set(p["occasion"])) * 2 + len(set(q["theme"]) & set(p["theme"]))
    others = sorted((q for q in DATA if q["id"] != p["id"]), key=lambda q: (-score(q), q["order"]))
    return others[:n]


# ---------------------------------------------------------------- simple pages
def simple(path, title, desc, body, current=None, scripts=(), css=("collection.css", "pages.css")):
    page(path, title=title, description=desc, body=body, css=css, scripts=scripts, current=current, body_class="page-info")


def wishlist():
    body = f'''{crumbs(("Home", "{P}index.html"), ("Wishlist", ""))}
{page_head("Saved for later", "Your Wishlist", "Frames you've hearted on this device. Tap the heart again to remove one.")}
    <section class="section section--tight">
      <div class="container">
        <ul class="cgrid cgrid--4" role="list" data-wish-grid></ul>
        <div class="empty" data-wish-empty hidden>
          <p class="script">Nothing saved yet…</p>
          <p>Tap the heart on any frame to keep it here.</p>
          <a class="btn btn--coral" href="{{P}}collections/miniature-frame.html">Explore frames <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
        </div>
      </div>
    </section>'''
    page("wishlist.html", title="Your Wishlist | Craft by Payal", description="Your saved Craft by Payal frames.",
         body=body, css=("collection.css", "pages.css"), scripts=("wishlist.js",), body_class="page-info")


def workshop():
    learn = [("Tools and materials, explained", "i-scissors"), ("Making tiny furniture by hand", "i-chair"),
             ("Editing and printing photos to scale", "i-image"), ("Assembling your miniature scene", "i-puzzle"),
             ("Fitting warm fairy lights", "i-bulb"), ("Framing and finishing", "i-frame"), ("Packing it safely as a gift", "i-gift")]
    body = f'''{crumbs(("Home", "{P}index.html"), ("Workshop", ""))}
    <section class="ws-hero">
      <div class="container ws-hero__grid">
        <div>
          <p class="c-eyebrow">Miniature frame workshop</p>
          <h1 class="p-head__title ws-title">Turn Your Imagination Into Miniature Magic<svg class="doodle" aria-hidden="true"><use href="#doodle-heart"/></svg><svg class="ws-title__brush" aria-hidden="true"><use href="#brush"/></svg></h1>
          <p class="p-head__lede">A hands-on workshop where you build your own personalised miniature frame — from the first tiny chair to the final fairy light — with step-by-step guidance and all materials included.</p>
          <div class="ws-hero__cta">
            <a class="btn btn--coral" href="{WA}?text=Hi%2C%20I%27d%20like%20to%20know%20about%20the%20next%20miniature%20frame%20workshop." target="_blank" rel="noopener">Ask about next batch <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
            <a class="link-arrow" href="#learn">What you'll learn <span class="circle"><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a>
          </div>
        </div>
        <figure class="ws-hero__photo ws-hero__photo--polaroid">
          <span class="ws-hero__paper" aria-hidden="true"></span>
          <span class="ws-hero__frame">
            <img src="{{P}}assets/images/workshop-maker-1000.webp" srcset="{{P}}assets/images/workshop-maker-600.webp 600w, {{P}}assets/images/workshop-maker-1000.webp 1000w"
                 sizes="(min-width: 900px) 40vw, 100vw" width="1000" height="1500" fetchpriority="high"
                 alt="Smiling maker sitting on the lawn beside a lit, yellow house-shaped miniature wedding frame">
          </span>
          <figcaption class="note note--taped" aria-hidden="true">Your creativity deserves a little shelf space <svg class="doodle doodle--xs"><use href="#doodle-heart"/></svg></figcaption>
          <svg class="ws-hero__sprig" aria-hidden="true"><use href="#branch"/></svg>
        </figure>
      </div>
    </section>

    <section class="section" id="learn" aria-labelledby="learn-title">
      <div class="container learn">
        <div>
          <p class="eyebrow eyebrow--heart">The curriculum</p>
          <h2 id="learn-title" class="h2 ws-underline">What You'll Learn<svg aria-hidden="true"><use href="#brush"/></svg></h2>
          <p class="muted">No experience needed — just curiosity and a few favourite photos.</p>
        </div>
        <ol class="learn__list">{"".join(f'<li><span class="learn__n">{i + 1:02d}</span><svg class="learn__ic" aria-hidden="true"><use href="#{ic}"/></svg>{E(x)}</li>' for i, (x, ic) in enumerate(learn))}</ol>
      </div>
    </section>

    <section class="band-pink" aria-labelledby="take-title">
      <div class="container">
        <div class="section-head"><div><p class="eyebrow eyebrow--line">Included</p><h2 id="take-title" class="h2">You'll Take Home</h2></div></div>
        <ul class="tiles" role="list">
          <li class="tile" style="--accent:#FAD8D3"><svg aria-hidden="true"><use href="#i-gift"/></svg><h3>Your own frame</h3><p>The finished miniature frame you made, ready to gift or display.</p></li>
          <li class="tile" style="--accent:#BFE6D5"><svg aria-hidden="true"><use href="#i-box"/></svg><h3>All materials</h3><p>Every tool, miniature piece and material you need is provided.</p></li>
          <li class="tile" style="--accent:#D7C2EA"><svg aria-hidden="true"><use href="#i-pencil"/></svg><h3>Step-by-step guidance</h3><p>Small batches so you get help at every stage.</p></li>
          <li class="tile" style="--accent:#F6DD86"><svg aria-hidden="true"><use href="#i-hearts"/></svg><h3>Lots of fun</h3><p>A relaxed, creative few hours with fellow makers.</p></li>
        </ul>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-band__inner">
        <svg class="cta-band__thread" aria-hidden="true"><use href="#heart-thread"/></svg>
        <div><h2 class="h2">Ready to make something <span class="ws-mark">tiny<svg aria-hidden="true"><use href="#brush"/></svg></span> &amp; meaningful?</h2>
          <p>Dates, format and fees for upcoming online and in-person batches are shared on WhatsApp.</p></div>
        <a class="btn btn--coral" href="{WA}?text=Hi%2C%20please%20share%20the%20next%20workshop%20dates." target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg> Enquire on WhatsApp</a>
      </div>
    </section>'''
    simple("workshop.html", "Miniature Frame Workshop | Craft by Payal",
           "Learn to make your own personalised miniature frame in a hands-on workshop with Craft by Payal.", body, current="Workshop")


def account():
    body = f'''{crumbs(("Home", "{P}index.html"), ("Account", ""))}
{page_head("Your account", "Hello there!", "Customer accounts will open with our online checkout. Until then, everything you need is a tap away.")}
    <section class="section section--tight">
      <div class="container">
        <ul class="tiles" role="list">
          <li class="tile" style="--accent:#FAD8D3"><svg aria-hidden="true"><use href="#i-heart"/></svg><h3>Your wishlist</h3><p>Frames you've saved on this device.</p><a class="link-arrow" href="{{P}}wishlist.html">Open wishlist <span class="circle"><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a></li>
          <li class="tile" style="--accent:#BFE6D5"><svg aria-hidden="true"><use href="#i-truck"/></svg><h3>Track an order</h3><p>Get a status update on WhatsApp.</p><a class="link-arrow" href="{{P}}track-order.html">Track order <span class="circle"><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a></li>
          <li class="tile" style="--accent:#D7C2EA"><svg aria-hidden="true"><use href="#i-mail"/></svg><h3>Need help?</h3><p>Questions about an order or a design.</p><a class="link-arrow" href="{{P}}contact.html">Contact us <span class="circle"><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a></li>
        </ul>
      </div>
    </section>'''
    simple("account.html", "Account | Craft by Payal", "Your Craft by Payal account, wishlist and order help.", body)


def not_found():
    body = f'''    <section class="nf">
      <div class="container nf__inner">
        <svg class="nf__flower" aria-hidden="true"><use href="#doodle-flower"/></svg>
        <p class="c-eyebrow">Page not found</p>
        <h1 class="p-head__title">This little corner is empty<svg class="doodle" aria-hidden="true"><use href="#doodle-heart"/></svg></h1>
        <p class="p-head__lede">The page you're looking for may have moved. Let's get you back to the good stuff.</p>
        <div class="cta-band__btns">
          <a class="btn btn--coral" href="{{P}}index.html">Back to home <svg aria-hidden="true"><use href="#i-arrow"/></svg></a>
          <a class="btn-outline" href="{{P}}collections/miniature-frame.html">Shop frames</a>
        </div>
      </div>
    </section>'''
    # Served at the site root; on hosting, configure it as the 404 page.
    page("404.html", title="Page Not Found | Craft by Payal", description="This page could not be found.",
         body=body, css=("collection.css", "pages.css"), body_class="page-info", root_absolute=True)



def write_sitemap():
    """sitemap.xml + robots.txt from every indexable page in site/."""
    import glob, datetime
    from shell import ROOT, SITE_URL, NOINDEX, page_url
    today = datetime.date.today().isoformat()
    paths = sorted(os.path.relpath(f, ROOT).replace(os.sep, "/") for f in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))
    urls = [p for p in paths if p not in NOINDEX]
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f"  <url><loc>{page_url(p)}</loc><lastmod>{today}</lastmod></url>" for p in urls]
    xml.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(xml) + "\n")
    # private pages carry <meta name="robots" content="noindex"> instead of a Disallow, so crawlers can see it
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")


if __name__ == "__main__":
    wishlist(); workshop(); account(); not_found()
    checkout_pages.build(crumbs)          # checkout + confirmation (no source page to upgrade)
    v2_pages.build(sys.modules[__name__])  # product, cart, about, contact, FAQs, track order, policies
    write_sitemap()
    print(f"built {len(DATA)} product pages + 16 other pages")
