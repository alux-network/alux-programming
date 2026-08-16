# Operational semantics

```admonish tip title="Related"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Language and compiler pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Free monad](../concepts/free_monad.md), [Continuation-passing style](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [Semantics to machines](../insights/operational_semantics.md)
```

## Definition

**Operational semantics** describes program behavior with evaluation judgments or transitions between **configurations**. A configuration may contain a program fragment together with an environment, store, continuation, or other abstract machine state.

The description is mathematical: it states which evaluations or transitions are valid. An interpreter or virtual machine may implement those rules, but a particular implementation is not itself the definition.

```admonish note title="Semantic placement"
Operational semantics is a precise semantics, not merely informal implementation detail. It explains behavior through evaluation or transition rules. [Denotational Design](../denotational-design/design.md) asks a complementary prior design question: which compositional meanings and equations should those rules preserve?
```

## Styles of operational semantics

### Small-step (structural operational semantics)

Computation is broken into atomic transitions:

$$
\begin{aligned}
2 + 3 &\to 5 \\
(2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20
\end{aligned}
$$

Useful for modeling concurrency, interleaving, and partial execution.

### Big-step (natural semantics)
Describes evaluation in terms of final results:

$$
(2 + 3) \cdot 4 \Downarrow 20
$$

Often clearer for reasoning about terminating programs.

## Formal rules

Operational semantics is typically given with **inference rules**. For a simple arithmetic language:

$$
E ::= n \mid E + E
$$

For left-to-right evaluation, three rules are needed:

$$
\frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2}
\qquad
\frac{E_2 \to E_2'}{n + E_2 \to n + E_2'}
\qquad
n_1 + n_2 \to n_3
\quad \text{where } n_3 = n_1 + n_2
$$

The first two rules select the next reducible subexpression. The third performs addition once both operands are values.

Evaluation trace:

$$
(1 + 2) + 3 \to 3 + 3 \to 6
$$

## Why it matters

- Provides a **precise machine-like model** of execution.  
- Foundation for interpreters and virtual machines.  
- Supports reasoning about correctness, resource use, and safety.  

## Relation to other concepts

- A **free monad** provides instruction syntax and sequencing. Operational rules can describe how a program in that representation evaluates.
- **CPS** makes the rest of a computation explicit as a continuation. Operational rules can describe how values pass to those continuations.
- **Defunctionalization** replaces a known family of functions with first-order data and an `apply` operation. Operational rules can describe the resulting explicit machine states.

These are objects and transformations that may be given an operational semantics. They are not operational semantics themselves.

## In practice

Operational rules can guide an interpreter and provide a precise model against which to check it:

- The **EVM** can be modeled naturally as a small-step state transition system, while a terminating whole execution can also be related by a big-step judgment.
- Small-step rules often correspond closely to `match` arms in a Rust interpreter.

$$
n_1 + n_2 \to n_3
$$

The complete left-to-right relation above can be represented as Rust code:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

This function performs one transition. Repeated application produces the displayed trace; returning `None` means that the expression is already a value.

## Operational and denotational questions

Operational rules can prove safety, progress, resource bounds, and correspondence with implementations. The limitation appears when operational machinery is chosen before the intended abstract meaning: implementation choices can become accidental semantic commitments.

Denotational Design does not reject operational semantics. It asks us to state the semantic domain, composition, and laws first, then relate the operational model to them.

| View | Question |
| --- | --- |
| Denotational | What does the whole program mean? |
| Operational | By which transitions is it evaluated? |
| Correctness | Do those transitions preserve the intended meaning? |

The following clips motivate the danger of treating operational descriptions as the only source of insight.

<figure>
  <iframe
    width="100%"
    height="315"
    src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ"
    title="Talk clip — operational description is not the whole meaning (1 of 2)"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
  <figcaption>Operational description is not the whole meaning (1 of 2)</figcaption>
</figure>

<figure>
  <iframe
    width="100%"
    height="315"
    src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw"
    title="Talk clip — operational description is not the whole meaning (2 of 2)"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
  <figcaption>Operational description is not the whole meaning (2 of 2)</figcaption>
</figure>
