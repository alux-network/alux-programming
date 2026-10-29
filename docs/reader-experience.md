# Reader experience and refactor handover

This is the maintenance contract for the reader polish following PR #4. The owner requested a coherent refinement of the approved experience on the new architecture, not restoration of the old application source. The portfolio reference is [the ALUX showcase](https://shixilin.com/zh/design#websites). Owner visual acceptance remains separate from automated checks.

## Boundaries

Keep mdBook, TypeScript, Vite, native document navigation and the single `src/` content source. Pagination measures only the current chapter; the folio explicitly reports chapter progress. Do not revive the former framework, duplicate content models, measure the whole book in the background, or alter code/math/translation meaning for layout.

The only new runtime dependency is pinned `page-flip@2.0.7`, a standalone soft-paper renderer. It receives temporary, inert visual snapshots of the current spread, never another book model. Snapshots remove IDs and executable/running media. One renderer is reused per document because this upstream release has no cancellable frame loop; drawing is suspended while idle, while its animation clock continues to advance.

## Agreed presentation and behavior

| Area | Contract |
| --- | --- |
| Defaults | Daylight on a clean visit; saved manual night choice persists. Two themes only. Text scaling affects content, not navigation. |
| Book | Full available desktop width, facing leaves; one leaf on narrow screens. Height is limited by both viewport and spread proportions. Ivory paper or muted forest-green paper, brass binding, fixed corner details and textured ribbon. |
| Typography | Latin body 24px, CJK 22px, Arabic 26px at scale 1. Body line height 1.8, CJK 1.9. Display lettering uses Cormorant Garamond with appropriate localized fallbacks. Toolbar labels use one sans-serif family and aligned controls. |
| Directory | Search below bookmarks, hanging wrapped titles, one consistent group rhythm. Empty mdBook affixes do not create phantom spacing. The logo returns to the entrance; no repeated book-name affix. |
| GitHub | Centered mark with an adjacent external arrow in the directory footer. Name on hover/focus and accessible text. No duplicate toolbar entry. |
| Content | Paper-colored tables/callouts, coordinated code colors, upright readable math labels, horizontal localized copy feedback. Paper and touch copy controls stay visible in a separate row without covering code. Keep canonical Markdown/code/math unchanged. |
| Turns | Blank paper and explicit navigation controls turn pages; text selection, links, code, media and inputs keep their own behavior. A soft fold lasts approximately 700ms, making the curl legible in both themes. The cover and ribbon stay fixed. Repeated input during a fold is ignored. Reduced motion reveals the settled target without folding. |
| Navigation | Native chapter navigation carries a short-lived visible-paper snapshot. The destination hides its first frame until fonts, progress and the target spread settle. Bind the actual chapter main, never a snapshot main. Stale, mismatched or oversized handoffs are rejected. Resize/world changes cancel stale geometry. |
| Identity | `readerName` is authoritative: `ALUX 编程`, `ALUX 程式設計`, otherwise `ALUX Programming`. Chapter titles can prefix that name. Preserve the approved favicon assets and theme-specific bronze/monochrome logo sources. |
| Entrance | A centered wizard and balanced world choices, responsive to viewport proportions. A neutral first visit attempts country-based language detection with a bounded timeout; browser language is the failure fallback. A saved/manual selection wins; explicit edition URLs stay explicit. |
| Audio | Attempt the localized welcome, then recover on trusted interaction if autoplay is blocked. Entering magic enables reading music; entering real starts it off. Both worlds offer a dismissible notice, direct play/pause and persisted volume. A dismissed notice stays dismissed until deliberately reopened. Pause on departure/hidden document. |

## Why the regressions appeared

The native reader introduced in `1ae9029`, followed by `4566575` and `9cf4257`, moved presentation and interaction boundaries into the mdBook template, CSS and native chapter navigation. That structural simplification was intentional. Our follow-up did not verify the complete previously approved visual/interaction contract, so native defaults and incomplete presentation ports survived. This was a gap in our migration acceptance, not evidence that Tomislav's architectural direction was wrong.

Specific fixes address distinct causes:

- Native paragraph/list line-height, table striping and theme colors overrode the inherited paper treatment. Explicit semantic styles now cover those elements in each world.
- Empty mdBook affix items retained margins; wrapped labels lacked a shared number/title layout. Empty items are hidden and numbered labels use hanging columns.
- Repeated running book names and toolbar search created duplicate navigation/identity. The canonical chapter remains; redundant display elements are removed.
- The first adapter suspended the upstream render method while idle, which also froze the animation clock used by subsequent folds. Only drawing is now suppressed; consecutive normal-motion turns must show changing page geometry. Pending handoffs are removed on actual size/scale changes, and leaf dimensions are checked again before animation.
- Our initial replacement animation rotated a rigid rectangle and could expose a new spread before transition. The standalone soft-paper renderer keeps the old spread until the fold commits.
- Our first native-navigation handoff selected `main.leaves` inside its own old snapshot. That caused a DOM ancestor/descendant insertion error and mismatched content. The reader now binds only the actual direct chapter main; handoff tests cover exact targets, hashes, expiry and geometry.
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
