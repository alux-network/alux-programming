# <img src="src/assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX programming guidelines

A book about **designing programs by meaning first** — specifying *what* a program means before deciding *how* it runs — in the style of Conal Elliott's Denotational Design, with a concrete path into Rust.

It provides the foundation for understanding and contributing to ALUX’s meaning-first codebase.

Built with [mdBook] and published to GitHub Pages: <https://alux-network.github.io/alux-programming/>

## What's inside

The book is organized in four parts (full table of contents in [`src/SUMMARY.md`](src/SUMMARY.md)):

- **The Semantic View** — denotations, compositionality, laws and interpretations, dependent types: the meaning-first foundation.
- **Design by Meaning in Rust** — capability algebras, derived meaning and composition, interpreters and effects, laws/scenarios/evidence, first-order programs, compiler pipelines, and a meaning-first workflow.
- **Concepts** — operational semantics, the expression problem, referential transparency, free monads, continuation-passing style, defunctionalization, branching and confluence.
- **Insights** — short essays connecting those concepts back to the semantic view (semantics to machines, the expression problem reloaded, referential transparency reloaded, and the EVM as an algebra).

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
