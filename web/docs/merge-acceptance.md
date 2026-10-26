# PR #2 measurable merge acceptance

Source: [Tomislav's review](https://github.com/alux-network/alux-programming/pull/2#issuecomment-6420843360), 2026-10-27 00:06 Beijing time. Baseline: `ba2274db4520be6d34d039ab0e49d04a8005b02d`.

This pass fixes merge blockers and records evidence. It does not authorize another architecture rewrite, a redesign, a merge or production deployment.

## Authorized changes and decisions

- Pagination/page-turn lifecycle, history and reading-position restoration, focused diagnostics and regression tests.
- Non-blocking translated-source freshness warnings; no automatic translation or acknowledgement.
- Fresh tracked checkout, frozen installation, repeated-build determinism, links/anchors/assets and frontend CI. Preserve the original publishing workflow.
- Root/web Agent guides and this ledger. Preserve existing prose, technical examples, media, typography, palettes, language identities and storage keys.
- The owner selected **on-demand pagination**: measure only the viewed chapter. Use continuous whole-book numbering only when exact-layout counts have already been learned from actual visits; otherwise explicitly label chapter progress. Never guess totals or measure unseen chapters to obtain them.
- The owner has Android but no iPhone/iPad and requested simulation. Distinguish mobile-profile Chromium and WebKit emulation from physical Android Chrome and iOS Safari.

## Acceptance ledger

Final rows must use **PASS / FAIL / NOT TESTED**, commands, browser versions and evidence. These initial states identify work to perform, not final claims.

| Criterion | Initial status | Evidence / remaining work |
| --- | --- | --- |
| No pagination/loading for unrelated chapters | FAIL | Baseline layout measures the full book and decodes unrelated images. |
| Resize/fonts/languages preserve content and boundaries | NOT TESTED | Re-run current-head content and orientation checks. |
| Repeated chapter/mode changes release resources | NOT TESTED | Measure warmed cycles: listeners, observers, timers and detached DOM. |
| Page-turn completion/cancellation on navigation | NOT TESTED | Normal-motion navigation and history interruption. |
| Eleven-language structure, links, fallback, code/math/media | NOT TESTED | Current build/tests and generated-route audit. |
| English edits identify potentially stale translations | FAIL | Baseline has no source fingerprint warning. |
| Fresh checkout/frozen install/build/test, no hidden files | NOT TESTED | Isolated tracked-file checkout with pinned tools. |
| Repeat-build generated-content determinism | NOT TESTED | Compare sorted SHA-256 inventories, not timestamps. |
| Original mdBook build | NOT TESTED | Unchanged publishing workflow and available native tools. |
| Internal assets, routes and fragments resolve | NOT TESTED | Static audit plus browser request/error capture. |
| Desktop Chromium and Firefox | NOT TESTED | Record actual versions and scenarios. |
| Android-profile Chromium simulation | NOT TESTED | Record profile/touch/orientation; not a physical-device result. |
| iPhone-profile WebKit simulation | NOT TESTED | Record engine/profile; not actual iOS Safari. |
| Physical Android Chrome | NOT TESTED | No phone is connected to the agent environment. |
| Physical iOS Safari | NOT TESTED | Owner has no iPhone/iPad. Emulation does not prove this required merge gate. |
| CI lint, strict types, frontend build/tests | FAIL | Existing publishing CI does not run frontend checks. |
| Performance relative to the pinned baseline | NOT TESTED | Same local conditions; no eager unseen-chapter work. |

## Closure rule

Fix demonstrated failures, retain useful existing tests, and document limitations. Optional cleanup and sophisticated freshness/performance optimization belong in follow-up work. A green local/emulated matrix does not erase an untested real-device merge criterion.
