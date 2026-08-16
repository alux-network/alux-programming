# Continuation-passing style (CPS)

```admonish tip title="Related"
Design by Meaning in Rust: [First-order programs](../rust-dd/first-order-programs.md), [Language and compiler pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Free monad](../concepts/free_monad.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [EVM algebra](../insights/evm-alg.md)
```

```admonish note title="Semantic placement"
CPS is a representation and program transformation that makes control explicit. Whether it preserves meaning depends on a stated source semantics, target semantics, and correspondence between them.
```

## Definition

Continuation-Passing Style (CPS) is a way of writing programs where functions do not return values directly. Instead, they pass their result to another function called a *continuation*, which represents the rest of the program.

## Motivation

* Makes control flow explicit and programmable.
* Enables advanced transformations such as non-blocking IO, early exits, coroutines, backtracking, and concurrency scheduling.
* Used in compiler intermediate representations to simplify optimization and analysis.

## Basic form

In direct style:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

In CPS:

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

Here, `k` is the continuation. Instead of returning `x + 1`, we call `k(x + 1)`.

## Key properties

* All function calls are *tail calls* to continuations.
* The current computation never "returns" to the caller; instead it jumps into the continuation.
* Control flow becomes explicit in the program.

## Relation to higher-order functions

* In CPS, continuations are just higher-order functions.
* Each step of the computation receives a continuation representing what to do next.

## Relation to defunctionalization

* In CPS, the continuation is an actual function value.
* Defunctionalization replaces the continuation function with a data structure (enum) that represents possible next steps, plus an `apply` function to interpret them.

## Relation to free monads

* The `FlatMap` constructor in a free monad is exactly a stored continuation.
* Interpreting a free monad is like executing CPS code where the continuation is part of the program data.
* Suitable free-monad encodings can be related to CPS and defunctionalized continuation representations.

## Advantages

* Flexible control flow representation.
* Easier to reason about evaluation order.
* Powerful for implementing interpreters, debuggers, optimizers, and async runtimes.

## Disadvantages

* Verbose compared to direct style.
* Can be harder to read for humans.
* Requires tail call optimization for efficiency in languages without native support for it.
