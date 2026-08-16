# Defunctionalization

```admonish tip title="Related"
Design by Meaning in Rust: [First-order programs](../rust-dd/first-order-programs.md), [Language and compiler pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Free monad](../concepts/free_monad.md), [Continuation-passing style](../concepts/cps.md)  
Insights: [EVM algebra](../insights/evm-alg.md)
```

```admonish note title="Semantic placement"
Defunctionalization changes representation while intending to preserve application behavior. In meaning-first design, the generated first-order values are useful when another interpreter must inspect or compose operations before execution.
```

## Definition

Defunctionalization is a program transformation that replaces higher-order functions with a first-order data structure that represents the possible functions, plus an interpreter function that applies them.

## Motivation

Some languages, compilers, or runtimes cannot handle higher-order functions efficiently or at all. By defunctionalizing, you make the program purely first-order, which is easier to compile, analyze, serialize, or run in restricted environments.

## The process

1. Identify all possible higher-order functions that may be created and passed around.
2. Assign each such function a unique tag in an enum or sum type, along with any data it needs to operate.
3. Replace function values with these tags.
4. Define an `apply` function that takes a tag and the function arguments, then pattern matches on the tag to run the correct code.

## Example in Rust

Before: using a closure

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

After: defunctionalized form

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## Properties

* All functions are now represented by simple data.
* The program becomes purely first-order.
* The `apply` function replaces direct function calls.

## Applications

* Compiler backend simplification: many compilers generate CPS code and then defunctionalize it.
* Serialization of functions: you can send the enum tag over a network or store it in a file.
* Static analysis: first-order code is easier to reason about.
* Derivation of interpreters: defunctionalization naturally leads to an interpreter pattern.

## Relation to CPS

In CPS (continuation-passing style), continuations are higher-order functions. Defunctionalizing CPS code turns these continuations into a finite set of cases in an enum plus an apply function.

## Relation to free monads

Suitable free-monad representations can be related to defunctionalized continuations in CPS-transformed programs. This is a close connection, not a universal identity between the two constructions.

## References

- Reynolds, J. C. (1972). *Definitional Interpreters for Higher-Order Programming Languages*.  
  [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
- Yallop, J., and White, L. (2014). *Lightweight Higher-Kinded Polymorphism* (uses defunctionalization to encode type-level application).  
  [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
