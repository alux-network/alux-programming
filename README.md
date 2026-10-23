# ALUX Programming

**English** · [简体中文](docs/README.zh.md) · [繁體中文](docs/README.zh-hant.md) · [日本語](docs/README.ja.md) · [한국어](docs/README.ko.md) · [Tiếng Việt](docs/README.vi.md) · [Deutsch](docs/README.de.md) · [Español](docs/README.es.md) · [Русский](docs/README.ru.md) · [Українська](docs/README.uk.md) · [العربية](docs/README.ar.md)

![ALUX Programming](web/public/social/alux-programming-en.jpg)

A book about designing programs by first defining their meaning, then choosing how to execute them. It follows Conal Elliott’s denotational design approach through composition, laws and interpreters, with examples in Rust.

The book provides the foundation for understanding and contributing to ALUX’s meaning-first codebase. Written by Tomislav Grospic.

[Read online](https://alux-network.github.io/alux-programming/) · [Contents](src/SUMMARY.md) · [Web reader setup](web/README.md)

## In the book

- **The Semantic View** — denotations, compositionality, laws, interpretations and dependent types.
- **Design by Meaning in Rust** — capability traits, derived operations, interpreters, evidence and compiler pipelines.
- **Concepts** — operational semantics, free monads, continuations, defunctionalization and related mechanisms.
- **Insights** — connections between those mechanisms, program meaning and execution.

## Multilingual web reader

The web reader offers eleven languages, a paper book view and continuous scrolling, plus a plain technical view. A full contents page opens chapters directly. Book-view page numbers continue across chapters and adjust to the language, text size and window. Both worlds share font size, day/night mode, search and bookmarks.

[Telegram and X preview](web/previews/social.html) · [Preview the reader](web/previews/index.html) · [Preview screenshots](web/previews/assets/) · [Reader maintenance guide](web/AGENTS.md)

The preview HTML opens locally after checkout; its reader links require the local server below. The published online edition still uses mdBook.

Requires Node.js 22+ and pnpm:

```sh
pnpm --dir web install
pnpm --dir web dev
```

Open [127.0.0.1:4173](http://127.0.0.1:4173/). The reader selects an initial language and remembers a manual choice; all language editions remain available in the language menu. See [the maintenance guide](web/AGENTS.md) before adding content or changing the interface.

## Build and run locally

Requires a Rust toolchain (`mdbook-admonish` needs rustc 1.64 or newer). Install mdBook and the preprocessors, pinned to the versions the CI uses:

```sh
cargo install mdbook --version 0.4.52 --locked
cargo install mdbook-admonish --version 1.20.0 --locked
cargo install mdbook-katex --version 0.9.4 --locked
cargo install mdbook-linkcheck --version 0.7.7 --locked
```

Serve with live reload (opens <http://localhost:3000>):

```sh
mdbook serve --open
```

Build a static site into `book/html`:

```sh
mdbook build
```

## Repository layout

```
src/            book content (Markdown), with SUMMARY.md as the table of contents
src/assets/     images
theme/          additional CSS (index.css) and mdbook-admonish assets
book.toml       mdBook config: preprocessors (admonish, katex), linkcheck, HTML output
.github/        CI workflow that builds and publishes the book
book/           generated output (git-ignored)
```

## Conventions

- **Callouts** — [mdbook-admonish] fenced blocks in the `note` / `tip` / `warning` / `quote` styles, each with an optional `title`.
- **Math** — KaTeX via [mdbook-katex], written with `$…$` (inline) and `$$…$$` (display).
- **Links** — `mdbook-linkcheck` runs as part of the build, so cross-links must resolve. Register each new page in [`src/SUMMARY.md`](src/SUMMARY.md).

## Publishing

On every push to `master`, GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) builds the book and publishes `book/html` to the `github-pages` branch. Pull requests build the book as a check but do not publish.

## Status and license

The book is pre-release and evolving alongside ALUX. Licensing follows the ALUX project; a license file will be added when the project is open-sourced.

[mdBook]: https://rust-lang.github.io/mdBook/
[mdbook-admonish]: https://tommilligan.github.io/mdbook-admonish/
[mdbook-katex]: https://github.com/lzanini/mdbook-katex
