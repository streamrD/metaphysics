---
description: Pull the latest published Google-Doc essay text live (diff → confirm → push → verify)
argument-hint: "[essay name/number, or blank for all]"
allowed-tools: Bash, Read
---

The user edited one or more essays in their published Google Docs and wants the changes live on the metaphysics site. Target: **$ARGUMENTS** (an essay name, number, or folder substring — blank means all essays).

Context you can rely on (verify against code if in doubt):
- Essay text is re-snapshotted from each essay's published `/pub` Doc at build time (`prebuild` → `scripts/fetch-essays.mjs`); `public/essay-content/*.html` is **gitignored**. Railway auto-deploys every push to `origin main` and re-fetches all docs during the build.
- The parser (`extractTextFromDocHtml`/`serializeInline` in `src/App.tsx`) keeps only block structure (p, h1–h5, li), wording/punctuation, links, and **literal** `[em]`/`[right]` tags. Native Doc bold/italic/color/alignment are flattened and never appear on the site.

Do this:

1. **Preview the change:** run `node scripts/diff-published.mjs $ARGUMENTS`. This fetches the current published doc(s) and word-diffs the rendered text against the live snapshot.
2. **If there are no differences:** tell the user the published copy already matches what's live — most likely Google Docs hasn't republished their edits yet (there's a ~5-min cache/propagation lag). Do **not** push. Suggest re-running in a minute.
3. **If there are differences:** summarize them briefly. Call out anything that reads as a *content* edit (added/removed words) rather than punctuation/reformatting, so the user can confirm it was intended. Note if any change appears to rely on native formatting that won't render.
4. **Refresh the local snapshot:** `npm run fetch-essays`.
5. **Trigger the rebuild** (publishing is authorized by the `/redeploy` invocation): empty commit + push —
   `git commit --allow-empty -m "Republish: <essay(s)> doc edits" && git push origin main`.
6. **Verify live:** poll `https://metaphysics.up.railway.app/essay-content/<folder>.html` (cache-bust with `?cb=$(date +%s)`) until a distinctive edited phrase appears (~1–2 min), then confirm to the user with the deploy commit and the live essay URL (`/essays/<folder>`).
