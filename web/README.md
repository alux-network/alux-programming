# ALUX Programming — local preview

This independent web presentation preserves all 28 original chapters from `../src` and the existing mdBook publishing workflow. `/` opens the wizard chooser. Magic and Real world enter the same introduction directly, with a same-chapter world switch. The ALUX logo returns to the chooser. The redundant showcase homepage and standalone directory are outside the reading path; `/magic.html` and `/contents.html` remain compatible aliases.

## Run locally

Use Node 22+ and `pnpm install`, then `pnpm dev` on `127.0.0.1:4173`. `pnpm build` validates translations, renders the book, and writes direct static routes. `pnpm preview --port 4174` serves the reviewed production build. Only local work is authorized: do not push, publish or alter deployment until the owner approves this design.

## Reading

The magic reader uses soft physical pages, visible chapter navigation, blank-paper clicks, touch swipes, keyboard turns and continuous reading. Text selection, links, code, tables and interactive regions do not trigger blank-paper turns. Arabic spreads begin on the right and advance in reading order. Long technical blocks remain complete in scroll regions; tables continue between whole rows. The toolbar keeps stable dimensions when navigation opens or closes.

The Real world uses a quiet technical-document layout with neutral gray-white day mode and neutral charcoal night mode. It has one day/night toggle. Both readers share their day/night and font-size preferences, with body and chapter navigation scaling together. The real reader defaults to 20px body and 18px navigation, while the magic reader uses its 22px literary face with language-specific metrics. Both font-size controls remain available on phones.

My bookmarks is visible in each sidebar. Multiple saved chapters retain their world and reading position, can be opened or removed, and migrate the older single-bookmark setting. Bookmarks, reading preferences and manual language choices are stored on the current browser; no account or server-side reading collection is implied.

## Languages

The menu order is English, 简体中文, 繁體中文, 日本語, 한국어, Tiếng Việt, Deutsch, Español, Русский, Українська, العربية. English has no language prefix. The other paths use `/zh/`, `/zh-hant/`, `/ja/`, `/ko/`, `/vi/`, `/de/`, `/es/`, `/ru/`, `/uk/`, `/ar/`. The Real reader follows the language directory, e.g. `/zh/real/introduction.html`. HTML uses `zh-Hans` and `zh-Hant`. Old `?lang=` links and common Chinese locale aliases are canonicalized without losing the chapter or anchor.

All ten translations contain 1,860 prose units and 133 interface labels. Code, API identifiers, formulas, diagrams and reference titles retain their original technical spelling. Each language has received a semantic review. The build checks key coverage, protected tokens and empty translated links/emphasis. Arabic prose is RTL; code and math remain LTR. Original English Markdown remains authoritative and unchanged.

Resolution order is an explicit language path or legacy query, a saved manual choice, a session-cached IP-country result, then English. First visits use the public GeoJS country endpoint with a short timeout; only the resulting language is cached, not the returned IP address. A manual selection persists and takes precedence over later country detection. Unsupported countries and failed lookups fall back to English. Country detection does not infer a person's native language.

## Brand and sharing

`public/alux-black.png` and `public/alux-white.png` preserve the owner's official geometry. The favicon embeds ordinary scaled copies of those marks. Magic mastheads retain the generated bronze material variants; the technical reader uses the original mark and a live typographic wordmark. The magic Rust chapter emblem and the spine's cloth ribbon are generated assets; original source illustrations remain intact in `src`.

All static routes include localized Open Graph and X large-image card metadata, localized 1200×630 JPEG cards, canonical links and language alternates. `scripts/share-card-design.mjs` contains the share-card composition. Set `ALUX_SITE_URL` only when preparing a separately authorized deployment; the local build defaults to `http://127.0.0.1:4174`. Telegram/X previews are checked locally; real crawler fetches and platform caches require a reachable public URL and have not been published or claimed verified here.

Static chapter routes also provide localized no-JavaScript reading fallbacks. No original source chapter, formula, code example, media embed or publishing workflow is removed by the web layer.
