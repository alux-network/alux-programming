# ALUX programming repository guide

This file is the compact engineering authority for humans and coding agents working on the ALUX programming book. Apply it to the whole repository.

## Product

The ALUX programming guidelines: one mdBook, published in 11 languages, with a reader that adds a magic world (a paged two-column book) and a real world (the plain mdBook page), a gateway to choose between them, text size, bookmarks and reading music.

mdBook defines the book. Application configuration defines additional pages. Everything else is a derivation of those two, verification included. Do not turn this repository into a web application, a static-site generator or a second book model beside mdBook.

## Design by Meaning, applied here

This book teaches Conal Elliott's Denotational Design; the repository follows it too. Ask what the site means before choosing scripts, markup or tools.

Meaning:

```text
Book    = mdBook's book: ordered parts and chapters (path, name, content)
Edition = Language -> Book          (localize: swap content and names, keep paths)
Site    = Edition per language, rendered to pages at /<lang>/<path>.html
Reader  = World -> view of a page   (magic: spreads of columns, real: the page)
```

The primitives are `SUMMARY.md` with the English chapters, `languages.ts`, and the translations. Everything else is an interpretation of them:

- the HTML site (mdBook html renderer + template + Vite)
- the book JSON (`web/test/book-json.ts` renderer), the denotation the tests compare against
- the reader (`reader.ts`), interpreting one page in two worlds

The tests are laws over that meaning, not samples of output:

- every interpretation agrees: each chapter of the book JSON is a page of the site, with its name as title, and nothing else is
- localization preserves structure: every edition has the same paths and parts as English
- translation preserves technical content: code, math, link targets, media, heading levels
- links are closed: every link and anchor resolves inside the site
- building is a function: equal sources give byte-identical sites

Add a primitive only when new meaning is required (a new kind of page, a new edition property). Prefer a new interpretation or law over new machinery. When code and meaning disagree, fix the meaning first, then derive the code.

Reference examples (compare a change against these when unsure of direction):

- **Editions** (`languages.ts` → `mdbook.ts`, `localize.ts`): one primitive list, every edition derived by configuration and one preprocessor; no copied sources.
- **Expected site** (`book-json.ts` → `site.ts` → `site.test.ts`): the denotation taken from mdBook itself, laws checked against the HTML interpretation, each law with a broken-copy negative test.

Refactoring rule: when a part grows weak or mixed, the next step is

```text
identify the meaning -> find its single source -> derive the rest from it -> add one law with its negative test
```

not a bigger script, a second list, a post-processing pass over HTML, or an explanation in prose only.

## Layout

```text
src/            the book: SUMMARY.md and English chapters (canonical)
src/**/*.<lang>.md  translations, next to their English chapter
theme/          index.hbs (mdBook's page template plus the reader markup), reader.css
web/            TypeScript, run by Node directly (type stripping) or bundled by Vite
web/test/       node:test suites
public/         static files served at the site root: images, fonts, audio, social cards
vite.config.ts  builds the book, then the reader bundle and public/ into book/html
```

Data flows one way:

```text
book.toml + src/ + languages.ts
    -> mdBook per edition (localize.ts swaps in translations; native admonish and katex expand content)
    -> mdbook-assets.ts normalizes parsed image destinations for the HTML renderer only
    -> theme/index.hbs renders pages
    -> Vite adds /reader.js (reader.ts) and public/
    -> book/html
```

## Authority

Read authority in this order:

1. `src/SUMMARY.md`, `book.toml` and the English chapters define the book.
2. `web/languages.ts` defines the editions.
3. `theme/index.hbs` defines the page markup; `web/reader.ts` and `theme/reader.css` only bind and style it.
4. The tests in `web/test/` witness the meaning, with expectations derived from 1 and 2.
5. `book/html` is output. Never edit it and never derive an expectation from it.
6. Prose (README, this file) summarizes the artifacts above.

If these disagree, state the mismatch and fix the smallest authoritative layer that is wrong.

## Read order

