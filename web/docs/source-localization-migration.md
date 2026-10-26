# Source localization and reader state migration

Review source: [Tomislav's PR #2 comment, 2026-10-26](https://github.com/alux-network/alux-programming/pull/2#issuecomment-6415490467).

## Implementation boundaries

| Review point | Implementation |
| --- | --- |
| Source translations and one canonical structure | 280 adjacent Markdown files: 28 chapters in each of ten translated editions; English sources and SUMMARY are unchanged. Optional source metadata supplies localized navigation/part labels. |
| Native compiler and fallback | A web-only mdBook preprocessor selects translations before includes, admonitions and KaTeX. Missing files retain English. Existing native JSON and HTML renderers remain authoritative. |
| Shared localized data | Build-time `content/<lang>.json` models serve both readers and static routes. Browser requests are coalesced/cached per selected edition; failures can retry. |
| Remove old localization | Prose dictionaries, manifest/alignment code and runtime DOM translation are retired. Four public legacy anchors remain a small explicit compatibility map. |
| Explicit interface messages | Eleven small UI dictionaries, typed static keys and typed variable-message keys replace text matching. |
| Declarative state | Solid owns navigation, language, dialogs, bookmarks and preferences. Pagination/PageFlip and native audio remain scoped adapters with disposal. The source-generated chapter HTML stays opaque. |
| Publishing | Original `book.toml` and GitHub Pages workflow are unchanged. No merge or production deployment is part of this work. |

## Preservation evidence

The migration captured all eleven previous reader datasets before converting translated HTML to Markdown. Every translated chapter was rebuilt through mdBook and compared against its prior edition: exact fenced and inline code, TeX annotations, links, image references, iframe sources/titles, normalized visible text, displayed titles and canonical heading IDs. All 280 chapter bodies match those protected facts.

One existing metadata defect was exposed: the Japanese `denotational-design/design.html` heading list contained `優れた抽象化とは#何か`, while its visible heading already read `優れた抽象化とは何か`. Native rendering now derives the latter consistently. The approved visible prose and canonical `what-counts-as-a-good-abstraction` ID are preserved; the discrepancy is recorded rather than inserted into the new source.

The previous token-matching unit tests described a mechanism intentionally removed by this review. Their technical-preservation obligations remain in `book-integration.test.ts` and `check-locales.ts`, now checked against all generated localized models. `source-localization.test.ts` covers source selection, missing-file fallback, metadata/path rejection and editing one edition without affecting another. A controlled mutation that made translation selection return the canonical path was rejected by these tests, then restored byte-for-byte.

## Validation status

Strict TypeScript, the 32-test Node suite and the full web build pass. The reproducible `pnpm test:browser` run passed 318 assertions, including 99 language/viewport/route combinations (eleven languages × three widths × both readers and contents), plus navigation, mode switching, dialogs, search, bookmarks, canonical position, clipboard and music-volume controls. The run found no browser exceptions, page overflow or toolbar controls outside the viewport.

With image/font requests deliberately delayed by 200ms, the 320/768/1440px startup probes recorded zero painted empty-book frames. First readable content appeared at 853/745/749ms; final readiness was 2079/1891/1890ms in this local headless Chrome run. These are local observations, not a production or physical-device performance claim.

The untouched original publishing build was also attempted; its local full run is unavailable because `mdbook-linkcheck` is not installed here. The web build exercises native mdBook HTML and JSON with pinned admonish/KaTeX. The existing GitHub Pages workflow still installs pinned linkcheck and remains unchanged. Physical-device audio, production deployment and platform share caches are outside this local regression.

Three independent read-only code reviews used the Frank, Tomislav and Yilu review lenses; these are not approvals by those maintainers. The source-contract, UI-state and behavior/preservation scopes were reviewed separately, with the migrated prose covered by the baseline comparisons rather than a claimed manual read of all 280 files.

| Finding | Disposition and verification |
| --- | --- |
| iframe titles absent from the protected media facts | **Fixed in `aca4f04`**. Media tuples now cover titles and URLs; the reviewer confirmed the fix and mutation test. |
| Responsive images and video/audio/source/poster references missing from the guard | **Fixed in `aca4f04`**. A dedicated mutation fixture exercises these attributes; the behavior reviewer confirmed the fix. |
| Language state duplicated between i18n globals and the Solid app | **Fixed in `aca4f04`**. One Solid edition signal owns locale/book/messages; all helpers and the app derive from it. Targeted review found no remaining issue. |
| World entry resets audio to Magic on / Real off | **Kept**. This is the established product behavior; manual play/pause is retained across chapters within the same world. Changing world-entry defaults would alter the approved behavior. |
| Separate iframe/image `src` mutation cases absent | **Fixed** in the test follow-up alongside this record; both source changes now join the existing attribute mutation fixture. |

All blocking findings are closed. The PR remains for maintainer review; no merge or production deployment is authorized.
