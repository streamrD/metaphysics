#!/usr/bin/env python3
"""Remove the "01 / NN" slide counter from index thumbnails.

The index cover thumbnails (`*_cover_rollover.png` and `*_slide_01_gray.png`)
for several essays were derived from the deck's first slide, which carries a
gold "01 / NN" counter in the top-right corner. That counter is meaningful on
the in-carousel slides but not on the index covers, where there is no sequence.

This script scans only the top-right counter zone (the header text and its
tails sit lower and further left, so they are never touched), and if it finds
ink there, paints a margin-padded box over it with the thumbnail's own flat
background colour. It is idempotent — already-clean thumbnails are skipped.

    .venv/bin/python scripts/strip_counter.py            # all index thumbs
    .venv/bin/python scripts/strip_counter.py --dry-run  # report only
"""
import glob
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

# Counter zone: top-right only. Header tails (e.g. "...VILLAIN") live lower
# (y > 120) and further left (x < 810), so they fall outside this window.
ZONE = (865, 45, None, 108)   # x0, y0, x1(=width-8), y1
MARGIN = 14                   # padding added around detected ink before fill
THRESH = 38                   # per-pixel colour distance from bg to count as ink


def bg_of(im):
    w, h = im.size
    corners = [im.getpixel(xy) for xy in [(5, 5), (w - 6, 5), (5, h - 6), (w - 6, h - 6)]]
    return max(set(corners), key=corners.count)


def find_counter(im, bg):
    w, _ = im.size
    x0, y0, _, y1 = ZONE
    x1 = w - 8
    minx = miny = 10 ** 9
    maxx = maxy = -1
    px = im.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if sum(abs(a - b) for a, b in zip(px[x, y], bg)) > THRESH:
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
    return None if maxx < 0 else (minx, miny, maxx, maxy)


def main():
    dry = '--dry-run' in sys.argv
    patterns = ['public/slides/*/essay*_cover_rollover.png',
                'public/slides/*/essay*_slide_01_gray.png']
    for pat in patterns:
        for p in sorted(ROOT.glob(pat)):
            im = Image.open(p).convert('RGB')
            bg = bg_of(im)
            box = find_counter(im, bg)
            if not box:
                print(f"clean  {p.relative_to(ROOT)}")
                continue
            x0, y0, x1, y1 = box
            fill = (x0 - MARGIN, y0 - MARGIN, x1 + MARGIN, y1 + MARGIN)
            print(f"strip  {p.relative_to(ROOT)}  counter={box} bg={bg}")
            if not dry:
                ImageDraw.Draw(im).rectangle(fill, fill=bg)
                im.save(p)


if __name__ == '__main__':
    main()
