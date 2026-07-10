# Instagram decks

Post-ready carousel decks for Instagram — **one folder per essay** (`{n}-{slug}/`),
each a complete set of `essay{n}_slide_01…NN.png` (1080×1080).

These are the **Instagram** versions: the final slide carries a
`READ THE ESSAY ONLINE → LINK IN BIO` call to action.

Since the Nocturne redesign (July 2026) the website no longer displays slide
decks at all. `public/slides/{n}-{slug}/` now holds only each essay's
`essay{n}_rss_card.png` OG/RSS card, which the server still serves. The old
"online variant" decks (final slide without the CTA) were removed from the
working tree in the post-redesign cleanup — recover them from git history
(commit `762ef44` and earlier) if ever needed. **This folder is the canonical
deck archive.**

This folder is **not web-served** — it's a local archive to grab from when
publishing to Instagram.

## How these decks relate to the retired "online variant" decks

Each deck once had a second, website-served variant identical except for the
final slide (CTA removed). Those variants are now only in git history.

- **Essay 13** — the Instagram final slide carries the `READ THE ESSAY ONLINE →
  LINK IN BIO` CTA; the online variant dropped it and closed with an asterism
  tailpiece. Both are rendered by `scripts/gen_deck13.py` in one run.
- **Essays 1–12** — produced by an external pipeline (no generator in this
  repo). Their Instagram final slides keep their original footer
  (`METAPHYSICS.UP.RAILWAY.APP` on 1–9, `LINK IN BIO` promo on 11–12; essay 10
  had no footer); the online variants had that footer painted out. This folder
  holds the untouched originals.
