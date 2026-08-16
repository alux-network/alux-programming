# Concepts introduction

<img class="section-image" src="../assets/concepts.png" alt="Concepts — the programming machinery">

```admonish tip title="Related"
The Semantic View: [Why meaning comes first](../denotational-design/semantic-view.md)  
Design by Meaning in Rust: [Capability algebras](../rust-dd/capability-algebras.md)  
Insights: [Introduction](../insights/index.md)
```

The chapters in this part explain important programming machinery and theoretical tools:

* operational semantics describes execution rules
* CPS makes control continuation explicit
* defunctionalization turns known higher-order behavior into first-order data
* free monads represent effect syntax with sequencing
* expression-problem encodings manage extensibility
* referential transparency supports substitution
* confluence, traces, and bisimulation compare forms of behavior

These concepts are not replaced by Denotational Design. They are placed within it.

```admonish quote title="Machinery vs. meaning"
[Concepts](index.md) and [Insights](../insights/index.md) explain useful programming machinery. [Denotational Design](../denotational-design/design.md) explains how to decide what machinery should preserve.
```

Use three questions while reading each chapter:

1. Is this concept describing meaning, representation, execution, or a transformation between them?
2. Which observations and equalities does it preserve?
3. Is it the specification, one encoding of the specification, or one interpreter?

Several chapters were written before the book adopted this explicit semantic progression. Their examples retain an operational emphasis intentionally. The contextual links and Insights chapters connect them back to the semantic view.
