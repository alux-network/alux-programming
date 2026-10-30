# ALUX programming repository guide

This file is the compact engineering authority for humans and coding agents working on the ALUX programming book. Apply it to the whole repository.

## Product

The ALUX programming guidelines: one mdBook, published in 11 languages, with a reader that adds a magic world (a facing-page book or continuous reading) and a real world (the plain mdBook page), a gateway to choose between them, text size, bookmarks and reading music.

mdBook defines the book. Application configuration defines additional pages. Everything else is a derivation of those two, verification included. Do not turn this repository into a web application, a static-site generator or a second book model beside mdBook.

## Design by Meaning, applied here

This book teaches Conal Elliott's Denotational Design; the repository follows it too. Ask what the site means before choosing scripts, markup or tools.

Meaning:

```text
Book    = mdBook's book: ordered parts and chapters (path, name, content)
Edition = Language -> Book          (localize: swap content and names, keep paths)
Site    = Edition per language, rendered to pages at /<lang>/<path>.html
Reader  = World x ReadingMode -> view of a page (magic: spreads or continuous, real: the page)
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

## Approved reader experience

Preserve these behaviors through architecture changes. The implementation remains the native mdBook template, CSS and TypeScript module; never revive the former application framework to restore presentation.

- Magic: a full-width facing-page spread on desktop, one leaf on narrow screens. Georgia for Latin body text and serif fallbacks for CJK. Body size is independent of viewport height. The directory and body share the same language-aware default size and A−/A+ scale; toolbar controls stay fixed. Warm ivory paper by day, muted forest-green paper and brass by night.
- Real: a plain white document by day, readable charcoal by night; black/light logos respectively. The theme control switches only day/night. Daylight is the first-visit default, and a manual night choice survives reloads and world changes.
- Blank paper and the navigation buttons turn pages. Links, selectable text, code and media retain their own actions. A soft-paper fold leaves the binding and ribbon fixed; reduced motion skips it. Cancel stale snapshots on resize/world changes and never duplicate active media in them. Keep the old spread until the fold completes, and ignore repeated input during a turn. The standalone StPageFlip renderer is a presentation dependency, not an application framework or book model.
- Keep code and table scrollports bounded by the actual leaf, including margins; their final line/row and copy controls must remain reachable. Snapshot scroll positions are visual only. Keep the paper renderer clock live while idle, and invalidate pending destination veils as well as active folds when geometry changes.
- Pause music when the actual reader tab is hidden or left. The outer shell owns one audio element; replacing an inner chapter must not pause/reseek it. Dispose departing chapter listeners without stopping shared media. Consume navigation resume checkpoints once, and preserve live playback position across world toggles.
- Keep the discoverable search button below bookmarks. Do not duplicate it in the toolbar. Center the GitHub mark and adjacent external-link arrow in the contents footer; expose its name on hover, keyboard focus and through its accessible label.
- The brand logo returns to the entrance; do not repeat the book-name affix beneath bookmarks. Keep the canonical index chapter in mdBook.
- Browser/bookmark identity comes from `readerName` in `languages.ts`: simplified Chinese `ALUX 编程`, traditional Chinese `ALUX 程式設計`, other editions `ALUX Programming`. Use the approved warm-gold mark on the deep-green favicon tile; do not substitute the domain name.
- A first neutral entrance uses country detection, with a short timeout and browser-language fallback. Unsupported countries use English. Later neutral visits remember the last chosen edition; explicit edition links retain their language. A manual choice made during detection wins. Attempt the localized welcome automatically; recover on trusted interaction when browser audio policy blocks it, and stop it on exit.
- Pagination still measures only the current chapter and labels chapter progress. Do not restore speculative whole-book totals or background pagination. Magic also offers an explicit continuous-reading toggle over the same chapter, with the choice and normalized progress retained.

Before refactoring, capture the approved reader at fixed viewport, reading size, edition, chapter, world and theme, and list its preserved interactions. Compare the affected day/night, language and mobile states after migration. Exercise normal-motion turns as well as reduced motion; passing structure tests does not establish visual or interaction fidelity. Explain regressions in the PR using commit evidence, and explain the observed post-refactor differences, technical causes and shared prevention steps. Present a working preview before claiming acceptance.

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
- The magic world defaults to a paged book and also offers a persistent continuous-reading toggle. Both presentations keep the same mdBook chapter. The outer book remains vertically scrollable; never shrink its height to force it into the viewport.
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

The current experience contract, regression causes and evidence boundaries are recorded in [docs/reader-experience.md](docs/reader-experience.md). An approved visual reference constrains the experience, not the former source architecture: deliberate refinements may improve composition while preserving agreed behavior. Never treat a generated preview, test count or upstream refactor as owner visual approval.

## 2026-10-30 owner corrections and regression checks

- Preserve both outer vertical book scrolling and the explicit magic paged/continuous switch. Neither substitutes for the other. Keep mode/progress across reloads and make the toolbar reachable while scrolling. A width-to-height cap must not shrink the book in a tall window.
- Paper is flexible, not a rigid rectangle trapped inside the cover. Keep the binding/ribbon fixed, allow the moving leaf to lift outside the frame, and clip only its printed content. Check a real changing fold, not merely a changed page number or an animation class.
- Font completion must not cancel a fold. Snapshot text can request fonts; defer that remeasurement until the fold settles. Actual viewport/world/mode changes still cancel stale geometry.
- Range rectangles include clipped code/table text. Blank-paper hit testing must respect clipping and the actual leaf viewport; invisible text must never swallow a blank click. Keep native selection, controls, links and local scrollbars.
- Equations must stay within their own leaf with horizontal scrolling when needed, without rewriting math. Copy feedback is one nonwrapping acknowledgement, with a current-color mark and no duplicate native tooltip or blue hover filter.
- Check both worlds and both themes across all edition routes. Record route/turn coverage separately from normal-motion checks, emulated profiles, CI and owner visual approval. Use `node web/test/reader-sweep.ts` after building for the exhaustive route sweep. Do not claim visual acceptance from a green test count.
- Owner corrections describe product intent and must travel with the code/PR: coherent material/color, discoverable controls, comfortable spacing, complete content and believable physical page motion. Explain each regression's commit evidence and fix to Tomislav Grospić; describe observed post-refactor differences, technical causes and shared prevention steps without assigning personal blame.
- Do not generate or update screenshots until the owner explicitly requests them again.

### Persistent chapter container

The owner explicitly approved this lifecycle change on 2026-10-30: directory clicks, turns and chapter changes should feel continuous and must not restart music. `reader-shell.ts` holds one outer audio element and loads native mdBook documents in same-origin frames. The old visible chapter stays until the destination fonts and reader geometry are ready; only then commit the frame and canonical URL. Preserve back/forward, anchors, edition identity, search and native `?reader=native` fallback. The shell owns no second book or pagination model.

Keep the pending frame inert. Reject stale ready callbacks, retain only the committed frame, clean up departed listeners, and keep the reading toolbar reachable. Fixed-position turning paper may lift beyond the cover without increasing scroll height; a turn must never move the desk or create a scrollbar. Preserve non-rendering sibling relationships in snapshots and unitless heading line-height; both affect pagination. Copy controls stay visible and inert on the turning paper, while live controls remain below it.

- Keep magic headings atomic and use explicit section spacing/leading. WebKit can otherwise place a live long heading beyond its leaf while moving the cloned heading to the next column. `break-inside:avoid` on a block heading alone was insufficient in the reproduced case; verify source and snapshot coordinates, not just font names or total page count.

- Compare static printed text in the animation overlay to live page coordinates as well as checking the cover and scroll position. Fixed overlays use a border-box origin: the paper inset is 17px (3px binding border plus 14px trim), not the old absolute layer's 14px.
- The historical real-world low-glare day background was #f5f5f5/sidebar #ebebeb. The owner found that rendition too gray on 2026-10-30; the refined day surface is #f7f7f4/text #303030/sidebar #efefeb. Night stays #202020/text #c9c9c9/sidebar #181818. Magic paper remains ivory #f1e8d4/forest #202820. Read historical CSS in import/cascade order before comparing colors. Low-glare UI is not a medical eye-protection claim.
- Folio progress is the sole center label: keep it legible at 20px. Reading-mode icon/label use the toolbar optical rhythm. Music volume controls remain clear and touchable; no duplicate pause/play text action inside the popup.

- Owner correction on 2026-10-30: directory labels, bookmark/search text and prose use the same language-aware default size (Latin24px,CJK22px,Arabic26px) and stored scale. Number prefixes remain a quieter secondary layer; wrapped titles keep their hanging alignment. Toolbar geometry stays independent. Display math uses a 1em KaTeX base rather than the native 1.21em enlargement.
- Check ordinary native details/summary separately from mdBook admonitions: both need world/theme-coordinated surfaces, borders and disclosure markers. Late source-injected admonition styles must not reintroduce blue/white or cyan panels into paper themes.

- Opening/closing native details changes column overflow without resizing the leaf viewport: update the folio and preserve the clicked summary's spread. Long disclosed content must fragment across leaves rather than clip inside overflow:hidden.

- Directory action names follow the native expanded state: “Show table of contents” / “Hide table of contents”, localized in every edition. Keep the icon; never expose a combined show/hide instruction as its tooltip.
- Running-head snapshots use border-box sizing for measured bounding rectangles: the reproduced content-box copy added 10px padding plus 1px rule to a 31px head, making it 42px. Compare the head rule and static destination paragraphs/tables before and after settling, including later spreads.
- Static night sheets must share the live paper color without extra illuminated rims or gold side borders. Limit curl shading to the fold renderer; the stationary book and page edges must not brighten or lose their surface during a turn.

- Preserve visible night curling: only the actual PageFlip flippingPage gets the restrained light-facing gradient; a non-simple bottom destination is still stationary. Do not identify moving paper by `:not(.--simple)` alone. Static paper/trim remain unchanged.
