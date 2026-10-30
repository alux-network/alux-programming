# Reader experience and refactor handover

This is the maintenance contract for the reader polish following PR #4. The owner requested a coherent refinement of the approved experience on the new architecture, not restoration of the old application source. The portfolio reference is [the ALUX showcase](https://shixilin.com/zh/design#websites). Owner visual acceptance remains separate from automated checks.

## Boundaries

Keep mdBook, TypeScript, Vite, native generated chapter documents and the single `src/` content source. Pagination measures only the current chapter; the folio explicitly reports chapter progress. Do not revive the former framework, duplicate content models, measure the whole book in the background, or alter code/math/translation meaning for layout.

The only new runtime dependency is pinned `page-flip@2.0.7`, a standalone soft-paper renderer. It receives temporary, inert visual snapshots of the current spread, never another book model. Snapshots remove IDs and executable/running media. Copy controls remain visible on the paper, inert with the snapshot. One renderer is reused per document because this upstream release has no cancellable frame loop; drawing is suspended while idle, while its animation clock continues to advance.

## Agreed presentation and behavior

| Area | Contract |
| --- | --- |
| Defaults | Daylight on a clean visit; saved manual night choice persists. Two themes only. Text scaling applies equally to prose and contents; toolbar controls stay fixed. |
| Book | Full available desktop width, facing leaves; one leaf on narrow screens. Height follows the viewport with a readable minimum; the whole binding remains vertically scrollable, with no width-based height cap. Ivory paper or muted forest-green paper, brass binding, fixed corner details and textured ribbon. |
| Reading mode | Magic offers paged and continuous reading over the same chapter. Keep the selected mode and normalized progress on reload/world/language changes; the toolbar remains reachable while scrolling. |
| Typography | Latin body 24px, CJK 22px, Arabic 26px at scale 1. Body line height 1.8, CJK 1.9. Display lettering uses Cormorant Garamond with appropriate localized fallbacks. Toolbar labels use one sans-serif family and aligned controls. |
| Directory | Search below bookmarks, hanging wrapped titles, one consistent group rhythm. Empty mdBook affixes do not create phantom spacing. The logo returns to the entrance; no repeated book-name affix. |
| GitHub | Centered mark with an adjacent external arrow in the directory footer. Name on hover/focus and accessible text. No duplicate toolbar entry. |
| Content | Paper-colored tables/callouts, coordinated code colors, upright readable math labels, horizontal localized copy feedback. Paper and touch copy controls stay visible in a separate row without covering code. Keep canonical Markdown/code/math unchanged. |
| Turns | Blank paper, including unused code-panel space, and explicit navigation controls turn pages; painted text, selection, links, scrollbars, media and inputs keep their own behavior. A soft fold lasts approximately 700ms, making the curl legible in both themes. The cover and ribbon stay fixed. Repeated input during a fold is ignored. Reduced motion reveals the settled target without folding. |
| Navigation | Native chapter navigation carries a short-lived visible-paper snapshot. The outer reader retains the old visible chapter while the destination loads in an inert frame. Commit its canonical address only after fonts, progress and the target spread settle. Bind the actual chapter main, never a snapshot main. Stale, mismatched or oversized handoffs are rejected. Resize/world changes cancel stale geometry. |
| Identity | `readerName` is authoritative: `ALUX 编程`, `ALUX 程式設計`, otherwise `ALUX Programming`. Chapter titles can prefix that name. Preserve the approved favicon assets and theme-specific bronze/monochrome logo sources. |
| Entrance | A centered wizard and balanced world choices, responsive to viewport proportions. A neutral first visit attempts country-based language detection with a bounded timeout; browser language is the failure fallback. A saved/manual selection wins; explicit edition URLs stay explicit. |
| Audio | Attempt the localized welcome, then recover on trusted interaction if autoplay is blocked. Entering magic enables reading music; entering real starts it off. Both worlds offer a dismissible notice, direct play/pause and persisted volume. A dismissed notice stays dismissed until deliberately reopened. Pause on departure/hidden document. |

## Why the regressions appeared

The native reader introduced in `1ae9029`, followed by `4566575` and `9cf4257`, moved presentation and interaction boundaries into the mdBook template, CSS and native chapter navigation. That structural simplification was intentional. Presentation and interaction behavior changed during that migration: native defaults, inherited styles and new lifecycle boundaries differed from the approved reader. These differences are tracked below by observed behavior and technical cause.

Specific fixes address distinct causes:

