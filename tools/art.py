"""Hand-drawn style SVG symbols (line art + small icons) shared by generated pages."""
import math


def _leaf(x, y, ang, s, filled=False, cls=""):
    # an almond leaf outline with a centre vein, rotated around (x, y)
    d = "M0 0 C6 -9 20 -12 34 -4 C22 4 7 6 0 0Z"
    vein = "M2 -1 C12 -5 22 -6 30 -4"
    fill = 'fill="currentColor" fill-opacity=".14"' if filled else 'fill="none"'
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f}) scale({s:.2f})">'
            f'<path d="{d}" {fill} stroke="currentColor" stroke-width="1.3" vector-effect="non-scaling-stroke"/>'
            f'<path d="{vein}" fill="none" stroke="currentColor" stroke-width=".9" vector-effect="non-scaling-stroke"/></g>')


def botanical():
    """Tall line-art sprig with leaves and berries (stroke = currentColor)."""
    parts = ['<path d="M48 236 C46 180 54 120 92 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
             '<path d="M58 150 C70 140 84 138 100 142" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>']
    pts = [(48, 214, -150, 1.25), (49, 196, -28, 1.2), (51, 172, -155, 1.15), (54, 150, -24, 1.1), (58, 128, -158, 1.05),
           (63, 106, -22, 1.0), (69, 84, -160, .95), (76, 62, -20, .9), (84, 40, -150, .8), (90, 24, -40, .7)]
    for i, (x, y, a, s) in enumerate(pts):
        parts.append(_leaf(x, y, a, s, filled=i % 3 == 0))
    for (x, y) in [(100, 142), (95, 136), (104, 134), (98, 128)]:
        parts.append(f'<circle cx="{x}" cy="{y}" r="2.6" fill="none" stroke="currentColor" stroke-width="1.1"/>')
    return f'<symbol id="botanical" viewBox="0 0 120 240">{"".join(parts)}</symbol>'


