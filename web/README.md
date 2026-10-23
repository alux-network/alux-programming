# ALUX Programming — local preview

This independent web presentation preserves all 28 original chapters from `../src` and the existing mdBook publishing workflow. `/` opens the wizard chooser. Magic and Real world enter the same introduction directly, with a same-chapter world switch. The ALUX logo returns to the chooser. The redundant showcase homepage and standalone directory are outside the reading path; `/magic.html` and `/contents.html` remain compatible aliases.

The chooser places a complete standing wizard in a misty forest clearing, with warm and cool light distinguishing the two entrances. Its larger language control uses a high-contrast surface. The forest artwork is generated at 1672×941 native pixels and ordinarily encoded to WebP; it is not an upscaled 4K asset. Reader palettes remain independent.

## Run locally

Use Node 22+ and `pnpm install`, then `pnpm dev` on `127.0.0.1:4173`. `pnpm build` validates translations, renders the book, and writes direct static routes. `pnpm preview --port 4174` serves the production build locally. This presentation does not change the existing mdBook publishing workflow or add a deployment hook.

## Reading

Agents adding chapters or interface content must follow [AGENTS.md](AGENTS.md) for alignment, typography, capitalization, localization, responsive behavior and verification.

The magic reader uses soft physical pages, visible chapter navigation, blank-paper clicks, touch swipes, keyboard turns and continuous reading. Text selection, links, code, tables and interactive regions do not trigger blank-paper turns. Arabic spreads begin on the right and advance in reading order. Long technical blocks remain complete in scroll regions; tables continue between whole rows. The toolbar keeps stable dimensions when navigation opens or closes. Book and scroll views share their text, code, caption and illustration sizes in `reader-presentation.css`. Scroll view has one continuous paper surface; its inner book container is transparent.

The Real world uses a quiet technical-document layout with neutral gray-white day mode and neutral charcoal night mode. It has one day/night toggle. Both readers share their day/night and font-size preferences. Base reading sizes are 24px for Latin and Cyrillic languages, 22px for Chinese, Japanese and Korean, and 26px for Arabic. Contents group headings use the base plus 2px; chapter entries use the base minus 2px. Both font-size controls scale the body and navigation together and remain available on phones. Interface labels use consistent English title case; original prose, heading anchors and technical identifiers retain their spelling. Both chapter boundaries and turns within a chapter use a 560ms physical paper animation; the cover and cloth bookmark remain stationary. Reduced-motion preferences bypass the animation.

My bookmarks is visible in each sidebar. Multiple saved chapters retain their world and reading position, can be opened or removed, and migrate the older single-bookmark setting. Bookmarks, reading preferences and manual language choices are stored on the current browser; no account or server-side reading collection is implied.

Magic book pages are numbered continuously across the whole book. The same pagination algorithm measures chapter offsets and renders the sheets; changing language, text size or viewport recalculates the total. Page numbers sit at the outer edges, with a compact range/total below the book. Continuous scrolling does not invent page numbers. Chapter-end contents links navigate to a dedicated full contents page. Its chapter links enter the selected chapter directly; they do not pass through part-opening pages. The toolbar Contents button still toggles the reading sidebar.

Embedded interview clips retain their original references and show their individual time ranges. The web generator supplies explicit YouTube playback start/end bounds; repeated thumbnails alone do not imply duplicate clips.

## Languages

The menu order is English, 简体中文, 繁體中文, 日本語, 한국어, Tiếng Việt, Deutsch, Español, Русский, Українська, العربية. English has no language prefix. The other paths use `/zh/`, `/zh-hant/`, `/ja/`, `/ko/`, `/vi/`, `/de/`, `/es/`, `/ru/`, `/uk/`, `/ar/`. The Real reader follows the language directory, e.g. `/zh/real/introduction.html`. HTML uses `zh-Hans` and `zh-Hant`. Old `?lang=` links and common Chinese locale aliases are canonicalized without losing the chapter or anchor.

All ten translations contain 1,860 prose units and 137 interface labels. Code, API identifiers, formulas, diagrams and reference titles retain their original technical spelling. Each language has received a semantic review. The build checks key coverage, protected tokens and empty translated links/emphasis. Arabic prose is RTL; code and math remain LTR. Original English Markdown remains authoritative and unchanged.

Resolution order is an explicit language path or legacy query, a saved manual choice, a session-cached IP-country result, then English. First visits use the public GeoJS country endpoint with a short timeout; only the resulting language is cached, not the returned IP address. A manual selection persists and takes precedence over later country detection. Unsupported countries and failed lookups fall back to English. Country detection does not infer a person's native language.

## Brand and sharing

`public/alux-black.png` and `public/alux-white.png` preserve the owner's official geometry. The favicon embeds ordinary scaled copies of those marks. Magic mastheads retain the generated bronze material variants; the technical reader uses the original mark and a live typographic wordmark. The chapter illustrations share a brass/ivory/forest-green material family; original source illustrations remain intact in `src`. The common mapping in `scripts/content.mjs` applies to both readers and static fallbacks; see [ARTWORK.md](ARTWORK.md) for the assets and measured sizes.

All static routes include localized Open Graph and X large-image card metadata, localized 1200×630 JPEG cards, canonical links and language alternates. `scripts/share-card-design.mjs` contains the share-card composition. Set `ALUX_SITE_URL` only when preparing a separately authorized deployment; the local build defaults to `http://127.0.0.1:4174`. Telegram/X previews are checked locally; real crawler fetches and platform caches require a reachable public URL and have not been published or claimed verified here.

The share cards use the same forest and complete standing wizard with the official white ALUX mark. `node scripts/share-preview.mjs` regenerates the eleven-language local preview at `../output/分享预览.html`.

The PR also includes `previews/index.html`, desktop/phone captures in `previews/assets`, and the eleven share cards. The tracked preview is an engineering review artifact outside Vite's public output. It links to the local production preview on port 4174; the main reading path does not expose this review page.

Static chapter routes also provide localized no-JavaScript reading fallbacks. No original source chapter, formula, code example, media embed or publishing workflow is removed by the web layer.

## Welcome voice and reading music

The gateway uses the owner-approved Qwen3 Uncle Fu character voice. The Chinese clip reuses the accepted performance; Japanese, Korean and Russian speech use phonetic brand spelling for clear pronunciation. Vietnamese, Ukrainian and Arabic use local OmniVoice cloning from that approved synthetic reference. The owner specified noncommercial use; OmniVoice model attribution: https://huggingface.co/k2-fsa/OmniVoice (CC-BY-NC), with code at https://github.com/k2-fsa/OmniVoice. No private or third-party person was cloned.

Eleven clips are mastered around -16 LUFS with true peaks below -2 dBTP; measured values and text are in public/audio/welcome/manifest.json. Welcome speech attempts playback on gateway entry and language change, plays once, has replay/stop controls, and stops when leaving. If autoplay is blocked, the first page click, touch or key retries playback; an explicit stop suppresses that retry. The gateway has no background music.

Reading music uses the owner-provided 在森林的呼吸里, with one audio instance across chapter changes and a Web Audio gain control for phone volume. Each entry into a reading world shows a small dismissible hint beside the music button: Magic starts music automatically when permitted, while Real defaults off. The note button follows the day/night control and directly toggles playback. Its title-free 20px hint dismisses after five seconds; hovering or adjusting holds it open, and leaving dismisses it after two seconds. A new visitor starts at 100% (unity gain, the audio file’s own level); manual volume changes are remembered. If autoplay is blocked, a page gesture retries music. Pausing lasts through chapter navigation. A hidden page pauses music. No audio is mixed over the welcome.
