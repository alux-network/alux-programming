# Referential Transparency Reloaded

```admonish tip title="Related"
Concepts: [Referential Transparency](../concepts/referential_transparency.md), [Expression Problem](../concepts/expression-problem.md)
```

This page gives the Denotational Design interpretation of *referential transparency*.
The concept page covers history and mainstream language usage.
Here we focus on what RT means as a design constraint.

In DD, RT is not a purity label.
It is a law on denotations: substitution must preserve specified meaning.

## Denotational Design Restatement of RT

Denotational Design restates RT as a requirement on specifications, not on implementation style.
The specification must define compositional meaning first; execution strategy is chosen later.

So RT is checked at the semantic boundary:

- same inputs
- same declared context
- same denotation

If these hold, substitution is valid and equational reasoning is available.
This remains true even when concrete interpreters perform I/O, concurrency, retries, or state transitions, because those details are delegated behind the specified capabilities.

In other words, DD does not ask "is this implementation pure?"
DD asks "are the denotational equalities explicit, and are interpreters preserving them?"

## Purity And RT

RT and purity are related, but not identical.

- **RT** is a substitution law on meaning.
- **purity** is an operational constraint: no hidden observable effects.

Purity is a common way to obtain RT for expression-level code.
But RT remains the semantic criterion: substitution must preserve specified denotation.

So DD avoids turning RT into a style label like "pure code only".
The requirement is explicit semantic equalities, with effects isolated behind capability boundaries.

One minimal semantic reading is:

```rust
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

For the same `a` and same `io` input, `f` yields the same `(result, io')`.
This is the DD-style, context-indexed form of substitution reasoning.

## Why This Clarifies RT

Many RT debates blur a useful distinction:

- semantic transparency
- operational side effects

DD separates these layers:
- semantic core states meaning
- interpreters realize execution strategy

This separation allows practical effects without losing law-based reasoning.

## Representation-First Failure Mode

If you commit early to concrete representation, RT discussion drifts into style arguments:

- "this style is pure"
- "that style is impure"
- "IO wrappers fix it"

These are mostly encoding debates.
DD asks a simpler question:
what equalities are valid in your specification?

## Practical DD Pattern

Define tiny capability traits and write program behavior as extensions over them.
Then provide thin concrete interpreters.

```rust
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]` is a macro from the [`extend` crate](https://docs.rs/extend/latest/extend/) used to reduce boilerplate by generating extension methods from an `impl` block; it is not a new Rust language feature.

In Scala FP, RT is often presented through values of type `F[A]` (for example `IO[A]`, or `F[Either[E, A]]`).
Here, RT is expressed one level up: as capability-bounded program meaning.
So this Rust method is not an RT value container in the same encoding sense as `F[A]`; it is RT behavior specified over explicit capabilities, with concrete effects delegated to implementations.

The extension states semantic behavior against capabilities.
Concrete implementations decide execution strategy: batching, retries, transport, parallelism, and storage details.

## Final Insight

In Denotational Design, RT is a property of semantic specifications.
Implementation choices are secondary as long as they preserve the stated denotational laws.

Keep the law.
Do not get stuck on the label.
