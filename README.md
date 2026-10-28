# <img src="public/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX programming guidelines

A book about **designing programs by meaning first** — specifying *what* a program means before deciding *how* it runs — in the style of Conal Elliott's Denotational Design, with a concrete path into Rust.

It provides the foundation for understanding and contributing to ALUX’s meaning-first codebase.

Built with [mdBook] and published to GitHub Pages: <https://alux-network.github.io/alux-programming/>

## What's inside

The book is organized in four parts (full table of contents in [`src/SUMMARY.md`](src/SUMMARY.md)):

- **The Semantic View** — denotations, compositionality, laws and interpretations, dependent types: the meaning-first foundation.
- **Design by Meaning in Rust** — capability algebras, derived meaning and composition, interpreters and effects, laws/scenarios/evidence, first-order programs, compiler pipelines, and a meaning-first workflow.
- **Concepts** — operational semantics, the expression problem, referential transparency, free monads, continuation-passing style, defunctionalization, branching and confluence.
- **Insights** — short essays connecting those concepts back to the semantic view (semantics to machines, the expression problem reloaded, referential transparency reloaded, and the EVM as an algebra).

## Build and run locally

Requires a Rust toolchain (`mdbook-admonish` needs rustc 1.64 or newer) and Node.js 22.18 or newer, which runs the TypeScript translation preprocessor directly. Install mdBook and the preprocessors, pinned to the versions the CI uses:

```sh
cargo install mdbook --version 0.4.52 --locked
cargo install mdbook-admonish --version 1.20.0 --locked
cargo install mdbook-katex --version 0.9.4 --locked
cargo install mdbook-linkcheck --version 0.7.7 --locked
```

### Reading

The magic world is a paged book with a fixed-width sidebar. Text size, manual language choice and normalized progress within each edition's chapter are remembered locally. Folios explicitly describe chapter progress. CJK search uses the same lazy-loaded mdBook edition index, with substring matching for scripts that mdBook's default word tokenizer does not segment.

### Develop

