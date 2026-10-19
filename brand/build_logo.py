"""Build Craft by Payal logo SVGs with embedded subset fonts."""
import base64, os, sys, requests

OUT = sys.argv[1]
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36"}
FONTS = {
    "CBPSerif": "https://fonts.gstatic.com/l/font?kit=co3umX5slCNuHLi8bLeY9MK7whWMhyjypVO7abI26QOD_s06GnPcmdN4ar7kFvS1zkYfTY30s49Uy5OvwtA&skey=a863d1376a24bd7a&v=v21",
    "CBPScript": "https://fonts.gstatic.com/l/font?kit=9oRPNYsQpS4zjuAPjBoVFouSe6W6&skey=79209908b474aec&v=v23",
    "CBPSans": "https://fonts.gstatic.com/l/font?kit=92zPtBhPNqw79Ij1E865zBUv7myjJQVGJoIk2rqObQ0OQ_I4dWaZ5vY&skey=4145fd5d1d5ac665&v=v20",
}
face = "".join(
    f"@font-face{{font-family:{n};src:url(data:font/woff2;base64,{base64.b64encode(requests.get(u, headers=UA).content).decode()}) format('woff2');}}"
    for n, u in FONTS.items())

# Soothing palette
BLUSH, CREAM, SAGE, SAGE_D, ROSE, PLUM, GOLD, WOOD = "#F5E1DA", "#FFFAF6", "#9DB5A6", "#7E9A8B", "#C98A85", "#5A4A52", "#E0BA7E", "#CFA987"


def sparkle(x, y, s, c=GOLD):
    return (f'<path d="M{x} {y-s} Q{x} {y} {x+s} {y} Q{x} {y} {x} {y+s} Q{x} {y} {x-s} {y} Q{x} {y} {x} {y-s}Z" fill="{c}"/>')


def mark(cx, cy, k=1.0):
    """Hanging miniature frame inside a soft blush circle."""
    g = f'<g transform="translate({cx} {cy}) scale({k})">'
    g += f'<circle r="72" fill="{BLUSH}"/>'
    # hanging string + pin
    g += f'<path d="M-22 -38 L0 -56 L22 -38" fill="none" stroke="{SAGE_D}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
    g += f'<circle cx="0" cy="-57" r="3.4" fill="{ROSE}"/>'
    # frame
    g += f'<rect x="-36" y="-38" width="72" height="78" rx="11" fill="{CREAM}" stroke="{SAGE_D}" stroke-width="4"/>'
    # shelf
    g += f'<path d="M-25 12 H25" stroke="{WOOD}" stroke-width="3" stroke-linecap="round"/>'
    # plant on shelf (left)
    g += f'<path d="M-21 11 L-19.5 1 H-11.5 L-10 11Z" fill="{WOOD}"/>'
    g += f'<path d="M-15.5 1 C-17 -6 -22 -9 -25 -10 C-22 -5 -19 -2 -15.5 1Z" fill="{SAGE}"/>'
    g += f'<path d="M-15.5 1 C-14 -7 -10 -11 -6 -12 C-8 -6 -11 -2 -15.5 1Z" fill="{SAGE_D}"/>'
    # heart in centre
    g += f'<path d="M3 9 C-7 2 -9 -4 -6 -8 C-3 -11 1 -10 3 -6 C5 -10 9 -11 12 -8 C15 -4 13 2 3 9Z" fill="{ROSE}" transform="translate(-1 -1)"/>'
    # tiny books (right)
    g += f'<rect x="14" y="-3" width="4" height="14" rx="1" fill="{SAGE}"/>'
    g += f'<rect x="19" y="0" width="4" height="11" rx="1" fill="{GOLD}"/>'
    # little stitch line under shelf (handmade touch)
    g += f'<path d="M-22 26 H22" stroke="{ROSE}" stroke-width="1.8" stroke-dasharray="3 4" stroke-linecap="round" opacity=".7"/>'
    g += sparkle(52, -48, 7) + sparkle(-56, 40, 5) + sparkle(-48, -50, 3.5, ROSE)
    return g + "</g>"


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">'
            f'<title>{title}</title><style>{face}</style>{body}</svg>')


def wordmark(x, y, anchor="start"):
    t = f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="CBPSerif" font-weight="500" font-size="62" letter-spacing="12" fill="{PLUM}">CRAFT</text>'
    # right-align the script with the visible edge of CRAFT (width ~248 without trailing spacing)
    sx = x + 248 if anchor == "start" else x + 118
    t += f'<text x="{sx}" y="{y+44}" text-anchor="end" font-family="CBPScript" font-size="54" fill="{ROSE}">by Payal</text>'
    return t


def tagline(x, y, anchor="start"):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="CBPSans" font-size="12.5" letter-spacing="4.5" fill="{SAGE_D}">'
            f'HANDCRAFTED WITH LOVE</text>')


os.makedirs(OUT, exist_ok=True)
files = {
    "craftbypayal-logo-horizontal.svg": svg(485, 200,
        mark(100, 100) + wordmark(205, 98) + tagline(209, 174), "Craft by Payal"),
    "craftbypayal-logo-stacked.svg": svg(400, 400,
        mark(200, 120, 1.05) + wordmark(206, 268, "middle") + tagline(202, 362, "middle"), "Craft by Payal"),
    "craftbypayal-icon.svg": svg(160, 160, mark(80, 80, 1.05), "Craft by Payal icon"),
}
for n, s in files.items():
    open(os.path.join(OUT, n), "w", encoding="utf-8").write(s)
print("ok", list(files))
