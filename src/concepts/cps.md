# Continuation-Passing Style (CPS)

```admonish tip title="Related"
Concepts: [Free Monad](../concepts/free_monad.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [Mini EVM](../insights/evm-alg.md)
```

### Definition

Continuation-Passing Style (CPS) is a way of writing programs where functions do not return values directly. Instead, they pass their result to another function called a *continuation*, which represents the rest of the program.

### Motivation

* Makes control flow explicit and programmable.
* Enables advanced transformations such as non-blocking IO, early exits, coroutines, backtracking, and concurrency scheduling.
* Used in compiler intermediate representations to simplify optimization and analysis.

### Basic Form

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

### Key Properties

* All function calls are *tail calls* to continuations.
* The current computation never "returns" to the caller; instead it jumps into the continuation.
* Control flow becomes explicit in the program.

### Relation to Higher-Order Functions

* In CPS, continuations are just higher-order functions.
* Each step of the computation receives a continuation representing what to do next.

### Relation to Defunctionalization

* In CPS, the continuation is an actual function value.
* Defunctionalization replaces the continuation function with a data structure (enum) that represents possible next steps, plus an `apply` function to interpret them.

### Relation to Free Monads

* The `FlatMap` constructor in a free monad is exactly a stored continuation.
* Interpreting a free monad is like executing CPS code where the continuation is part of the program data.
* Free monads can be obtained by taking CPS code and defunctionalizing the continuations.

### Advantages

* Flexible control flow representation.
* Easier to reason about evaluation order.
* Powerful for implementing interpreters, debuggers, optimizers, and async runtimes.

### Disadvantages

* Verbose compared to direct style.
* Can be harder to read for humans.
* Requires tail call optimization for efficiency in languages without native support for it.
