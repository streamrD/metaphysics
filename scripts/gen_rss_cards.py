#!/usr/bin/env python3
"""Generate landscape RSS/feed thumbnail cards for each essay.

Feed readers (Feedly etc.) crop thumbnails to a landscape card, which mangles
the square cover art. These purpose-built 1200x630 cards show just the title
and subtitle (the essay's tagline quote) on the deck's own background colour,
so they stay legible at thumbnail size and never get content cropped away.

The background colour is sampled directly from each essay's existing cover
rollover PNG, so cards always match their deck. Run from the repo root:

    .venv/bin/python scripts/gen_rss_cards.py            # all essays
    .venv/bin/python scripts/gen_rss_cards.py 11 4       # only these essay nums
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
REG  = '/System/Library/Fonts/Supplemental/Georgia.ttf'
ITAL = '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'

W, H = 1200, 630
MARGIN = 120
MAXW = W - 2 * MARGIN

# Text palette (shared dark-deck palette, readable on every sampled bg)
CREAM = (240, 235, 224)   # title
TAN   = (212, 200, 168)   # subtitle / quote
GOLD  = (200, 168, 74)    # divider

# Inset frame in a darker shade of the deck colour
BORDER = 32               # frame thickness in px
BORDER_DARKEN = 0.6       # multiply the bg toward black (not all the way)


def darken(rgb, factor):
    return tuple(int(c * factor) for c in rgb)


def sample_bg(img_path):
    im = Image.open(img_path).convert('RGB')
    w, h = im.size
    corners = [im.getpixel(xy) for xy in [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)]]
    return max(set(corners), key=corners.count)


def wrap(draw, text, font, maxw):
    words = text.split()
    lines, cur = [], ''
    for wd in words:
        trial = f'{cur} {wd}'.strip()
        if draw.textlength(trial, font=font) <= maxw:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, font_path, italic_ok, maxw, start, min_size, max_lines):
    """Shrink the font until the text wraps into <= max_lines within maxw."""
    size = start
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        lines = wrap(draw, text, font, maxw)
        if len(lines) <= max_lines:
            return font, lines
        size -= 2
    font = ImageFont.truetype(font_path, min_size)
    return font, wrap(draw, text, font, maxw)


def line_height(font):
    asc, desc = font.getmetrics()
    return asc + desc


def draw_centered(draw, lines, font, y, fill, leading):
    for ln in lines:
        w = draw.textlength(ln, font=font)
        draw.text(((W - w) / 2, y), ln, font=font, fill=fill)
        y += leading
    return y


def make_card(out, bg, title, quote, border=BORDER):
    # Darker inset frame: fill with the darkened shade, then the main field
    img = Image.new('RGB', (W, H), darken(bg, BORDER_DARKEN))
    d = ImageDraw.Draw(img)
    d.rectangle([border, border, W - 1 - border, H - 1 - border], fill=bg)

    f_title, title_lines = fit(d, title, REG, False, MAXW, 92, 56, 3)
    f_quote, quote_lines = fit(d, quote, ITAL, True, MAXW, 40, 28, 3)

    title_lead = int(line_height(f_title) * 0.98)
    quote_lead = int(line_height(f_quote) * 1.12)

    gap_div = 46          # title block -> divider
    gap_quote = 44        # divider -> quote
    title_h = title_lead * len(title_lines)
    quote_h = quote_lead * len(quote_lines)
    total = title_h + gap_div + 18 + gap_quote + quote_h

    y = (H - total) / 2
    # Title (cap-top alignment looks tighter than baseline)
    y = draw_centered(d, title_lines, f_title, y - f_title.getbbox('Ag')[1] * 0.15, CREAM, title_lead)

    # Divider: short lines + gold diamond, centred
    cy = int(y + gap_div - title_lead + title_lead)  # just below title block
    cy = int(y + gap_div - 10)
    cx = W // 2
    line_col = tuple((c + b) // 2 for c, b in zip(GOLD, bg))
    d.line([(cx - 75, cy), (cx - 16, cy)], fill=line_col, width=2)
    d.polygon([(cx, cy - 8), (cx + 8, cy), (cx, cy + 8), (cx - 8, cy)], fill=GOLD)
    d.line([(cx + 16, cy), (cx + 75, cy)], fill=line_col, width=2)

    # Quote / subtitle
    qy = cy + gap_quote
    draw_centered(d, quote_lines, f_quote, qy - f_quote.getbbox('Ag')[1] * 0.15, TAN, quote_lead)

    img.save(out)
    return out


def main():
    essays = json.load(open(ROOT / 'src/essays.json'))
    only = set(sys.argv[1:])
    for e in essays:
        if only and e['num'] not in only and e['num'].lstrip('0') not in only:
            continue
        rollover = ROOT / ('public' + e['indexRollover'])
        bg = sample_bg(rollover)
        out = rollover.parent / rollover.name.replace('cover_rollover', 'rss_card')
        make_card(out, bg, e['title'], e['quote'])
        print(f"wrote {out.relative_to(ROOT)}  bg={bg}")


if __name__ == '__main__':
    main()
