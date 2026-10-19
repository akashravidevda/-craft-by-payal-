"""Alternative Craft by Payal logo directions (palette + icon), same type system as build_logo.py."""
import base64, os, sys, requests

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "variations")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
FONTS = {
    "CBPSerif": "https://fonts.gstatic.com/l/font?kit=co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_s06GnPcmdN4ar7kFvS1zkYfTY30s49Uy5OvwtA&skey=a863d1376a24bd7a&v=v21",
    "CBPScript": "https://fonts.gstatic.com/l/font?kit=9oRPNYsQpS4zjuAPjBoVFouSe6W6&skey=79209908b474aec&v=v23",
    "CBPSans": "https://fonts.gstatic.com/l/font?kit=92zPtBhPNqw79Ij1E865zBUv7myjJQVGJoIk2rqObQ0OQ_I4dWaZ5vY&skey=4145fd5d1d5ac665&v=v20",
}
face = "".join(
    f"@font-face{{font-family:{n};src:url(data:font/woff2;base64,{base64.b64encode(requests.get(u, headers=UA).content).decode()}) format('woff2');}}"
    for n, u in FONTS.items())

PALETTES = {
    # Soft lavender with sage — calm, dreamy
    "lavender": dict(bg="#ECE6F3", inner="#FCFAFE", line="#8C7BA8", accent="#C48FA6", leaf="#9DB5A6", warm="#D9B48A", ink="#4B4060", script="#9A7DB5", tag="#8C7BA8"),
    # Warm peach & terracotta — cosy, earthy
    "peach": dict(bg="#FBE5D6", inner="#FFF8F2", line="#C0785A", accent="#E2967A", leaf="#8FA67E", warm="#E6B566", ink="#5C3D33", script="#C0785A", tag="#8FA67E"),
    # Mint & deep teal with gold — fresh, premium
    "mint": dict(bg="#DDEFE9", inner="#F7FCFA", line="#3F7F78", accent="#E3A6A0", leaf="#6FA597", warm="#D4AF6A", ink="#2F4E4B", script="#3F7F78", tag="#B8935A"),
}


def sparkle(x, y, s, c):
    return f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" fill="{c}"/>'


def icon_house(p):
    """Miniature home with a heart window and a little plant."""
    g = f'<circle r="72" fill="{p["bg"]}"/>'
    g += f'<path d="M-38 -4 L0 -40 L38 -4" fill="none" stroke="{p["line"]}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'
    g += f'<path d="M-29 -10 V34 a6 6 0 0 0 6 6 H23 a6 6 0 0 0 6 -6 V-10 L0 -34Z" fill="{p["inner"]}" stroke="{p["line"]}" stroke-width="4" stroke-linejoin="round"/>'
    g += f'<rect x="16" y="-34" width="8" height="16" rx="1.5" fill="{p["line"]}"/>'  # chimney
    g += f'<path d="M0 8 C-11 0 -13 -7 -9 -11 C-6 -14 -2 -13 0 -9 C2 -13 6 -14 9 -11 C13 -7 11 0 0 8Z" fill="{p["accent"]}"/>'
    g += f'<path d="M-10 40 V24 a10 10 0 0 1 20 0 V40" fill="{p["warm"]}" opacity=".85"/>'  # door
    g += f'<path d="M-40 40 H40" stroke="{p["line"]}" stroke-width="3" stroke-linecap="round"/>'
    g += f'<path d="M-44 39 C-46 30 -52 26 -56 25 C-53 31 -50 35 -44 39Z" fill="{p["leaf"]}"/>'
    g += f'<path d="M-44 39 C-42 29 -37 24 -33 23 C-35 30 -38 35 -44 39Z" fill="{p["leaf"]}" opacity=".75"/>'
    g += sparkle(48, -44, 7, p["warm"]) + sparkle(-50, -30, 4, p["accent"])
    return g


