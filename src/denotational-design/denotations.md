# Denotations and compositionality

```admonish tip title="Related"
The Semantic View: [Why meaning comes first](semantic-view.md), [Denotational Design](design.md), [Laws and interpretations](laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability algebras](../rust-dd/capability-algebras.md)  
Concepts: [Referential transparency](../concepts/referential_transparency.md), [Branching and confluence](../concepts/branching.md)
```

```admonish note title="Core idea"
A denotation is a meaning function from syntax to a chosen semantic domain. A semantics is compositional when the meaning of a whole is fixed by the meanings of its parts, which is what makes semantic equality and safe substitution possible.
```

A **denotation** is the meaning assigned to a piece of syntax or a programming construct. We often write:

$$
\llbracket e \rrbracket
$$

for “the meaning of expression `e`.”

The brackets do not require the denotation to be a number. Depending on the domain, a program may denote:

* a value
* a function
* a relation
* a set of possible outcomes
* a state transformation
* a probability distribution
* a process behavior
* a partial result

The first design decision is therefore not “which struct should hold this?” It is “what semantic domain contains the meanings we care about?”

## Semantic domains

For arithmetic expressions, a simple domain may be the integers:

$$
\llbracket e \rrbracket_{eval} \in \mathbb{Z}
$$

For formatting, the same expression language may be interpreted into text:

$$
\llbracket e \rrbracket_{pretty} \in \mathsf{String}
$$

For an effectful computation, the domain might be a state transformation:

$$
\llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State}
$$

For a concurrent language, the domain may describe observable process behavior rather than one predetermined trace.

The chosen domain determines which differences are meaningful. If timing is absent from the domain, two implementations with different timing may still denote the same program. If resource consumption is included, that same difference may become semantic.

## Abstraction forgets intentionally

A useful denotation forgets irrelevant machine detail.

For a branch position, the denotation may preserve the path from the root while forgetting:

* byte layout
* allocation strategy
* cache behavior
* serialization format

For an HTTP program, a portable denotation may preserve method, path, input roles, operation, and output role while forgetting which router or executor will host it.

For a compiler stage, the denotation may preserve the translation from normalized source to executable meaning while forgetting temporary buffers and traversal order.

Forgetting is not a defect. It is what makes alternative representations equivalent.

## Compositionality

A semantics is **compositional** when the meaning of a whole is determined by the meanings of its parts and the way they are combined.

For addition:

$$
\llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket
$$

For sequential function composition:

$$
\llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket
$$

For a parallel process operator, the semantic domain needs a corresponding parallel composition:

$$
\llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket
$$

The exact operator $\otimes$ depends on the chosen process model. The important point is that syntax composition maps systematically to semantic composition.

Compositionality gives local reasoning. If two parts have the same denotation, one may replace the other inside any compositional context:

$$
\llbracket P \rrbracket = \llbracket Q \rrbracket
\implies
\llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket
$$

This is the foundation beneath safe substitution and semantic refactoring.

## Semantic equality

Programs need not be textually or operationally identical to be semantically equal.

Consider two implementations of branch position:

$$
\lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack
$$

and an integer encoding that denotes the same path. Their memory values differ. Their denotations may be equal.

Similarly, two compiler passes may traverse syntax in different orders but produce executables with the same specified behavior. Whether byte-for-byte equality is required is a separate, stronger law.

Always name the equality being claimed:

* value equality
* structural equality
* canonical representation equality
* trace equivalence
* bisimilarity
* observational equivalence
* denotational equality

Confusing these equalities is a common source of false laws.

## Externality is relative

Suppose a computation has meaning:

$$
H \times E \to O
$$

Relative to `H`, evidence `E` is external. If a new abstraction chooses `H × E` as its carrier, that evidence becomes internal to the new boundary.

This observation matters for effects and context. No fact is absolutely “environmental.” The question is whether the current semantic carrier includes it and which laws govern it.

```admonish warning title="Avoid a universal context object"
Do not solve this boundary question with a universal context object. Name each admitted meaning as a capability or explicit value.
```

## Primitive and derived meaning

Primitive operations are those chosen as the vocabulary of the semantic domain. Derived operations are defined from them.

For branch positions, a small primitive vocabulary might be:

* A root position
* Growth by a direction
* Observation of a path from one position to another

Then these may be derived:

* Grow left
* Grow right
* Construct from a path
* Test whether one position is an ancestor of another
* Test whether one position is a descendant of another

The distinction is a design choice, not a metaphysical fact. Prefer a small primitive set that makes laws and alternative interpretations easy to state.

## A useful test

Before introducing a programming interface, complete these sentences:

* Values of this abstraction mean ...
* The primitive observations are ...
* The meaningful compositions are ...
* Two values are equivalent when ...
* Every implementation must preserve ...
* The abstraction intentionally forgets ...

If these sentences cannot be completed, more implementation machinery will not supply the missing meaning.
