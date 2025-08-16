```admonish warning
This book is in an early stage.
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; border-radius: 50%; background: white;"> ALUX Programming Guidelines

```admonish note
This book is a guide to writing programs by defining their meaning first and their mechanics second.

Inspired by Conal Elliott’s Denotational Design, it treats computation as a clear mathematical object rather than an opaque sequence of steps.

Specifications are expressed as simple, compositional traits that describe *what* a program is. Implementations provide interchangeable ways to *realise* those meanings.

The result is software that is easier to reason about, naturally composable, and correct by construction.
```

## How to Read This Book

This book blends theory and practice. You will see each concept from **two perspectives**:

* **Concepts** — core ideas expressed clearly and precisely, independent of language or framework.
* **Insights** — deeper connections between concepts, with examples, design patterns, and transformations.

The examples are often in Rust but the principles are language-agnostic.

## Who This Book Is For

* Programmers who want to **design for meaning** rather than just mechanics.
* Developers seeking to **connect category theory, type systems, and program design**.
* Readers curious about how ideas like **Free Monads**, **CPS**, **Defunctionalization**, and **Dependent Types** fit together.
