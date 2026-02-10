# Defunctionalization

```admonish tip title="Related"
Concepts: [Free Monad](../concepts/free_monad.md), [CPS](../concepts/cps.md)  
Insights: [Mini EVM](../insights/evm-alg.md)
```

## Definition

Defunctionalization is a program transformation that replaces higher-order functions with a first-order data structure that represents the possible functions, plus an interpreter function that applies them.

## Motivation

Some languages, compilers, or runtimes cannot handle higher-order functions efficiently or at all. By defunctionalizing, you make the program purely first-order, which is easier to compile, analyze, serialize, or run in restricted environments.

## The Process

1. Identify all possible higher-order functions that may be created and passed around.
2. Assign each such function a unique tag in an enum or sum type, along with any data it needs to operate.
3. Replace function values with these tags.
4. Define an `apply` function that takes a tag and the function arguments, then pattern matches on the tag to run the correct code.

## Example in Rust

Before: using a closure

```rust
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

After: defunctionalized form

```rust
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

## Relation to Free Monads

A free monad can be seen as the result of defunctionalizing the continuations in a CPS-transformed program. The resulting data structure is the free monad's AST, and the apply function is the interpreter.
