"""Generate the R&A Concrete logo SVGs.

Everything is outlined (no live text), so the files render identically
anywhere and can be handed to a sign shop, embroiderer or vinyl cutter.

    pip install fonttools brotli
    python3 tools/build_logos.py
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "assets/fonts/archivo-var.woff2"
OUT = ROOT / "assets/brand"

CHARCOAL = "#22221F"
IVORY = "#F3EFE7"
OXIDE = "#A8432A"
OXIDE_LIGHT = "#D9785A"

# ─── Mark: two slabs separated by a saw-cut joint, letters cut through ───
# 120 × 120 grid. Outer corners carry a 4-unit chamfer, like a form edge.
MARK = " ".join([
    # left slab / right slab
    "M4 0H58V120H4L0 116V4Z",
    "M62 0H116L120 4V116L116 120H62Z",
    # R (outline, then counter) — chamfered bowl, straight diagonal leg
    "M11 28H37L47 38V55L41.5 61.5L49 92H36.5L30 66H23V92H11Z",
    "M23 39H33L35 41V51L33 53H23Z",
    # A (outline with notch, then counter)
    "M69 92L85 28H97L113 92H100L96.75 79H85.25L82 92Z",
    "M87 72H95L91 56Z",
])


def font_instance(wght):
    f = TTFont(FONT)
    return instancer.instantiateVariableFont(f, {"wght": wght, "wdth": 118})


def text_path(font, text, cap, x, baseline, tracking=0.0):
    """Outline `text` so its cap height equals `cap` units. Returns (d, width)."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = cap / font["OS/2"].sCapHeight
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    cursor = x
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        glyph = gs[name]
        tp = TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline))
        glyph.draw(tp)
        cursor += glyph.width * scale
        if i < len(text) - 1:
            cursor += tracking
    return pen.getCommands(), cursor - x


def natural_width(font, text, cap):
    return text_path(font, text, cap, 0, 0)[1]


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        f'role="img" aria-labelledby="t"><title id="t">{title}</title>\n{body}\n</svg>\n'
    )


def build():
    bold = font_instance(700)
    medium = font_instance(560)
    OUT.mkdir(parents=True, exist_ok=True)

    # Line 1: "R" "&" "A" — kept as separate paths so the ampersand can take the accent.
    CAP1, CAP2 = 60, 17
    track1 = 5
    parts, cursor = [], 0.0
    for i, ch in enumerate("R&A"):
        d, w = text_path(bold, ch, CAP1, cursor, CAP1)
        parts.append(d)
        cursor += w + (track1 if i < 2 else 0)
    line1_w = cursor
    # Line 2 justified to line 1's width.
    l2 = "CONCRETE LLC"
    nat = natural_width(medium, l2, CAP2)
    track2 = (line1_w - nat) / (len(l2) - 1)

    def lockup(ox, oy, colors):
        mark_c, text_c, amp_c = colors
        r, amp, a = parts
        l2d, _ = text_path(medium, l2, CAP2, 0, 0, track2)
        return (
            f'<g transform="translate({ox:.2f} {oy:.2f})">'
            f'<path fill="{text_c}" d="{r} {a}"/>'
            f'<path fill="{amp_c}" d="{amp}"/>'
            # joint line between the two lines of type
            f'<rect x="0" y="{CAP1 + 18}" width="{line1_w:.2f}" height="3" fill="{text_c}" opacity=".35"/>'
            f'<path fill="{text_c}" transform="translate(0 {120 - 0})" d="{l2d}"/>'
            f"</g>"
        ), line1_w

    variants = {
        "color": (CHARCOAL, CHARCOAL, OXIDE),
        "reverse": (IVORY, IVORY, OXIDE_LIGHT),
        "black": ("#000", "#000", "#000"),
        "white": ("#FFF", "#FFF", "#FFF"),
    }

    # Mark ─────────────────────────────────────────────
    for name, (mark_c, _, _) in variants.items():
        (OUT / f"ra-mark-{name}.svg").write_text(
            svg(120, 120, f'<path fill="{mark_c}" fill-rule="evenodd" d="{MARK}"/>', "R&amp;A Concrete mark")
        )

    # Favicon adapts to dark browser chrome.
    (OUT / "favicon.svg").write_text(
        svg(
            120, 120,
            f"<style>path{{fill:{CHARCOAL}}}@media (prefers-color-scheme:dark){{path{{fill:{IVORY}}}}}</style>"
            f'<path fill-rule="evenodd" d="{MARK}"/>',
            "R&amp;A Concrete",
        )
    )

    # Horizontal lockup ────────────────────────────────
    gap = 30
    for name, cols in variants.items():
        body, lw = lockup(120 + gap, 0, cols)
        w = 120 + gap + lw
        (OUT / f"ra-logo-horizontal-{name}.svg").write_text(
            svg(w, 120, f'<path fill="{cols[0]}" fill-rule="evenodd" d="{MARK}"/>{body}', "R&amp;A Concrete LLC")
        )

    # Stacked lockup ───────────────────────────────────
    for name, cols in variants.items():
        _, lw = lockup(0, 0, cols)
        w = max(lw, 120)
        mx = (w - 120) / 2
        body, _ = lockup((w - lw) / 2, 120 + 34, cols)
        (OUT / f"ra-logo-stacked-{name}.svg").write_text(
            svg(
                w, 120 + 34 + 120,
                f'<path transform="translate({mx:.2f} 0)" fill="{cols[0]}" fill-rule="evenodd" d="{MARK}"/>{body}',
                "R&amp;A Concrete LLC",
            )
        )
    print("line1 width", round(line1_w, 1), "line2 tracking", round(track2, 2))


if __name__ == "__main__":
    build()