- Native paragraph/list line-height, table striping and theme colors overrode the inherited paper treatment. Explicit semantic styles now cover those elements in each world.
- Empty mdBook affix items retained margins; wrapped labels lacked a shared number/title layout. Empty items are hidden and numbered labels use hanging columns.
- Repeated running book names and toolbar search created duplicate navigation/identity. The canonical chapter remains; redundant display elements are removed.
- The first adapter suspended the upstream render method while idle, which also froze the animation clock used by subsequent folds. Only drawing is now suppressed; consecutive normal-motion turns must show changing page geometry. Pending handoffs are removed on actual size/scale changes, and leaf dimensions are checked again before animation.
- The initial replacement animation rotated a rigid rectangle and could expose a new spread before transition. The standalone soft-paper renderer keeps the old spread until the fold commits.
- The first native-navigation handoff selected `main.leaves` inside its own old snapshot. That caused a DOM ancestor/descendant insertion error and mismatched content. The reader now binds only the actual direct chapter main; handoff tests cover exact targets, hashes, expiry and geometry.
- Snapshot image URLs were relative to the departing document, producing a broken request in the next chapter directory. Snapshots now retain the selected absolute image URL; canonical Markdown and rendered chapter URLs remain unchanged.
- WebKit could fragment an over-height table across several leaves differently after a world switch, changing the total by a page at identical dimensions. Tables now use one bounded local scrollport; over-height code likewise scrolls within a bounded panel below its fixed copy row, so the bottom cannot be clipped; all rows remain available and world-switch progress/total assertions remain strict.
- Headers, page numbers and clipboard bindings also target only the canonical volume; snapshot elements never join the live reader controls. New font completion triggers pagination again even when the column viewport dimensions do not change, when a world newly requests math or UI fonts.
- Unversioned CSS allowed an already-open preview to mix old and new presentation. Native mdBook `hash-files` now versions its emitted assets; local Vite previews disable caching. The source remains the template/configuration, with no rendered-HTML rewrite.
- Ribbon `cover` scaling and a synthetic clip cropped the approved artwork. Its original bottom-aligned texture treatment is restored. Logos use their actual approved source rather than an unrelated tint.
- Native search reacts to keyup, which can miss paste or IME completion after its index is warm. Input and composition completion now reuse the native search event path; the search engine and index remain native.
- Native clipboard text inherited code wrapping. Copy feedback is a nonwrapping localized UI label while mdBook retains clipboard ownership.
- Review also caught hidden-tab playback and a resume checkpoint reapplied on every world toggle. Hidden documents now pause, and the checkpoint is consumed once per document so toggles retain the live track position.
- Audio/world defaults and entry language selection were incomplete during migration. Small typed helpers now own those lifecycles and races without changing canonical content.

## Verification and prevention

Before changing architecture, capture world/theme/edition/viewport/scale/chapter and the preserved actions, including normal-motion video frames. Afterward compare that same matrix; reduced-motion tests alone cannot verify a curl. Check blank clicks, repeat input, selection, links, code copy, resize, chapter boundaries and last-page navigation. Verify first paint with a delayed reader bundle, not only the final page.

Use `npm run check`, `npm run build` and `npm test`. Browser specs run in Chromium, Firefox, WebKit and Android/iPhone profiles. Profile simulation is not physical Android Chrome or iOS Safari acceptance. The owner has no iPhone or iPad; do not claim Apple-device testing. Record missing engines and pending CI explicitly. Local diagnostic captures belong under ignored `output/`; the owner's formal screenshot folder is also local-only.

Keep each review issue linked to its cause, change and actual validation in the PR. A green test count is evidence for the tested behavior, not proof of visual approval. Preserve contributor authorship: Tomislav Grospić authored the original book and initial site and refactored its mdBook architecture; Shixi Lin designed the interface and contributed reader features and compatibility work.

## Owner correction on 2026-10-30

Post-refactor review exposed a width-based book-height cap, the missing continuous-reading choice, floating copy controls during a fold, duplicate copy tooltips with mismatched icon filters, and unbounded display equations crossing the gutter. The follow-up records these differences and their specific causes so future architecture work can preserve the same reading experience.

The correction preserves the refactor: presentation changes stay in the template/CSS/reader bindings, progress stays chapter-local, and formulas/source text are unchanged. Use bounded horizontal equation scrollports, current-color copy marks with one acknowledgement, and inert paper snapshots with their copy controls painted in place. Evaluate night turns separately, including real changing geometry and blank clicks in code-heavy Chinese chapters. No formal screenshots are generated unless the owner requests them again.

The night no-fold report was reproduced in the Chinese semantic-types chapter: new snapshot fonts caused `loadingdone` to call `settle`, cancelling the fold almost immediately while still advancing the folio. Font-driven remeasurement is now deferred to completion. The all-route sweep also reproduced a blank-footer stall in the German free-monad chapter: Range rectangles from clipped overflow text extended into the footer. Hit testing now checks the leaf and clipping ancestors. The moving renderer must allow paper outside the binding rather than cropping the fold to a rectangular host.

## Continuous reading lifecycle

