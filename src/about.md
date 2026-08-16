# About

This book distills a way of thinking about software inspired by Conal Elliott’s **Denotational Design**. The core idea is simple yet profound:

```admonish note title="Denotational Design"
*Define the meaning of a program before deciding how it runs.*
```

In this view, computation is not an opaque sequence of steps but a transparent mathematical object. We begin with **specifications** as pure, compositional descriptions of *what* a program means. These are expressed as algebraic structures, often in the form of traits or type signatures. The **implementation**, *how* those meanings are realized, is a separate, interchangeable layer.

By separating meaning from mechanics, we gain:

* **Clarity** - programs read like precise definitions.
* **Composability** - parts fit together algebraically.
* **Refactorability** - meaning stays fixed while implementation evolves.
* **Correctness** - reasoning about programs becomes equational, not operational.

These guidelines aim to provide practical techniques for applying this style in modern programming languages, especially Rust, without losing the elegance and rigor of its mathematical roots.

The book distinguishes three levels deliberately:

* **Meaning** states what values, relations, and transformations are being designed.
* **Representation** chooses how those meanings are encoded in types and data.
* **Execution** chooses how a representation runs on a machine.

ALUX and Tolang motivate many of the examples, but you do not need them to follow this edition. The book develops the vocabulary first.

## Reference of mdbook

[mdBook documentation](https://rust-lang.github.io/mdBook/index.html)

## Reference of **admonish** mdbook plugin (tooltip boxes)

[admonish documentation](https://tommilligan.github.io/mdbook-admonish/)
