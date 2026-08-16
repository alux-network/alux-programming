# Denotational Design

```admonish tip title="Related"
The Semantic View: [Denotations and compositionality](denotations.md), [Laws and interpretations](laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability algebras](../rust-dd/capability-algebras.md), [Derived meaning and composition](../rust-dd/derived-meaning.md)
```

```admonish note title="Core idea"
Denotational Design derives a programming interface from simple, compositional, implementation-independent meanings, letting semantics guide the design rather than describing an interface after the fact.
```

Denotational Design is the practice of deriving a programming interface from simple, compositional, implementation-independent meanings.

The methodology was developed and named by [Conal Elliott](http://conal.net/). Its central move is not merely to assign semantics to an existing language or API. It is to let semantics guide the design of the API itself.

## The design loop

Use this order:

1. Choose the semantic domain.
2. Identify the structure that matters in that domain.
3. Choose a small vocabulary of primitive operations.
4. Derive useful operations compositionally.
5. State the laws those operations obey.
6. Choose one or more representations.
7. Implement interpretations that preserve the structure.
8. Validate them with laws, models, and scenarios.

Representation-first design commonly starts at step 6 and attempts to reconstruct steps 1–5 afterward.

## Designing a branch algebra

Return to branch positions. The desired meaning is a finite path in a binary branching structure.

One possible primitive algebra is:

$$
\begin{aligned}
\operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\
\operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\
\operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction})
\end{aligned}
$$

The partial arrow $\rightharpoonup$ means that the path observation exists only when the first branch is an ancestor of the second.

Useful operations follow:

$$
\begin{aligned}
\operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\
\operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\
\operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\
\operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s)
\end{aligned}
$$

This algebra does not mention vectors, integers, fractions, database keys, or bytes. Those choices come later.

## Structure before convenience

The primitive vocabulary should reveal the structure downstream code depends on. It should not be a collection of every convenient method available on one implementation.

````admonish warning title="Reject representation-first primitives"
This trait is a bundle of storage arrangement, configuration location, bit representation, and a compound workflow. It does not isolate branch meaning:

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

A semantic API may still include effects when effects are part of the chosen domain. The rule is not “everything must be pure.” The rule is “every primitive must state a coherent meaning.”

## Encoding is not methodology

Denotational Design does not require:

* Haskell
* tagless-final encoding
* object algebras
* free monads
* one AST
* pure functions only
* category-theory terminology in every API

These may be useful encodings or explanatory tools. None defines the method.

```admonish note title="Rust encodings"
In Rust, small traits, associated types, extension methods, generic functions, and first-order program values are practical encodings. Their value depends on whether they preserve a clear semantic design.
```

## Type-class morphisms

One way to understand the method is through structure-preserving mappings.

Suppose an interface describes a semantic algebra. An implementation maps its abstract values and operations into a concrete representation. A valid implementation must preserve the relevant operations and laws.

If `encode` maps abstract branches into a concrete carrier, preservation of growth looks like:

$$
\operatorname{encode}(\operatorname{grow}(b,d))
=
\operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d)
$$

The implementation is not merely a bag of methods with matching names. It is intended to be a morphism that respects the algebraic structure.

## What counts as a good abstraction

A good DD abstraction has several properties:

* Its values have a simple intended meaning.
* Its primitives expose semantic observations or constructions.
* Larger behavior is derived from those primitives.
* Its laws do not depend on one representation.
* Independent implementations can interpret it.
* Operational details appear only where they become relevant.

Smallness alone is not enough. A tiny trait exposing `get_manager()` is still representation-first. A larger algebra may be justified when its operations form one coherent semantic structure.

## Semantic values and abstract carriers

Not every concrete type is forbidden from a specification.

Use an associated type when the interpreter should choose the carrier:

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

Use a concrete type when it is stable semantic vocabulary:

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

The distinction is not “abstract good, concrete bad.” It is semantic vocabulary versus accidental machine representation.

## The specification is the denotation, and it need not execute

The specification is the denotation: the mathematical meaning assigned to each construct. Its power comes from being free of the constraints of efficiency and even of executability.

```admonish quote title="Conal Elliott"
It is often much easier and more enlightening to define a denotation than an implementation, because it does not have any constraints or distractions of efficiency, or even of executability.

— [Denotational Design: from meanings to programs (LambdaJam 2015)](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

The canonical example is FRP (Functional Reactive Programming): a `Behavior a` is defined as a function of continuous time,

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

That model is precise but not executable — you cannot enumerate the reals. A program may likewise denote a set of outcomes; neither model runs, and that is the point. The meaning is chosen for simplicity and precision, not for how it will compute.

Executability and efficiency are pushed entirely onto the *implementation*, a separate artifact held correct by homomorphism laws (type class morphisms) that relate it back to the meaning: the meaning function must carry each syntactic composition to the corresponding semantic one. As Conal puts it, the denotation gives "an unambiguous definition of exactly *what* to implement, while leaving a great deal of room for creativity about *how*."

In Rust, several artifacts express parts of this specification, and some of them happen to be executable. Executability is incidental; it is not what makes them a specification:

* prose states intended meaning
* traits state available primitives
* extensions state derivations
* laws state required equalities
* interpreters demonstrate realizability
* tests provide finite evidence

Read them together, with meaning and laws above concrete machinery in authority.

## Further reading

* [Denotational Design: from programs to meanings (BayHac 2014)](https://github.com/conal/talk-2014-bayhac-denotational-design)
* [Denotational design with type class morphisms](http://conal.net/papers/type-class-morphisms/)
* [Conal Elliott's writings and talks](http://conal.net/)
