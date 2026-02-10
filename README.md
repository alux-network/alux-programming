# <img src="src/assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX programming guidelines

## Compile the book

Install `mdbook` and preprocessors.

_Dependencies of `mdbook-admonish` preprocessor requires rustc 1.64.0 or newer._

```sh
cargo install mdbook --version 0.4.52 --locked
cargo install mdbook-admonish --locked
cargo install mdbook-katex --locked
cargo install mdbook-linkcheck --locked
```

## Run the book locally

```sh
mdbook serve
```

Open HTML book at [http://localhost:3000](http://localhost:3000).