The owner approved a persistent outer container to avoid audible gaps and visible whole-page reloads when choosing contents or changing chapters. It keeps one music element, while each chapter remains a generated mdBook document with its own native reader bindings. Chapter-local pagination, canonical content and translations are unchanged. Direct links and refresh work through the same generated pages; `?reader=native` is a plain-document fallback.

A pending same-origin frame is inert and transparent; the previous chapter stays visible until the new typography/layout is ready. Commit one frame, its canonical address, title and accessible identity together. Browser history remains usable. Departing chapter listeners are disposed while shared media continues; leaving/hiding the actual tab still pauses audio. Browser autoplay restrictions remain in force, with trusted-interaction recovery.

Animation and settled content must use identical columns, typography and sibling relationships. A removed stylesheet node changed `:first-child` spacing; pixel-frozen line-height changed heading heights and downstream pagination. Snapshot styles now preserve the live rules. Turning paper uses fixed geometry so its curl cannot increase document scroll height; keep the binding, desk scroll position and toolbar stable. Only small windows need outer book scrolling; continuous reading remains an explicit separate choice.

For future refactors, agree the preserved user actions and visual states first, maintain a compact before/after checklist, and keep these checks in the PR: normal-motion geometry, every-route blank turns, unclipped content, coordinated feedback, continuous audio, history and mobile controls. Present post-refactor behavior changes and technical causes as shared maintenance work, without personal responsibility statements. Automated results and owner visual acceptance remain distinct.

WebKit-specific inspection reproduced a long heading sitting below a live leaf's bottom while its animated clone moved the same heading to the next column. `break-inside:avoid` alone did not correct that engine behavior; making headings atomic inline blocks did. Section spacing and heading leading are explicit, so mdBook's large inherited section margins do not create inconsistent book gaps. The same source/clone coordinate check runs in Chromium and WebKit.

Mobile WebKit retained old fragmented line boxes after switching from CSS columns to continuous flow, even with unchanged computed font/width. The mode/world boundary now synchronously rebuilds the main formatting context before restoring progress; content nodes and native controls remain the same. The mobile blank-paper test first brings the footer into the viewport, rather than sending an ineffective pointer click below the screen. Fold checks also compare the fixed leaf against the scrolled cover and compare paragraph/list/code geometry, not headings alone.

A later owner check identified a remaining 3px text hop: fixed fold placement used the former absolute layer's 14px padding-box offset, while snapshots subtract 17px from the border box. Both now use the same 17px cover origin. Frame/scroll stability alone cannot prove content alignment; compare the printed baseline too.

Palette evidence uses the final CSS cascade, not the first historical token definition: the old materials layer already used ivory `#f1e8d4` and forest paper `#202820`, which remain. The real reader restores the old final neutral backgrounds `#f5f5f5` (day) / `#202020` (night), with text `#303030` / `#c9c9c9`, sidebars `#ebebeb` / `#181818`, and coordinated code/table surfaces. These are low-glare design choices, not a medical eye-protection claim. The owner also requested a clearer chapter folio (now 20px), 20px reading-mode label with a 23px icon, and readable volume controls without a duplicate pause/play text action.

The owner clarified that the directory and body must have equal language-aware default sizes and scale together with A−/A+. They now share the same computed font variable; toolbar controls retain fixed geometry. Native details/summary and source-injected admonition styles are both themed, including their borders, summary backgrounds and disclosure markers. Display math uses the body-sized KaTeX base rather than the native 1.21em enlargement.

After viewing the restored gray day palette, the owner requested lighter real-world surfaces: day background #f7f7f4, sidebar #efefeb and code #eeefeb refine the historical #f5f5f5/#ebebeb baseline; night remains #202020/#181818. This is a deliberate visual refinement, not an assertion that the old palette had those lighter values. Opening native details now updates column pagination while keeping the clicked summary's spread; long details content remains fragmentable.


## Late visual continuity checks

The directory control now names its current action (show or hide), with localized title and accessible name derived from mdBook’s native expanded state. The chapter folio is 20px; toolbar size remains independent of reading scale. Same-category callout borders share thickness/color, while code retains its quieter fine border.

Normal-motion inspection reproduced an extra 11px in cloned running heads: a measured 31px border-box height was assigned as content height, then 10px bottom padding and a 1px rule were added again. Snapshots now preserve the measured border box. A regression compares static destination paragraph/list/table rectangles and the running-head rule to their settled positions in the reported Chinese EVM and referential-transparency chapters.

Night snapshots also carried an extra illuminated brass rim and side border absent from resting paper. Those static overlays are removed; fold-only shadows are lighter (maximum opacity .22 rather than .65), retaining the historical #202820 paper. Whole-page geometry, static paper material, and moving-leaf perspective are checked separately.