def icon_monogram(p):
    """Script P inside an arch with a sprig — a quiet monogram."""
    g = f'<circle r="72" fill="{p["bg"]}"/>'
    g += f'<path d="M-34 44 V-6 a34 34 0 0 1 68 0 V44Z" fill="{p["inner"]}" stroke="{p["line"]}" stroke-width="3.5" stroke-linejoin="round"/>'
    g += f'<path d="M-26 44 V-4 a26 26 0 0 1 52 0 V44" fill="none" stroke="{p["warm"]}" stroke-width="1.4" stroke-dasharray="2.5 3.5"/>'
    g += f'<text x="-1" y="24" text-anchor="middle" font-family="CBPScript" font-size="60" fill="{p["line"]}">P</text>'
    # sprig curling up the left side
    g += f'<path d="M-40 46 C-48 28 -46 8 -38 -8" fill="none" stroke="{p["leaf"]}" stroke-width="2.2" stroke-linecap="round"/>'
    for (x, y, r) in [(-46, 30, -40), (-46, 14, -20), (-41, -1, 0)]:
        g += f'<ellipse cx="{x}" cy="{y}" rx="7" ry="3.4" transform="rotate({r} {x} {y})" fill="{p["leaf"]}"/>'
    g += f'<path d="M0 -50 C-5 -54 -6 -58 -3 -60 C-1 -61 0 -59 0 -58 C0 -59 1 -61 3 -60 C6 -58 5 -54 0 -50Z" fill="{p["accent"]}"/>'
    g += sparkle(50, -40, 6, p["warm"]) + sparkle(46, 46, 4, p["accent"])
    return g


def icon_spool(p):
    """Thread spool whose loose thread loops into a heart, finished with a needle."""
    g = f'<circle r="72" fill="{p["bg"]}"/>'
    g += f'<rect x="-40" y="-36" width="42" height="9" rx="4" fill="{p["warm"]}"/>'
    g += f'<rect x="-40" y="27" width="42" height="9" rx="4" fill="{p["warm"]}"/>'
    g += f'<rect x="-34" y="-27" width="30" height="54" fill="{p["accent"]}"/>'
    for y in range(-21, 26, 7):
        g += f'<path d="M-34 {y} H-4" stroke="{p["inner"]}" stroke-width="1.2" opacity=".55"/>'
    # thread leaves the spool and draws a heart
    g += (f'<path d="M-4 6 C6 8 12 4 15 -2 M30 8 C14 -3 11 -14 16 -21 C21 -27 28 -25 30 -18 '
          f'C32 -25 39 -27 44 -21 C49 -14 46 -3 30 8" fill="none" stroke="{p["line"]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    # dashed stitch down to the needle
    g += f'<path d="M30 8 C30 16 33 20 36 24" fill="none" stroke="{p["line"]}" stroke-width="1.8" stroke-dasharray="2.5 3" stroke-linecap="round"/>'
    g += f'<path d="M34 22 L54 46" stroke="{p["ink"]}" stroke-width="2.6" stroke-linecap="round"/>'
    g += f'<ellipse cx="36.5" cy="25" rx="2.6" ry="1.1" transform="rotate(50 36.5 25)" fill="{p["bg"]}"/>'
    g += sparkle(46, -44, 6, p["warm"]) + sparkle(-52, 40, 4, p["line"])
    return g


def mark(icon, p, cx, cy, k=1.0):
    return f'<g transform="translate({cx} {cy}) scale({k})">{icon(p)}</g>'


def wordmark(p, x, y, anchor="start"):
    t = f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="CBPSerif" font-weight="500" font-size="62" letter-spacing="12" fill="{p["ink"]}">CRAFT</text>'
    sx = x + 248 if anchor == "start" else x + 118
    t += f'<text x="{sx}" y="{y+44}" text-anchor="end" font-family="CBPScript" font-size="54" fill="{p["script"]}">by Payal</text>'
    return t


def tagline(p, x, y, anchor="start"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="CBPSans" font-size="12.5" letter-spacing="4.5" fill="{p["tag"]}">HANDCRAFTED WITH LOVE</text>'


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title><style>{face}</style>{body}</svg>')


VARIANTS = [
    ("a-lavender-monogram", "lavender", icon_monogram),
    ("b-peach-house", "peach", icon_house),
    ("c-mint-spool", "mint", icon_spool),
]

os.makedirs(OUT, exist_ok=True)
for name, pal, icon in VARIANTS:
    p = PALETTES[pal]
    files = {
        f"{name}-horizontal.svg": svg(485, 200, mark(icon, p, 100, 100) + wordmark(p, 205, 98) + tagline(p, 209, 174), "Craft by Payal"),
        f"{name}-stacked.svg": svg(400, 400, mark(icon, p, 200, 120, 1.05) + wordmark(p, 206, 268, "middle") + tagline(p, 202, 362, "middle"), "Craft by Payal"),
        f"{name}-icon.svg": svg(160, 160, mark(icon, p, 80, 80, 1.05), "Craft by Payal icon"),
    }
    for n, s in files.items():
        open(os.path.join(OUT, n), "w", encoding="utf-8").write(s)
print("ok")
