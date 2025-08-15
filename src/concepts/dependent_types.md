# Dependent Types

```admonish tip title="Related"
Insights: [Free Monad (dependently)](../insights/free-monad-dependent.md)
```

### Definition

A type system is called *dependent* when types can depend on values. This means that the shape, constraints, or meaning of a type may be parameterized by program values. With dependent types, you can express rich invariants and relationships directly in the type system.

### Examples

* `Vec<n, T>` - a vector type indexed by its length `n`
* `Matrix<rows, cols, T>` - dimensions encoded in the type
* `Proof<p>` - a type representing a proof of a proposition `p`

For instance, in a language with dependent types:

```hs
append : Vec<n, T> -> Vec<m, T> -> Vec<n + m, T>
```

The type says that appending two vectors produces a vector whose length is the sum of the lengths.

## Purpose

* Capture **invariants** in the type system so they are checked at compile time
* Reduce or eliminate certain classes of runtime errors
* Allow programs to carry **proofs** of their own correctness
* Enable more expressive APIs where type signatures encode precise behavior

## Key Characteristics

* **Types are computed**: Types can be expressions evaluated from program values
* **Terms appear in types**: No strict separation between values and types
* **Type checking may evaluate code**: The compiler may need to run computations to verify type constraints
* **Expressiveness**: Can model proofs, exact sizes, state transitions, or logical conditions

## Dependent Function Types

A dependent function type is written (in type theory notation) as:

```hs
Π x : A. B(x)
```

This means: for each value `x` of type `A`, the result type is `B(x)` which may depend on the value of `x`.

In programming terms:

* Non-dependent function:

  ```hs
  f : A -> B
  ```

  The output type `B` is fixed regardless of the input value.

* Dependent function:

  ```hs
  f : (x : A) -> B(x)
  ```

  The output type varies based on the actual input `x`.

## In Practice

* Fully supported in **Agda**, **Idris**, **Coq**, **Lean**
* Rust supports restricted forms via **const generics** and **trait bounds**
* Commonly used for:

  * Exact-size arrays and matrices
  * State machines with type-level states
  * Encoding logical proofs alongside code
