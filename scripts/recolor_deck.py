#!/usr/bin/env python3
"""Recolour a slide deck's flat background to a new colour, losslessly.

The essay decks share an identical text palette (cream / tan / gold / muted);
only the background colour differs between decks. Every pixel is therefore a
blend of one known text colour over the deck background. We recover that blend
(alpha-unmix against SRC_BG) and recomposite it over DST_BG, so anti-aliased
text edges stay crisp with no colour fringe.

Used to repaint the Apprentice deck from forest green to Unity's dark brown:

    .venv/bin/python scripts/recolor_deck.py 44,61,46 42,34,24 \
        public/slides/11-apprentice/essay11_slide_0[1-7].png
"""
import sys
import numpy as np
from PIL import Image

# Shared foreground palette across all decks (pure ink colours)
PALETTE = np.array([
    (240, 235, 224),   # cream  — titles / body
    (212, 200, 168),   # tan    — quote / subtitle
    (200, 168, 74),    # gold   — dividers / accents
    (168, 152, 120),   # muted  — headers / footers / page numbers
], dtype=np.float64)


def recolor(path, src_bg, dst_bg):
    im = Image.open(path).convert('RGB')
    P = np.asarray(im, dtype=np.float64)          # H x W x 3
    src = np.array(src_bg, float)
    dst = np.array(dst_bg, float)

    out = np.repeat(dst[None, None, :], P.shape[0], 0).repeat(P.shape[1], 1).copy()
    best_err = np.full(P.shape[:2], np.inf)

    # For each ink colour T, model pixel = a*T + (1-a)*src; solve for coverage a,
    # keep the T that explains the pixel best, recomposite as a*T + (1-a)*dst.
    for T in PALETTE:
        v = T - src
        a = ((P - src) @ v) / (v @ v)
        a = np.clip(a, 0.0, 1.0)[..., None]
        recon = src + a * v
        err = np.sum((P - recon) ** 2, axis=2)
        take = err < best_err
        cand = a * T + (1.0 - a) * dst
        out[take] = cand[take]
        best_err[take] = err[take]

    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(path)
    print('recoloured', path)


def parse(rgb):
    return tuple(int(x) for x in rgb.split(','))


if __name__ == '__main__':
    src_bg = parse(sys.argv[1])
    dst_bg = parse(sys.argv[2])
    for p in sys.argv[3:]:
        recolor(p, src_bg, dst_bg)