1. `README.md`
2. `book.toml`, `src/SUMMARY.md`
3. `web/languages.ts`, `web/mdbook.ts`, `web/localize.ts`
4. `vite.config.ts`
5. `theme/index.hbs`, then `web/reader.ts` and `theme/reader.css`
6. `web/test/site.ts` and the tests

## Commands

```sh
npm install     # once
npm start       # dev server on http://localhost:3478, rebuilds the book on change
npm run check   # tsc, no emit
npm run build   # every edition into book/html
npm test        # needs a build; site, translation and determinism tests
```

CI runs `npm ci`, `npm run check`, `npm run build`, `npm test`, in that order. Run them before finishing. Run one build at a time: stop `npm start` before `npm run build`, they write the same directory. Run `npm test` after `npm run build`, not after a dev rebuild: in dev, Vite serves `/reader.js` and `public/` itself, so `book/html` lacks them and the site test reports broken links. mdBook and its preprocessors (mdbook-admonish, mdbook-katex, mdbook-linkcheck) must be on `PATH`.

## Rules

- Use mdBook's own mechanisms first: `book.toml`, `MDBOOK_*` environment overrides, a preprocessor, a renderer, the template. Add code only where none of these states the meaning.
- One source per fact. Languages live only in `languages.ts`; UI labels only in `i18n.ts`; chapter structure only in `SUMMARY.md`. Everything else reads them.
- Every edition has the same chapter paths. A translation changes text, never URLs, code, math, link targets, media or heading levels.
- Static files go in `public/` and are linked root-absolute (`/concepts.png`). Nothing static lives in `src/`. The HTML-only asset preprocessor runs after native admonish and katex, using parser source positions to change actual image destinations. Do not rewrite Markdown with line/fence heuristics or serialize whole chapters; preserve literal code, image labels, titles and shared link definitions.
- TypeScript only, ESM, imports with `.ts` extensions. No Python, no shell scripts in the build.
- No frameworks in the reader. It is one module binding the template's markup by element id.
- The magic world is always a paged book: no scroll reading mode in it. Continuous scrolling is the real world.
- The magic world's sidebar has a fixed width: no resize handle there. The real world keeps mdBook's resizable sidebar.
- Builds are deterministic and atomic: the same sources give byte-identical output, and a failed build leaves the previous site untouched. Once the replacement succeeds, backup cleanup is best effort: report any retained backup without treating publication as failed or suppressing the dev reload.

Reject these shapes:

- a second list of languages, chapters or pages anywhere (templates, tests, scripts)
- a test expectation read from the output it validates
- generated source trees or per-language `book.toml` copies
- post-processing rendered HTML to fix what the template or a preprocessor should produce
- a check without a negative test proving it can fail

## TypeScript conventions

Every file is a template for the next change, so comments carry the reasoning a reader cannot recover from the code:

