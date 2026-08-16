# Dependent types and proofs

```admonish tip title="Related"
The Semantic View: [Denotational Design](design.md), [Laws and interpretations](laws-and-interpretations.md)  
Design by Meaning in Rust: [Semantic types in Rust](../rust-dd/semantic-types.md), [Laws, scenarios, and evidence](../rust-dd/laws.md)
```

```admonish note title="Semantic placement"
Dependent types express value-indexed propositions and evidence in a type system. They can encode part of a semantic specification, but they do not choose that specification: the intended property must be clear before it is promoted into a type.
```

## Types indexed by values

A type is *dependent* when it can depend on a value. A dependent type can therefore describe not only the shape of a value, but also a relationship that the value must satisfy.

Examples include:

* `Vec<n, T>` — a vector indexed by its length `n`
* `Matrix<rows, cols, T>` — a matrix indexed by its dimensions
* `Proof<p>` — evidence for a proposition `p`

For example:

```hs
append : Vec<n, T> -> Vec<m, T> -> Vec<n + m, T>
```

The result type states that appending vectors of lengths `n` and `m` produces one of length `n + m`.

## Dependent functions

A dependent function type is written:

$$
\Pi (x : A).\,B(x)
$$

For each value $x$ of type $A$, the result has type $B(x)$. Compare:

$$
\begin{aligned}
f &\colon A \to B \\
g &\colon (x : A) \to B(x)
\end{aligned}
$$

The result type of $f$ is fixed. The result type of $g$ may vary with its input.

Under the propositions-as-types correspondence, a type can state a proposition and a term inhabiting that type can serve as its proof. This supports APIs in which invalid states, transitions, or compositions cannot be constructed.

## Relationship to Denotational Design

Denotational Design asks first:

1. What is the semantic domain?
2. Which observations and compositions matter?
3. Which laws must hold?

Dependent types can then internalize some of those answers. A type index might record a vector length, protocol state, stack depth, resource bound, or proof that two constructions denote the same result.

The order matters. A sophisticated type does not supply missing meaning. It strengthens a specification only when the indexed proposition already describes an intended semantic distinction or a deliberately chosen representation invariant.

```admonish warning title="Do not confuse semantic propositions with representation invariants"
Both may be encoded in types, but they have different authority. A semantic proposition must be preserved by every compatible interpreter. A representation invariant constrains only the representation that chose it.
```

## Proofs and executable evidence

A proof establishes a proposition under stated assumptions. Property tests, scenarios, and unit tests provide finite executable evidence. Encoding a proposition in a dependent type may let type checking verify a proof term, but it does not turn testing into proof or make the compiler the source of the proposition.

This is the same separation used throughout the book: meaning and laws state the obligation; tools check or realize it.

## Applying the model in Rust

Rust is not a fully dependently typed language, but const generics, typestate, associated types, and trait bounds can express useful indexed relationships. These encodings can move checks to compile time and often preserve efficient concrete representations.

The proof-oriented mental model remains valuable even when Rust cannot express the complete proposition. State the invariant explicitly, encode the part the type system can enforce, and retain laws or tests for the remainder. The encoding serves the specification; it does not replace it.

```admonish example title="A grid indexed by its position"
[`typed-grid-rs`](https://github.com/tgrospic/typed-grid-rs) realizes the `Matrix<rows, cols, T>` idea above in stable Rust. Each cell becomes a type indexed by its coordinate — `Pos0x0`, `Pos1x2`, and so on — and a move returns a *different* position type:

`Pos0x0.right()` denotes `Pos1x0`; stepping off an edge is not a runtime error but a program that does not typecheck, because the corresponding move is never generated at the boundary.

This is the same lift the section describes: the coordinate that would live in the value world is promoted into the type, and valid navigation becomes a total, compile-time-checked function. The marker types are zero-sized, so the indexed proposition costs nothing at run time.
```
