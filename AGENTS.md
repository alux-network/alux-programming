# Maintaining ALUX Programming

This repository contains the original mdBook in `src/` and a multilingual reader in `web/`. Read [web/AGENTS.md](web/AGENTS.md) before changing reader content, typography, artwork, language routing or controls. It defines alignment, type sizes, capitalization, responsive behavior and the checks required after a change.

- Keep the book's meaning, author attribution, equations, code, heading anchors and existing source links intact. Use semantic Markdown heading levels. Register new chapters in `src/SUMMARY.md`.
- Do not edit `web/public/content.json`, copied `web/public/book-assets/` files or `web/dist/` by hand. Generate them with the existing scripts.
- The two magic reading modes share their type scale in `web/reader-presentation.css`. A fix must cover both `.folio-content` and `.continuous-prose`. Check the real reader separately.
- The web illustration mapping lives in `web/scripts/content.mjs`; see [web/ARTWORK.md](web/ARTWORK.md) for source and runtime assets. Retain original mdBook illustrations unless the task explicitly changes those sources.
- Keep the root English README and `docs/README.<language>.md` language introductions consistent. Use language names, relative links and a clear active-language marker. GitHub README links do not perform the website's automatic language selection.
- Keep public introductions concise and factual. Do not insert internal production notes, unverified deployment claims or private correspondence into the reader or README.
- Run `pnpm --dir web build` and the checks relevant to the changed behavior. Shared presentation changes require day/night, book/scroll, desktop/tablet/phone and all supported languages, including RTL. Inspect rendered pages as well as computed values.
- Follow the user's current branch and PR scope. Preserve unrelated changes; do not merge, enable auto-merge, deploy, change licensing or replace the publishing workflow without authorization.
