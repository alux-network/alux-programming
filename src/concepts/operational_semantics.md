# Operational Semantics

```admonish tip title="Related"
Concepts: [Free Monad](../concepts/free_monad.md), [CPS](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [Operational Semantics in Context](../insights/operational_semantics.md)
```

## Definition

**Operational semantics** defines the meaning of programs by specifying *how they execute step by step*. It models program execution as transitions between **configurations** - abstract states containing program fragments, environments, or memory.

## Styles of Operational Semantics

### Small-step (Structural Operational Semantics)

Computation is broken into atomic transitions:

```hs
(2 + 3) → 5
(2 + 3) * 4 → 5 * 4 → 20
```

Useful for modeling concurrency, interleaving, and partial execution.

### Big-step (Natural Semantics)
Describes evaluation in terms of final results:

```hs
(2 + 3) * 4 ⇓ 20
```

Often clearer for reasoning about terminating programs.

## Formal Rules

Operational semantics is typically given with **inference rules**.  
For a simple arithmetic language:

```hs
Expr ::= n | Expr + Expr
```

We can write:

```
n1 + n2 → n3      (where n3 = n1 + n2)
```

Evaluation trace:

```hs
(1 + 2) + 3 → 3 + 3 → 6
```

## Why It Matters

- Provides a **precise machine-like model** of execution.  
- Foundation for interpreters and virtual machines.  
- Supports reasoning about correctness, resource use, and safety.  

## Relation to Other Concepts

- **Free Monad**: Encodes operational rules as an AST of instructions.  
- **CPS**: Makes control flow explicit by turning "rest of the program" into a continuation.  
- **Defunctionalization**: Turns continuations into explicit state transitions, directly resembling operational semantics.  
- **Dependent Types**: Can enrich operational rules with proofs (e.g., stack safety, gas bounds).  

## In Practice

Operational semantics is how interpreters are built:  
- The **EVM** can be viewed as a large-step state transition system.  
- Small-step rules directly resemble `match` arms in a Rust interpreter.  

```
(n1 + n2) → n3
```

can be read as Rust code:

```rust
match expr {
    Add(Box::new(Num(n1)), Box::new(Num(n2))) => Num(n1 + n2),
    _ => expr,
}
```

## To think about

Thinking about programming in operational ways or using an imperative style—even with a proof—does not enable us to gain deep insights
<iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Operational thinking (implementation first) prevent us to express and improve ideas
<iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
