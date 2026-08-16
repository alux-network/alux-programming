```admonish warning title="ALUX project"
ALUX codebase is under active development and is not yet publicly available.
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX programming guidelines

```admonish note
This book develops the foundation needed to understand and contribute to ALUX’s meaning-first codebase, beginning with a central principle of [Denotational Design](denotational-design/design.md): define what programs mean before deciding how they work.

Following Conal Elliott, it treats computation as a clear mathematical object rather than an opaque sequence of steps.

Specifications are expressed as simple, compositional [capability traits](rust-dd/capability-algebras.md) that describe *what* a program means. [Interpreters](rust-dd/interpreters.md) provide interchangeable ways to *realize* those meanings.

The result is software whose composition rules, implementation obligations, and [valid equations](denotational-design/laws-and-interpretations.md) are easier to see and test.
```

```admonish quote title="Machinery vs. meaning"
[Concepts](concepts/index.md) and [Insights](insights/index.md) explain useful programming machinery. [Denotational Design](denotational-design/design.md) explains how to decide what machinery should preserve.
```

## How to read this book

Read the book in three layers:

* [**The Semantic View**](denotational-design/semantic-view.md) introduces [denotations and compositionality](denotational-design/denotations.md), [laws and interpretations](denotational-design/laws-and-interpretations.md), and the relationship between meaning and representation.
* [**Design by Meaning in Rust**](rust-dd/capability-algebras.md) turns that view into [small capabilities](rust-dd/capability-algebras.md), [derived extensions](rust-dd/derived-meaning.md), [first-order programs](rust-dd/first-order-programs.md), and [thin interpreters](rust-dd/interpreters.md).
* [**Concepts**](concepts/index.md) and [**Insights**](insights/index.md) explain important execution models, encodings, transformations, and connections.

The semantic principles are language-agnostic. Rust is the primary implementation language, and a [concurrent language pipeline](rust-dd/compiler-pipelines.md) connects these principles to Tolang.

## Who this book is for

* Programmers who want complex software to remain **modular, composable, testable, and maintainable** as it evolves.
* Developers seeking to **connect category theory, type systems, and program design**.
* Readers familiar with representational and operational techniques—such as [**free monads**](concepts/free_monad.md), [**continuation-passing style (CPS)**](concepts/cps.md), and [**defunctionalization**](concepts/defunctionalization.md)—who want to understand how that machinery serves, rather than defines, meaning-first design.
* Readers familiar with [**dependent types**](denotational-design/dependent-types.md) and proof-oriented programming who want to apply that mental model while writing high-performance Rust.
* Contributors who need to read [meaning-first Rust specifications](rust-dd/capability-algebras.md) and understand how a [concurrent language can be compiled](rust-dd/compiler-pipelines.md) without making its compiler the definition of the language.
