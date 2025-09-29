# <img src="src/assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX programming guidelines

## Compile the book

Install `mdbook` and preprocessors.

_Dependencies of `mdbook-admonish` preprocessor requires rustc 1.64.0 or newer._

```sh
cargo install mdbook mdbook-admonish mdbook-katex mdbook-linkcheck
```

## Run the book locally

```sh
mdbook serve
```

Open HTML book at [http://localhost:3000](http://localhost:3000).
