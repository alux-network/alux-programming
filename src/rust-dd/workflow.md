# A meaning-first workflow

```admonish tip title="Related"
The Semantic View: [Why meaning comes first](../denotational-design/semantic-view.md)  
Design by Meaning in Rust: [Capability algebras](capability-algebras.md), [Derived meaning and composition](derived-meaning.md), [Laws, scenarios, and evidence](laws.md)
```

```admonish note title="A repeatable discipline"
Denotational Design is a workflow, not only an explanation of finished code: state the semantic change, find the smallest primitive capabilities, compose them truthfully, then implement thin interpreters and check laws.
```

Denotational Design is most useful as a repeatable development discipline, not only as an explanation of finished code.

## The core workflow

For a new feature or refactor:

1. State the semantic change in one sentence.
2. Identify the carrier and observable equality.
3. Find the smallest primitive capabilities required.
4. Define derived behavior over explicit capabilities.
5. Choose the truthful composition form.
6. Reify a first-order program only if structure needs multiple interpretations.
7. Implement thin concrete interpreters.
8. Add laws or shared scenarios.
9. Validate alternative interpretations.
10. Document meaning before machinery.

## State the semantic change

Weak statement:

> Add a cache and a manager method.

Meaning-oriented statement:

> Resolving the same immutable source name denotes the same source value during one compilation.

The second statement exposes a candidate law. Caching may later be chosen as one implementation.

## Find the primitive boundary

Ask:

* What new observation or transformation is required?
* Is it primitive at this boundary or derivable from existing meaning?
* Is a new associated carrier required?
* Is the supposed dependency only a storage location?
* Which distinctions should remain invisible?

Add a capability only for genuinely new primitive meaning.

## Choose composition truthfully

Use this decision table:

| Question | Choice |
| --- | --- |
| Does one receiver interpret all required meanings? | Direct bounds |
| Is behavior independently selected? | Explicit policy value |
| Are policies independently composable? | Product |
| Does an environment contain another interpreter? | Projection |
| Must a wrapper substitute for the inner interpreter? | Delegation |

Do not introduce a large context trait as the default answer.

## Refactor one meaning at a time

When existing code is representation-first:

1. Identify one semantic observation.
2. Define one small capability.
3. Move one derivation into an extension.
4. Keep the current struct as its interpreter.
5. Add one law-style test.

```admonish warning title="DD is not abstraction maximalism"
Avoid rewriting an entire subsystem into speculative abstractions. DD is not abstraction maximalism.
```

## Review from meaning to machinery

Read code in this order:

1. capability traits
2. semantic value types
3. derived extensions
4. first-order program syntax, if present
5. shared laws and scenarios
6. concrete interpreters
7. runtime orchestration

Starting from the largest state struct biases the review toward its representation.

## Common failure modes

````admonish warning title="Trait-shaped concrete state is not Denotational Design"
```rust,noplayground
trait ContextAlg {
    fn state(&self) -> &ConcreteState;
}
```

The trait changes syntax but not meaning ownership. The semantic core still depends on the concrete representation.
````

### Derived logic in every interpreter

If every implementation independently defines the same domain algorithm, the specification is duplicated.

### God capability

A supertrait containing unrelated operations hides the dependency row and prevents independent interpretation.

### Framework-owned specification

If route annotations or RPC registration are the only interface definition, documentation and execution can drift.

### Macro-owned meaning

If generated code has no public first-order target, the macro expansion becomes the accidental specification.

### Policy hidden in defaults

If `Default` silently chooses quorum, retry, ordering, or compilation policy, composition is no longer explicit.

### Tests of private steps

Tests coupled to field layout or traversal order discourage valid alternative interpreters.

## Pull request checklist

### Meaning

* Is the semantic change stated?
* Is the carrier and equality clear?
* Are intentional omissions named?

### Capabilities

* Does each trait expose coherent primitive meaning?
* Are bounds placed where operations use them?
* Does derived code avoid concrete fields?

### Composition

* Are direct bounds, policies, products, projections, and delegation used truthfully?
* Are semantic defaults explicit?

### Programs and interpreters

* Is first-order structure introduced only when another interpretation needs it?
* Can convenience macros lower to public program values?
* Are concrete interpreters thin and boundary-specific?

### Evidence

* Is a law or focused semantic assertion present?
* Can the same scenario run against another interpreter?
* Are finite tests described as evidence rather than proof?

## Reading ALUX-style code

The broad shape to recognize is:

1. Tiny primitive capability traits
2. Derived extensions over explicit bounds
3. First-order programs when inspection or composition requires them
4. Shared laws and scenarios
5. Concrete runtime, compiler, HTTP, RPC, or storage interpreters

Large concurrent systems still contain orchestration-heavy regions. Do not assume every existing interface is already an ideal denotational specification. Look for the semantic seams and read outward from them.

Tolang uses the same perspective at language scale: syntax is normalized into meaning-bearing forms, compilation preserves that meaning, and a concurrent runtime interprets the executable representation. The operational story remains essential, but it comes after the semantic contract.

## Final principle

When uncertain, return to one question:

```admonish quote title="The question to return to"
What meaning is this machinery supposed to preserve?
```

That question does not solve every engineering problem. It makes the problem visible at the correct level.
