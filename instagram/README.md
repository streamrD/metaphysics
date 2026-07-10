# Instagram decks

Post-ready carousel decks for Instagram — **one folder per essay** (`{n}-{slug}/`),
each a complete set of `essay{n}_slide_01…NN.png` (1080×1080).

These are the **Instagram** versions: the final slide carries a
`READ THE ESSAY ONLINE → LINK IN BIO` call to action.

The **online** versions the website serves live in `public/slides/{n}-{slug}/`
and are identical except the final slide drops the CTA (the reader is already
online) and closes with the deck's asterism tailpiece instead.

This folder is **not web-served** — it's a local archive to grab from when
publishing to Instagram.

## Regenerating (essay 13 only, for now)

`scripts/gen_deck13.py` renders both variants in one run — the online deck into
`public/slides/13-diminished/` and the Instagram deck here. Older decks were
produced by an external pipeline and only exist as the PNGs already committed.
