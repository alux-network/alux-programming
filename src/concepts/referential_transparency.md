# Referential Transparency

```admonish tip title="Related"
Concepts: [Expression Problem](../concepts/expression-problem.md)  
Insights: [Referential Transparency Reloaded](../insights/referential-transparency.md)
```

Referential transparency (RT) is the substitution property of expressions:
an expression can be replaced by its denotation without changing program meaning.

Today, this is how RT is used in practice: as the basis for equational reasoning, safe refactoring, and law-driven API design.

## Core Meaning

RT says:

- if `e` denotes `v`
- then using `v` instead of `e` preserves meaning

This is a semantic claim, not a coding-style slogan.

### Purity

A pure function returns the same output for the same inputs and has no observable side effects.
RT is the substitution law for expressions: replacing an expression with its denotation must preserve meaning.
So purity is one common way to obtain RT in practice, while RT is the broader semantic criterion.
See [Referential Transparency Reloaded](../insights/referential-transparency.md) for the DD purity-vs-RT distinction.

## Historical Context

In programming-language semantics, RT is strongly associated with Christopher Strachey's framing.
His treatment separates value reasoning from update-heavy behavior:

- **R-values**: expression values.
- **L-values**: locations that can be assigned.

The key point is that expression-level substitution is stable when we stay in value reasoning.
Assignment introduces updates to locations and makes substitution reasoning harder or invalid in the naive form.

## What Assignment And Side Effects Mean Here

In this context:

- **assignment** is updating a location (for example, `x := x + 1`)
- **side effect** is any observable change beyond returning a value

Assignment is a specific kind of side effect.

This is why RT fails in many imperative settings: evaluation can depend on or mutate observable context outside the expression's explicit value interface.

## How Modern Languages Present RT

### Haskell

RT is taught as default reasoning for pure expressions.
Effects are explicit in typed constructions (`IO`, state threading, and related abstractions), so substitution laws are central in daily use.

### Scala (Cats / Cats Effect)

In Scala FP practice, Cats Effect gives the most common RT framing:

- `IO[A]` is a pure description of effectful work
- composition of `IO` values is RT
- execution is explicit at runtime boundaries (`unsafeRun*`)

Cats Effect also contrasts this with eager `Future` evaluation, which is one reason RT discussions in Scala emphasize laziness and delayed execution.

## RT Today

Across modern ecosystems, RT is used as shorthand for substitution-safe behavior.
In mixed-paradigm systems, teams usually apply RT claims to specific modules, APIs, or effect-typed regions rather than to all code globally.

For the Denotational Design interpretation of RT, see [Referential Transparency Reloaded](../insights/referential-transparency.md).

## References

- Strachey, C. *Fundamental Concepts in Programming Languages* (Oxford PRG lecture notes, 1967).  
  [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
- Cats Effect docs: `IO` data type and RT/lazy evaluation notes.  
  [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
- Typelevel blog: *An IO monad for cats* (Scala impurity vs RT motivation).  
  [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
