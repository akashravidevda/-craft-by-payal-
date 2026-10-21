"""Shared page shell for generated pages.

The homepage (site/index.html) is the source of truth for the icon sprite, announcement bar,
header, footer and drawers. Generated pages copy those parts, with links re-pointed for their folder depth.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import art

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "site"))
HOME = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

EXTRA_SYMBOLS = '''      <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="15" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/></symbol>
      <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol>
      <symbol id="i-bulb" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
      <symbol id="i-shield" viewBox="0 0 32 32"><path d="M16 4l10 4v7c0 6.5-4.3 11-10 13C10.3 26 6 21.5 6 15V8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11.5 16l3.2 3.2 6-6.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
      <symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M12 2.6a9.4 9.4 0 0 0-8.1 14.15L2.6 21.4l4.78-1.25A9.4 9.4 0 1 0 12 2.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.06 7.4c-.2-.45-.42-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.66 1.12 2.84c.14.18 1.9 3.04 4.69 4.14 2.32.91 2.79.73 3.29.69.5-.05 1.62-.66 1.85-1.3.23-.64.23-1.19.16-1.3-.07-.12-.25-.18-.53-.32-.27-.14-1.62-.8-1.87-.89-.25-.09-.43-.14-.62.14-.18.27-.71.89-.87 1.07-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.19-1.35-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.46.09-.18.05-.34-.02-.48-.07-.14-.6-1.5-.84-2.04z" fill="currentColor"/></symbol>
      <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v4h14v-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
      <symbol id="i-box" viewBox="0 0 24 24"><path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></symbol>
      <symbol id="doodle-flower" viewBox="0 0 60 60"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="30" cy="12.2" rx="4.4" ry="7" fill="currentColor" fill-opacity=".12" transform="rotate(0 30 20)"/><ellipse cx="30" cy="12.2" rx="4.4" ry="7" fill="currentColor" fill-opacity=".12" transform="rotate(72 30 20)"/><ellipse cx="30" cy="12.2" rx="4.4" ry="7" fill="currentColor" fill-opacity=".12" transform="rotate(144 30 20)"/><ellipse cx="30" cy="12.2" rx="4.4" ry="7" fill="currentColor" fill-opacity=".12" transform="rotate(216 30 20)"/><ellipse cx="30" cy="12.2" rx="4.4" ry="7" fill="currentColor" fill-opacity=".12" transform="rotate(288 30 20)"/><circle cx="30" cy="20" r="4.4" fill="currentColor"/><path d="M30 27.5C30 38 28.5 46 25 56"/><path d="M29.4 40c-5-3.6-10.6-3.6-14.6.2 4.6 3 10 3 14.6-.2z"/><path d="M28.2 47.5c4.6-3.4 10-3.6 14-.4-4.4 3.2-9.6 3.4-14 .4z"/></g></symbol>\n'''

SKIP = ("http:", "https:", "mailto:", "tel:", "#", "data:", "../", "/", "javascript:")


def _between(start, end, include_end=True):
    a = HOME.index(start)
    b = HOME.index(end, a) + (len(end) if include_end else 0)
    return HOME[a:b]


def relink(html, prefix):
    """Re-point relative href/src/action attributes for a page `prefix` levels deep ('' or '../')."""
    if not prefix:
        return html
    def fix(m):
        attr, url = m.group(1), m.group(2)
        return m.group(0) if url.startswith(SKIP) or url == "" else f'{attr}="{prefix}{url}"'
    return re.sub(r'\b(href|src|action|srcset)="([^"]*)"', fix, html)


def chrome(prefix="", current=None):
    """Return dict(sprite, header, footer, drawers) re-pointed for the given folder depth."""
    sprite = _between('<svg width="0" height="0"', '</svg>\n\n  <a class="skip-link"', include_end=False) + "</svg>"
    sprite = sprite.replace("    </defs>", EXTRA_SYMBOLS + "      " + art.symbols() + "    </defs>", 1)
    header = relink(_between('<div class="announce">', "</header>"), prefix)
    if current:  # mark the active main-nav item
        header = re.sub(rf'(<li>)<a href="([^"]+)">{re.escape(current)}</a>',
                        rf'<li class="is-current"><a href="\2" aria-current="page">{current}</a>', header, count=1)
    footer = relink(_between("<footer", "</footer>"), prefix)
    drawers = relink(_between("<!-- Mobile menu drawer -->", '<div class="toast" role="status" aria-live="polite" data-toast></div>'), prefix)
    return {"sprite": sprite, "header": header, "footer": footer, "drawers": drawers}


FONTS = ("https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,600"
         "&family=Manrope:wght@400;500;600;700;800&display=swap")

WA_NUMBER = "910000000000"  # TODO: Craft by Payal's real WhatsApp number
SITE_URL = "https://www.craftbypayal.com"  # TODO: the real domain (no trailing slash) — used for canonical, social and sitemap URLs
NOINDEX = {"cart.html", "checkout.html", "order-confirmation.html", "wishlist.html", "account.html", "404.html"}


def page_url(path):
    return SITE_URL + "/" + ("" if path == "index.html" else path)


def page(path, *, title, description, body, css=(), scripts=(), body_class="", head_extra="", current=None,
         whatsapp=True, preload="", root_absolute=False):
    """Write a full page to site/<path>. `body` is the <main> inner HTML (may use {P} for the path prefix).
    root_absolute=True makes every link start with "/" (for 404.html, which hosts serve at any URL depth)."""
    depth = path.count("/")
    P = "/" if root_absolute else "../" * depth
    c = chrome(P, current)
    css_links = "\n".join(f'  <link rel="stylesheet" href="{P}css/{name}">' for name in ("styles.css", *css))
    js = "\n".join(f'  <script src="{P}js/{name}"></script>' for name in ("catalog.js", "main.js", *scripts))
    wa = (f'''
  <a class="wa-float" href="https://wa.me/{WA_NUMBER}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
    <svg aria-hidden="true"><use href="#i-whatsapp"/></svg><span class="wa-float__tip" aria-hidden="true">Need help? Chat with us</span>
  </a>''' if whatsapp else "")
    if path in NOINDEX:
        meta = '  <meta name="robots" content="noindex">\n'
    else:
        meta = (f'  <link rel="canonical" href="{page_url(path)}">\n'
                f'  <meta property="og:type" content="website">\n'
                f'  <meta property="og:site_name" content="Craft by Payal">\n'
                f'  <meta property="og:title" content="{title}">\n'
                f'  <meta property="og:description" content="{description}">\n'
                f'  <meta property="og:url" content="{page_url(path)}">\n'
                f'  <meta property="og:image" content="{SITE_URL}/assets/og-image.png">\n'
                f'  <meta name="twitter:card" content="summary_large_image">\n')
    html = f'''<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="theme-color" content="#FBF7F0">
  <meta name="author" content="Kaxon (kaxon.in)">
{meta}  <link rel="icon" type="image/svg+xml" href="{P}assets/icon.svg">
  <link rel="icon" type="image/png" sizes="64x64" href="{P}assets/favicon-64.png">
  <link rel="apple-touch-icon" href="{P}assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>
  <link href="{FONTS}" rel="stylesheet">
{preload}{css_links}
{head_extra}</head>
<body class="{body_class}">
  {c["sprite"]}

  <a class="skip-link" href="#main">Skip to content</a>

  {c["header"]}

  <main id="main">
{body.replace("{P}", P)}
  </main>

  {c["footer"]}
{wa}

  {c["drawers"]}

{js}
</body>
</html>\n'''
    out = os.path.join(ROOT, *path.split("/"))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    return out
