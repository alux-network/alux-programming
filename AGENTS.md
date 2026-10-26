# Maintaining ALUX Programming

This repository contains the original mdBook in `src/` and a multilingual reader in `web/`. Read [web/AGENTS.md](web/AGENTS.md) before changing reader content, typography, artwork, language routing or controls. It defines alignment, type sizes, capitalization, responsive behavior and the checks required after a change.

- Keep the book's meaning, author attribution, equations, code, heading anchors and existing source links intact. Use semantic Markdown heading levels. Register new chapters in `src/SUMMARY.md`.
- Do not edit `web/public/content.json`, localized `web/public/content/`, copied `web/public/book-assets/` files or `web/dist/` by hand. Generate them with the existing scripts.
- The two magic reading modes share their type scale in `web/reader-presentation.css`. A fix must cover both `.folio-content` and `.continuous-prose`. Check the real reader separately.
- The web illustration mapping lives in `web/scripts/reader-presentation.ts`; see [web/ARTWORK.md](web/ARTWORK.md) for source and runtime assets. Retain original mdBook illustrations unless the task explicitly changes those sources.
- Keep the root English README and `docs/README.<language>.md` language introductions consistent. Use language names, relative links and a clear active-language marker. GitHub README links do not perform the website's automatic language selection.
- Keep public introductions concise and factual. Do not insert internal production notes, unverified deployment claims or private correspondence into the reader or README.
- Preserve mdBook as the content compiler. The typed JSON backend owns chapter structure; the native HTML renderer owns Markdown, preprocessors and canonical anchors. The shared model and localization live in `web/src/`; reader-specific code handles presentation and interaction only. Do not restore a second Markdown compiler or manual SUMMARY parser.
- Translations belong beside canonical chapters as `chapter.<lang>.md`, selected by the web-only mdBook preprocessor. Keep one SUMMARY and stable chapter/heading identities, with English fallback for missing files. UI messages belong in `web/locales/ui/`; never restore prose dictionaries, token alignment or runtime DOM translation. Solid components own app state; imperative code is limited to opaque content, layout/animation and browser media adapters. Read `web/docs/source-localization-migration.md` before revising this boundary.
- Run `pnpm --dir web build`, `pnpm --dir web test` and the checks relevant to the changed behavior. Shared presentation changes require day/night, book/scroll, desktop/tablet/phone and all supported languages, including RTL. Inspect rendered pages as well as computed values.
- Follow the user's current branch and PR scope. Preserve unrelated changes; do not merge, enable auto-merge, deploy, change licensing or replace the publishing workflow without authorization.

## Measurable acceptance, not another rewrite

Follow [the merge acceptance ledger](web/docs/merge-acceptance.md) and [Tomislav's acceptance review](https://github.com/alux-network/alux-programming/pull/2#issuecomment-6420843360). Fix reproducible blockers; do not reopen the accepted architecture or redesign the readers.

- Opening a chapter measures only its own layout resources. Do not paginate unseen chapters, even in background work, to obtain a global total. The owner selected explicitly labelled chapter progress until reliable exact-layout counts are available from real visits.
- Verify lifecycle cleanup and interrupted page turns with repeated browser scenarios; source inspection or one final screenshot is insufficient.
- English edits warn about potentially stale translations. Builds never silently mark translations reviewed or update their fingerprints.
- Verify a fresh tracked checkout with frozen installation, strict types, compiler lint, build/tests, deterministic repeated generated output and resolved links/anchors/assets. Add frontend CI without replacing original publishing.
- Mark each criterion **PASS / FAIL / NOT TESTED**, with command, actual engine/browser version and evidence. Mobile-profile Chromium/WebKit are simulations, not physical Android/iOS results. The owner has Android but no iPhone/iPad.
- Update this guide, `web/AGENTS.md` and the ledger together. Record remaining merge gates; local success is not authorization to merge or enable auto-merge.