Install the Node packages once, then start the dev server (opens on <http://localhost:3478>):

```sh
npm install
npm start
```

[Vite] serves the full site from `book/html`: English at the root, each translation under `/<lang>/`, and the files in `public/` at the root. It builds every edition on start, rebuilds when the book's sources (`src/`, `theme/`, `book.toml`) change and reloads the page once the build is done. The reader is served from its TypeScript source in `web/`, so a change there only reloads the page.

To work on one language with mdBook's own faster live reload (without `public/`, so fonts, art and audio are missing):

```sh
MDBOOK_BOOK__LANGUAGE=de mdbook serve --open
```

### Build

Build every edition into `book/html`, the directory CI publishes. mdBook renders the editions first; then Vite bundles the reader into `/reader.js` and copies `public/` to the site root:

```sh
npm run build
npm run check    # type-check web/ and vite.config.ts
```

### Test

After `npm run build` (and not while `npm start` is running, since both write `book/html`):

```sh
npx playwright install chromium firefox webkit   # once per Playwright version
npm test
```

- **Site** (`web/test/site.test.ts`): the expected site comes from mdBook's own book for every edition (a renderer, `web/test/book-json.ts`, saves the book mdBook parsed, after the translation preprocessor). Every chapter page must exist in every edition with its `lang`, `dir` and title, no unexpected page may exist, and every link, anchor and asset must resolve. Negative tests check that a removed or extra page, a renamed chapter, a broken anchor, a missing asset and a wrong title are each reported.
- **Translations** (`web/test/translations.test.ts`): every `chapter.<lang>.md` keeps its English chapter's code blocks, math, link targets, embedded media and heading levels.
- **Build** (`web/test/build.test.ts`): two clean builds of every edition are identical.
- **Browser** (`web/test/browser.test.ts`): the same reader scenarios on desktop Chromium, Firefox and WebKit, plus Pixel 7/Chromium and iPhone 13/WebKit simulations. Covers both worlds, all editions, navigation/history, chapter progress, RTL, bookmarks, CJK search (including delayed scripts), resize/orientation, rendered technical content and navigation audio. Routes come from mdBook's expected site. Missing engines fail the run. These profiles do not replace physical Android Chrome or iOS Safari acceptance. Set `ALUX_BROWSER_PROFILE` to a profile name (`chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `android-chromium`, `iphone-webkit`) to diagnose just that profile; omit it for the full matrix.

The site must be served from the server root, because the files in `public/` are linked from it (`/wizard-standing.webp`, `/audio/…`).

## Translations

English chapters and `src/SUMMARY.md` are canonical. A translation lives next to its chapter as `chapter.<lang>.md` (`ar de es ja ko ru uk vi zh zh-hant`); a missing translation falls back to English. `web/localize.ts` is the mdBook preprocessor that swaps the sources in for the edition's `book.language`.

A translation starts with a metadata comment:

```html
<!-- reader: {"title":"…","parts":{"Welcome":"…"},"sourceHash":"sha256:…"} -->
```

`title` names the chapter, `parts` (in `index.<lang>.md` only) names the part titles, and `sourceHash` fingerprints the English chapter the translation was reviewed against. When the English chapter changes, the build prints `translation may be stale` with the new fingerprint; review the translation, then set `sourceHash` to it.

UI labels for each language are in `web/i18n.ts`, keyed by the English label. To add a language, add it to `web/languages.ts` (the build, the language picker and the tests read it) and its labels to `web/i18n.ts`, plus `public/audio/welcome/<lang>.mp3` and `public/social/alux-programming-<lang>.jpg`.

## Reader

The reader is the mdBook page with two worlds, chosen on the index page and switched with the book button:

- **Real world:** the chapter as one scrolling page in book typography.
- **Magic world:** a bound two-page volume. CSS columns lay the chapter out as pages; arrow keys, Page Up/Down, Space and the buttons below the book turn a spread, and turning past the last page opens the next chapter.

Text size, bookmarks, reading music and the language picker are in the menu bar. Preferences and bookmarks are stored in the browser (`localStorage`).

## Repository layout

```
src/            book content (Markdown), with SUMMARY.md as the table of contents
src/**/*.<lang>.md  translations, next to their English chapter
theme/          page template (index.hbs), reader.css, CSS, mdbook-admonish assets
web/            TypeScript: languages.ts, reader.ts and i18n.ts (bundled to /reader.js), localize.ts (translation preprocessor), mdbook.ts (builds every edition)
web/test/       site, translation, build and browser tests (`npm test`)
public/         images, fonts, art, audio and social cards, copied once to the site root
vite.config.ts  build: mdBook editions, then the reader bundle; dev server with rebuild and reload
book.toml       mdBook config: preprocessors (localize, admonish, katex), linkcheck, HTML output
.github/        CI workflow that builds and publishes the book
book/           generated output (git-ignored)
```

## Conventions

- **Callouts** — [mdbook-admonish] fenced blocks in the `note` / `tip` / `warning` / `quote` styles, each with an optional `title`.
- **Math** — KaTeX via [mdbook-katex], written with `$…$` (inline) and `$$…$$` (display).
- **Links** — `mdbook-linkcheck` runs as part of the build, so cross-links must resolve. Register each new page in [`src/SUMMARY.md`](src/SUMMARY.md).

## Publishing

On every push to `master`, GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) runs `npm ci`, `npm run check`, `npm run build` and `npm test`, and publishes `book/html` to the `github-pages` branch. Pull requests targeting `master` or `npm-ws`, and pushes to `fix/**`, run the same checks without publishing. CI installs all three Playwright engines and their system dependencies; only pushes to `master` publish.

## Status and license

The book is pre-release and evolving alongside ALUX. Licensing follows the ALUX project; a license file will be added when the project is open-sourced.

[mdBook]: https://rust-lang.github.io/mdBook/
[mdbook-admonish]: https://tommilligan.github.io/mdbook-admonish/
[mdbook-katex]: https://github.com/lzanini/mdbook-katex
[Vite]: https://vite.dev/
