# PR #2 measurable merge acceptance

Review: [Tomislav, comment 6420843360](https://github.com/alux-network/alux-programming/pull/2#issuecomment-6420843360). Local evidence: 2026-10-27, Windows, Node 24.19.0, pnpm 11.25.0, Playwright 1.64.1. Baseline: `ba2274db4520be6d34d039ab0e49d04a8005b02d`. No further architecture rewrite, redesign, merge or production deployment is authorized.

## Decisions and fixes

- Owner selected **on-demand pagination**: measure only the viewed chapter and decode only its images. Show labelled chapter progress until exact-layout counts for every chapter have already been learned from actual visits. Never guess totals or measure unseen chapters, including background work, to obtain them. Language, dimensions, text size and font invalidation constrain reuse.
- Abort obsolete layout/navigation work; preserve canonical sections through font/size/orientation and scroll/book changes. History resolves unprefixed English correctly.
- Pinned page-flip 2.0.7 retained render frames and resize listeners after destroy; delayed initialization could survive immediate destruction. The checked-in pnpm patch fixes source and distributed bundles, retains its license, and needs no manual node_modules edits.
- World transitions commit synchronously. Awaiting rAF inside a View Transition update callback deadlocked mobile Chromium until timeout. Restore after the transition and check cancellation.
- Windows supports probes now terminate naturally: forced process.exit aborted Node handles and let mdBook skip localization. A subprocess regression and translated-source-title guard prevent localized UI from silently accompanying English chapters.
- `sourceHash` identifies normalized-line-ending SHA-256 of canonical English Markdown. Missing/mismatched hashes warn without blocking, changing prose or automatically acknowledging translations. All 280 initial hashes identify the migration baseline, not a new linguistic review. Git comparison confirmed metadata-only changes.

## Local acceptance ledger

These are local results. CI and physical devices are separate. Reproducible logs/JSON/screenshots: `output/merge-acceptance/` and `output/reader-regression/`.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Current-chapter-only pagination | PASS | Runtime User Timing records measured canonical IDs. Four-profile checks cover initial and subsequent routes; only selected language data requested. |
| Content/boundaries after size, orientation, language and mode changes | PASS | Exact normalized text comparisons, canonical section continuity, existing 99 language/viewport/route cases. |
| Lifecycle resource cleanup | PASS | Five destroyed PageFlip instances: baseline 5 active frames/5 resize listeners; patched 0 frames/0 listeners/0 hosts, no exceptions. Final four warmed round trips after GC each show 3 documents, 5602 nodes, 75 JS listeners; global counts stable. |
| Page-turn completion/cancellation | PASS | Normal-motion navigation, back interruption, forward restoration; no animation/measurement hosts left. Clipboard completion guards unmount. |
| Eleven-language structure and protected content | PASS | 11 native editions × 28 chapters; exact code/math/link/image/media checks and mutation tests retained; canonical hierarchy/anchors; 36 Node tests. Existing Chromium regression: 318 assertions, 99 route/viewport/language cases. |
| Missing translation English fallback | PASS | Build-level source-selection fixtures. Not a simulated missing network response. |
| English edit freshness warning | PASS | Matching hash silent, English edit warns, translation bytes unchanged, CRLF/LF equivalent. No unexpected baseline warnings in actual build. |
| Strict types and lint | PASS | pnpm typecheck; pnpm lint uses TypeScript unused/unreachable/fallthrough checks, not an ESLint claim. |
| Fresh frozen install/build/test | PASS | Isolated local Git checkout of signed tracked source, initially without dependencies/generated reader data. No manual generated files copied in. |
| Repeated build determinism | PASS | Sorted SHA-256 inventory of every dist file, including scripts/styles/fonts/media; no timestamp exclusions. |
| Internal routes/anchors/resources | PASS | 737 HTML pages, 11594 links, 5522 fragments, 3784 resource references, zero missing targets; browser captures internal failures. |
| Original mdBook publishing | NOT TESTED locally | Native web HTML/JSON passes with mdBook0.4.52/admonish1.20.0/KaTeX0.9.4. Local linkcheck absent. Unchanged publishing CI installs linkcheck0.7.7 and remains the full check. |
| Frontend CI | NOT TESTED in local snapshot | Separate reader.yml adds frozen install/lint/types/build/tests, repeat hashes, links and four engine/profile configurations on pinned Ubuntu24.04 with a 30-minute bound. The initial moving ubuntu-latest runner used Ubuntu26.04 and stalled downloading browser system packages; build/repeatability checks had passed. Live replacement CI result is reported in PR. Original deploy workflow unchanged. |
| Performance vs pinned baseline | PASS | Same Chrome/1440×960/reduced motion, five new contexts each: median ready 1445ms → 405ms; requests27 → 16; bytes1487727 → 944044. Local observation, not production SLA. |

## Browser/device scope

| Environment | Status | Scope |
| --- | --- | --- |
| Desktop Chromium156.0.8078.47 | PASS | Magic/Real, navigation/history, language, bookmark/search, code/math, resize, lifecycle and native audio clock/state. |
| Desktop Firefox157.0 | PASS | Same acceptance scenarios. |
| Pixel7 profile, Chromium156.0.8078.47 | PASS — simulation | Touch/mobile viewport/orientation. Desktop engine with profile, not Android hardware. |
| iPhone13 profile, WebKit27.2 | PASS — simulation | Playwright WebKit, not actual iOS Safari. |
| Physical Android Chrome | NOT TESTED | Owner has Android hardware; no phone connected to test environment. |
| Physical iOS Safari | NOT TESTED | Owner has **no iPhone or iPad** and requested simulation. Hardware merge gate unproven. |

Native media-clock advancement and pause on Real entry/leaving readers are automated checks, not audible hardware proof. Third-party embedded playback is outside the internal-resource audit. An earlier intermittent WebKit `writeEmbed` error was not reproducible with a stack trace; investigation did find live iframe sources cloned into animation snapshots. Both snapshot paths now reuse the existing safe-copy helper, so copies cannot start duplicate players. The final four-profile run, including audio, has no uncaught exceptions or failed internal requests. This does not prove the earlier provider-looking exception came from that defect or guarantee third-party uptime; retain stack capture if it recurs.

## Reproduce

Pinned mdBook tools on PATH; from web/:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:generated
# Save generated-inventory.json, build again, rerun test:generated,
# and compare the complete inventories byte-for-byte.
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
pnpm test:acceptance
node scripts/measure-startup.ts /path/to/checked-out/web startup.json
```

Windows may use PLAYWRIGHT_CHROMIUM_EXECUTABLE for Chrome and PLAYWRIGHT_BROWSERS_PATH for downloaded engines. Temporary ports:4175/4176; benchmark4177. Commands do not publish or merge.

Three independent read-only Frank/Tomislav/Yilu lens reviews are not approvals by those maintainers. Findings fixed: clipboard completion after unmount, aborted restoration, whole-dist hashes, explicit outer-host assertion and pagination observations across routes. No blocking code-review finding remains. The selected diagnostic chapters use normal .md→.html paths; expanding the fixture to index.md must use its introduction.html alias.

The PR remains for maintainer review. Local/emulated success does not convert an untested physical-device criterion into PASS.
