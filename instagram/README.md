# Instagram decks

Post-ready carousel decks for Instagram — **one folder per essay** (`{n}-{slug}/`),
each a complete set of `essay{n}_slide_01…NN.png` (1080×1080).

These are the **Instagram** versions: the final slide carries a
`READ THE ESSAY ONLINE → LINK IN BIO` call to action.

The **online** variants live in `public/slides/{n}-{slug}/` and are identical
except the final slide drops the CTA and closes with the deck's tailpiece
instead. Since the Nocturne redesign (July 2026) the website no longer displays
slide decks at all — `public/slides/` is kept as the online-variant archive and
for the `essay{n}_rss_card.png` OG/RSS cards, which the server still serves.

This folder is **not web-served** — it's a local archive to grab from when
publishing to Instagram.

## What differs from the online (`public/slides/`) version

- **Essay 13** — the Instagram final slide carries the `READ THE ESSAY ONLINE →
  LINK IN BIO` CTA; the online one drops it and closes with an asterism
  tailpiece. Both are rendered from `scripts/gen_deck13.py` in one run.
- **Essays 1–12** — produced by an external pipeline (no generator here). Their
  Instagram final slides keep their original footer (`METAPHYSICS.UP.RAILWAY.APP`
  on 1–9, `LINK IN BIO` promo on 11–12; essay 10 had no footer). The online
  versions in `public/slides/` had that footer painted out. This folder holds
  the untouched originals.