- A file header says what the file is, who calls it and with what (protocol, input, output), and how to extend it.
- A doc comment (`/** … */`) on each exported or non-trivial function says what it returns or does, in one sentence beginning with a third-person verb.
- A line comment explains why: a browser or mdBook quirk, an ordering constraint, a non-obvious unit. Do not restate the code.
- Keep comments true when editing; update or delete them with the code they describe.
- Strict `tsc`; type external JSON (mdBook's book, context) with minimal interfaces of the fields used.
- US English. No em dashes.

## Tests

- `dev.test.ts`: startup waits for a complete initial edition build; a real watched edit triggers a rebuild, including Windows paths.
- `public-assets.test.ts`: chapter-relative image paths for native print rendering, literal code preservation, exact HTML source attributes and reference images; a native preprocessor fixture checks admonitions in chapter and print pages.
- `site.test.ts`: the built site against the editions derived from mdBook's book JSON (`book-json.ts` renderer): pages, `lang`/`dir`, titles, links, assets and anchors, plus broken-copy negative tests.
- `translations.test.ts`: each translation keeps its English chapter's code, math, link targets, media and heading levels.
- `build.test.ts`: two complete mdBook + Vite builds are identical; a failed reader bundle preserves the previous site. `mdbook.test.ts` checks directory replacement and rollback.
- `browser.test.ts`: the same reader specs in Chromium, Firefox and WebKit, plus Android/iPhone simulations, against `vite preview`. Routes come from `expectedSite()`; no copied page list. `npm test` requires all three pinned Playwright engines (`npx playwright install chromium firefox webkit`); missing engines fail instead of skipping. `ALUX_BROWSER_PROFILE` optionally selects one named profile for diagnosis. Visual design and physical-device acceptance are not asserted.

A new check goes into `verifySite` or `protectedContent` together with a negative test. Derive expected routes from `expectedSite()`; never hardcode a page list.

## Change recipes

- **Chapter:** add it to `src/SUMMARY.md` and `src/`. Tests pick it up.
- **Translation:** `chapter.<lang>.md` next to the English file, with `<!-- reader: {"title", "sourceHash"} -->`; `localize.ts` reports the current hash when stale.
- **Language:** see the header of `web/languages.ts`.
- **UI label:** English text in the template with `data-i18n` or `t('…')` in `reader.ts`, then every language in `i18n.ts`.
- **Reader feature:** markup in `theme/index.hbs`, behavior in `reader.ts`, style in `reader.css`, state documented in the `reader.ts` header.

## Gotchas

- **mdBook on `PATH`:** the build spawns `mdbook`; preprocessors warn about being built against another mdBook version, which is harmless.
- **Dev vs build output:** `npm start` leaves `book/html` without `/reader.js` and `public/`; test only after `npm run build`.
- **mdbook-linkcheck sees only `src/`:** root-absolute links into `public/` are excluded in `book.toml` and checked by the site test instead.
- **Custom renderers run with the destination as cwd:** give them an absolute command path (see `site.ts`).
- **mdBook's search script cancels every form submit and Escape:** use buttons, not `<form method="dialog">`, and stop key propagation inside dialogs.
- **mdBook turns every rendered `<h1>`–`<h6>` into an anchor link,** template headings too; use non-heading elements for UI titles.
- **`#content main` in mdBook's CSS outranks class selectors;** prefix reader rules with `#content` to win.
- **Vite dev caches transforms of `book/html`;** the plugin invalidates the module graph after each book rebuild.

## Change workflow

1. State the change in one sentence.
2. Find the authoritative layer it belongs to (see Authority) and change that one.
3. Derive everything else; do not copy.
4. Add or extend a test with its negative case.
5. Update README and this file when a concept or command changes.
6. Run the CI commands.

## Commits and PR descriptions

- Use Conventional Commits 1.0.0: `<type>(<scope>): <imperative summary>`.
- A PR description says what changed and why, one short paragraph per topic. No verification sections (local test counts, build output) and no narration of mistakes fixed along the way: CI passing is the verification. Keep only reviewer-actionable notes.

## Reader continuity

The alux-reader preferences retain the manual language and normalized progress keyed by edition and chapter. Explicit fragments take precedence on entry; changing views restores the current progress. Folios are chapter-local. Responsive relayout preserves normalized progress; aggregate print pages use the real layout without changing the saved world. CJK substring search reads mdBook's existing lazy edition index; do not create a second content index. Keep native control keyboard behavior when handling paging shortcuts.

## Attribution

The book author is Tomislav Grospić (@tgrospic); preserve the Croatian ć. README's Contributors distinguishes book and architecture authorship from Shixi Lin's interface and reader contributions. Preserve each contributor's existing Git authorship.

## Localized repository introductions

The root English README links to `docs/README.<lang>.md` for every non-English edition in `web/languages.ts`. Keep introductions, edition links, chapter-local pagination descriptions and contributor credits consistent across all eleven languages. Build and maintenance instructions stay canonical in the English README; localized introductions link to them rather than copy commands.

Localized share cards are rendered from `web/social-cards.ts` into `public/social/` at 1200 × 630. Preserve the full author name, original artwork and matching language copy; regenerate from the source rather than editing baked text.