def wreath_check():
    """Gold ring with a check, wrapped in a floral spray and a ribbon (multi-colour)."""
    p = ['<circle cx="100" cy="100" r="54" fill="#FFFDF9" stroke="#C9A35E" stroke-width="5"/>',
         '<circle cx="100" cy="100" r="46" fill="none" stroke="#E8D3A8" stroke-width="1.5"/>',
         '<path d="M76 102 L94 120 L128 82" fill="none" stroke="#C9A35E" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>']
    # leaves along the lower-left arc
    for k, deg in enumerate(range(110, 275, 14)):
        r = math.radians(deg); x = 100 + 70 * math.cos(r); y = 100 + 70 * math.sin(r)
        ang = deg + (60 if k % 2 else -60)
        col = "#6E9A72" if k % 3 else "#8DB592"
        p.append(f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang})"><path d="M0 0 C5 -8 17 -10 28 -3 C18 3 6 5 0 0Z" fill="{col}"/></g>')
    # flowers
    def flower(cx, cy, r, col):
        out = []
        for i in range(5):
            a = math.radians(i * 72 - 90)
            out.append(f'<ellipse cx="{cx + r * math.cos(a):.1f}" cy="{cy + r * math.sin(a):.1f}" rx="{r * .75:.1f}" ry="{r * .55:.1f}" transform="rotate({i * 72} {cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f})" fill="{col}"/>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r * .45:.1f}" fill="#E8B04B"/>')
        return "".join(out)
    p.append(flower(44, 62, 10, "#EE8F86"))
    p.append(flower(32, 128, 7, "#F4B7AE"))
    p.append(flower(62, 170, 6, "#EE8F86"))
    # berries
    for (x, y) in [(150, 44), (158, 52), (146, 56), (164, 40)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="3.2" fill="#D9565C"/>')
    p.append('<path d="M140 64 C150 54 156 46 168 34" fill="none" stroke="#6E9A72" stroke-width="1.6" stroke-linecap="round"/>')
    # ribbon bow
    p.append('<path d="M86 156 C70 146 60 160 72 168 C80 172 88 164 94 158 M106 158 C112 164 120 172 128 168 C140 160 130 146 114 156 M94 158 L84 186 M106 158 L118 186" '
             'fill="none" stroke="#D9565C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    p.append('<circle cx="100" cy="157" r="5" fill="#D9565C"/>')
    # sparkles
    for (x, y, s) in [(160, 120, 5), (24, 96, 4), (150, 168, 3.5)]:
        p.append(f'<path d="M{x} {y - s} Q{x} {y} {x + s} {y} Q{x} {y} {x} {y + s} Q{x} {y} {x - s} {y} Q{x} {y} {x} {y - s}Z" fill="#E0BA7E"/>')
    return f'<symbol id="wreath-check" viewBox="0 0 200 200">{"".join(p)}</symbol>'


HOUSE_ART = '''<symbol id="house-art" viewBox="0 0 240 170"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
<path d="M58 150V78L120 32l62 46v72"/><path d="M48 86L120 26l72 60"/><path d="M104 150v-48a16 16 0 0 1 32 0v48"/><path d="M110 112h20M110 124h20M120 102v48"/>
<rect x="70" y="92" width="22" height="22" rx="2"/><path d="M81 92v22M70 103h22"/><rect x="148" y="92" width="22" height="22" rx="2"/><path d="M159 92v22M148 103h22"/>
<circle cx="120" cy="62" r="7"/><path d="M30 150h182"/>
<path d="M26 150l4-22h18l4 22"/><path d="M39 128c-2-12-10-18-16-20 4 8 8 14 16 20zM39 128c0-14 6-22 13-25-1 10-5 18-13 25zM39 128v-12"/>
<path d="M188 150l4-20h16l4 20"/><path d="M200 130c-3-10-10-15-15-17 3 7 7 12 15 17zM200 130c1-12 7-19 13-21-1 9-5 16-13 21z"/>
<path d="M196 98c6-20 18-30 30-34M206 86c8 0 14 3 18 8M214 76c6 1 10 5 12 10"/></g>
<g fill="currentColor" fill-opacity=".55"><circle cx="34" cy="112" r="2.4"/><circle cx="46" cy="106" r="2"/><circle cx="194" cy="114" r="2.2"/><circle cx="222" cy="66" r="2"/></g></symbol>'''

GIFT_ART = '''<symbol id="gift-art" viewBox="0 0 90 90"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<rect x="22" y="40" width="46" height="38" rx="2"/><path d="M18 32h54v8H18zM45 32v46"/><path d="M45 32c-6-12-20-14-20-6 0 6 12 6 20 6zm0 0c6-12 20-14 20-6 0 6-12 6-20 6z"/>
<path d="M30 52l-4 4M60 52l4 4"/><path d="M14 14l3 5M10 26l5 1M76 12l-3 5M82 24l-5 1"/></g></symbol>'''

BRUSH = '<symbol id="brush" viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4 13C60 6 120 4 180 7s90 3 116 1" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></symbol>'

HEART_THREAD = ('<symbol id="heart-thread" viewBox="0 0 260 120"><path d="M2 100C40 104 70 98 96 84 122 70 128 42 112 32 96 22 80 36 88 52 '
                '96 68 120 78 150 72 180 66 220 70 258 86" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
                '<path d="M118 60c-9-6-12-12-10-17 2-5 9-6 12-1 3-5 10-4 12 1 2 5-1 11-14 17z" fill="none" stroke="currentColor" stroke-width="2"/></symbol>')

ICONS = '''<symbol id="i-trash" viewBox="0 0 24 24"><path d="M4.5 7h15M10 7V4.8h4V7M6.5 7l1 12.5h9L17.5 7M10 10.5v6M14 10.5v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v5.5M12 7.8v.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-scissors" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="6.5" cy="17.5" r="3"/><circle cx="17.5" cy="17.5" r="3"/><path d="M8.5 15.3L17 4M15.5 15.3L7 4"/></g></symbol>
<symbol id="i-chair" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10v8H7zM6 11.5h12v3H6zM7.5 14.5v6M16.5 14.5v6M9 7h6"/></g></symbol>
<symbol id="i-image" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></g></symbol>
<symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></symbol>
<symbol id="i-frame" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><rect x="7" y="7" width="10" height="10"/><path d="M7 15l3-3 2.5 2 2-1.5 2.5 2.5"/></g></symbol>
<symbol id="i-location" viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/></symbol>'''


def symbols():
    return "\n      ".join([botanical(), wreath_check(), HOUSE_ART, GIFT_ART, BRUSH, HEART_THREAD, ICONS]) + "\n"
