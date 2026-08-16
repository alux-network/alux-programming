# Laws and interpretations

```admonish tip title="Related"
The Semantic View: [Denotational Design](design.md)  
Design by Meaning in Rust: [Laws, scenarios, and evidence](../rust-dd/laws.md), [Interpreters and effects](../rust-dd/interpreters.md)  
Concepts: [Branching and confluence](../concepts/branching.md)
```

```admonish note title="Core idea"
Laws state how the operations of a semantic interface relate, and an interpretation assigns concrete carriers that must preserve those laws. The chosen equality fixes which differences between interpreters are meaningful and which are free.
```

A semantic interface names operations. Laws say how those operations relate. Without laws, two implementations may satisfy the same Rust signatures while disagreeing about the abstraction.

## Laws complete the vocabulary

For branch positions, useful laws include:

$$
\begin{aligned}
\operatorname{path}(b,b) &= \lbrack\,\rbrack \\
\operatorname{path}(\operatorname{root}, \operatorname{from\_path}(d_s)) &= d_s \\
\operatorname{from\_path}(\operatorname{path}(\operatorname{root},b)) &= b \\
\operatorname{is\_ancestor}(b,b) &= \mathsf{true} \\
\operatorname{left}(b) &\ne \operatorname{right}(b)
\end{aligned}
$$

These laws explain more than method comments can. They describe identity, reconstruction, reflexivity, and separation.

Not every attractive equation is valid. For example, a fixed-width representation may overflow at extreme depth. That is either:

* an interpreter limitation outside its admitted domain
* a semantic error that the interface must expose
* evidence that the chosen carrier is wrong

The design must say which.

## Interpretation

An **interpretation** assigns concrete carriers and operations to a semantic algebra.

| Semantic program | Possible interpretations |
| --- | --- |
| Branch position | Bit path, numeric tree, symbolic form |
| Expression program | Evaluator, pretty-printer, optimizer |
| Typed API program | Executable server routes, documentation, client generator |

The same program can have several interpretations because the program is not identical to any one result.

## Implementation obligations

An interpreter must preserve the structure claimed by the specification.

If merge is associative in the semantic program:

$$
(a \oplus b) \oplus c = a \oplus (b \oplus c)
$$

then interpreters should preserve the observable meaning of that association. If route order is also specified, the equality must include order. If order is intentionally forgotten, implementations may differ operationally while remaining semantically equal.

This is why the semantic domain and equality must be chosen before writing laws.

## Laws, proofs, and tests

These terms are not interchangeable:

* A **law** is a universally intended property of the abstraction.
* A **proof** establishes a law under stated assumptions.
* A **property test** checks many generated examples.
* A **scenario test** checks one meaningful finite situation.
* A **unit test** checks one concrete behavior.

Tests are executable evidence, not universal proof. They are still valuable because they can be reused against every interpreter.

## Executable evidence

Semantic laws are independent of their implementations. Executable checks provide finite evidence that an interpreter preserves those laws: property checks exercise equation-like claims, while scenarios exercise observable interactions. When written only in terms of semantic operations, the same evidence can be reused across compatible interpreters. Tests support a specification; they do not define or prove it.

The Rust encodings are developed in [Laws, scenarios, and evidence](../rust-dd/laws.md).

## Multiple interpreters clarify meaning

A second implementation is not required for every small trait, but it is a powerful design test.

If a supposedly abstract law can only be stated using fields from the first implementation, the semantic boundary is probably wrong. If a second interpreter can implement the primitives and satisfy the same laws without imitating the first representation, the abstraction is gaining credibility.

Neutral interpreters are especially useful:

* a text interpreter reveals program structure
* a pure in-memory model isolates laws
* a tracing interpreter reveals selected observations
* a production interpreter performs real effects

## Equality determines refactoring freedom

Every semantic equality grants implementation freedom. If two representations are equal by the chosen denotation, an implementation may replace one with the other.

Every omitted observation also grants freedom. If allocation order is not semantic, it may change. If method order is semantic, it must not.

Laws are therefore not only correctness constraints. They define the safe space for optimization, replacement, and evolution.

## Checkpoint

Before proceeding to Rust encodings, verify that you can answer:

1. What is the semantic carrier?
2. What does the abstraction intentionally forget?
3. Which operations are primitive?
4. Which operations are derived?
5. What equality is being used?
6. Which laws must every interpreter preserve?
7. What evidence will be shared across interpreters?

The rest of the book shows one practical Rust answer. It is an encoding of this semantic picture, not a replacement for it.
