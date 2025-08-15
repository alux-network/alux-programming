# Free Monads with Dependent Types

```admonish tip title="Related"
Concepts: [Free Monad](../concepts/free_monad.md), [Dependent Types](../concepts/dependent_types.md)
```

## Dependent Types as a Natural Fit

Free monads describe computations as **data**.
Dependent types allow us to express **properties of these computations in their types**.
By combining the two, we can write programs that are:

* **Easier to compose** because type constraints guide construction
* **Safer** because invalid programs cannot type-check
* **Self-documenting** because the type itself encodes a specification
* **Proof-carrying** because the type may serve as a logical statement and the program as its proof

## Making Composition Easier

In a non-dependent setting, a free monad type might look like:

```hs
Free<F, A>
```

where `F` is the instruction set and `A` is the return value type.

With dependent types, we can enrich this to:

```hs
Free<F, A, P>
```

where `P` is a **predicate or property** about the program.
The type system can ensure that when two programs are composed with `flat_map`, the resulting program's property is automatically derived from the inputs.

Example:

```hs
Free<EvmInstr, A, GasUsed <= Limit>
```

The type carries a proof that the program's gas usage is below the limit.

## Turning Programs into Proofs

In dependent type theory, a type can represent a proposition and a term of that type is a proof.
A free monad program can be viewed as a **construction of a proof** about the sequence of instructions.

Example in a dependently typed language:

```hs
-- In Idris/Agda style
data Program : GasLimit -> GasLimit -> Type -> Type where
  Pure   : A -> Program g g A
  Instr  : F X -> Program g1 g2 X -> Program g1 g2 A
```

Here:

* The type `Program g_in g_out A` says that running the program transforms the available gas from `g_in` to `g_out` and produces an `A`.
* Writing a program of this type is a proof that the gas accounting is correct.

## Benefits Over Plain Free Monads

Without dependent types:

* Safety relies on runtime checks or careful manual construction.
* Properties like "stack never underflows" or "resource usage within bounds" require testing or external proofs.

With dependent types:

* The type system enforces these properties during program construction.
* A well-typed program is already a **certificate** that it satisfies the desired property.

## Example: Safe Stack Operations

Plain free monad:

```hs
push : Val -> Free<StackInstr, ()>
pop  : Free<StackInstr, Val> -- may fail at runtime if empty
```

Dependent free monad:

```hs
push : Val -> Program<Depth, Depth + 1, ()>
pop  : Program<Suc Depth, Depth, Val> -- only type-checks if Depth > 0
```

Here, the type encodes the **stack depth** before and after the operation.
An attempt to `pop` from an empty stack is a type error, not a runtime failure.

## Summary

* Dependent types turn free monads into **proof-carrying programs**.
* They make composition easier by tracking and combining properties automatically.
* They can statically guarantee safety and correctness without runtime checks.
* The type of a free monad program can *be* the proposition it proves.
