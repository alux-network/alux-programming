# Operational Semantics in Context

```admonish tip title="Related"
Concepts: [Operational Semantics](../concepts/operational_semantics.md), [Free Monad](../concepts/free_monad.md), [CPS](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)
```

## Why Operational Semantics Matters

Operational semantics gives us the **step-by-step execution model** of a language.  
In ALUX, this plays a central role: it is the bridge between **abstract meaning** and **concrete mechanics**.

## Connection to Free Monads

A free monad describes a program as an **AST of instructions**.  
Interpreting this AST is essentially applying operational semantics:

- **Free monad**: syntax of instructions + sequencing  
- **Operational semantics**: rules that define how each instruction steps  

Thus, an interpreter for a free monad is *exactly* an operational semantics defined as code.

## Connection to CPS

Continuation-Passing Style (CPS) makes the **rest of the computation** explicit.  
Operational semantics can be expressed in CPS:

- Small-step rules correspond to continuations being applied after each instruction.  
- The operational machine is just a CPS interpreter in which the continuation is made first-class.  

This shows how CPS makes operational semantics executable.

## Connection to Defunctionalization

Defunctionalization takes CPS continuations and replaces them with **explicit state transitions**.  
This is precisely what operational semantics rules are:

- Continuation-as-function → State-transition-as-data  
- Apply function → Pattern match on instruction + next state  

The result is a **transition system** that matches the structure of operational semantics directly.

## Real Example: The EVM

The Ethereum Virtual Machine (EVM) can be understood operationally:

- **State**: program counter, stack, memory, storage, gas  
- **Transition rules**: one for each opcode (`ADD`, `PUSH`, `SSTORE`, etc.)  
- **Execution**: repeatedly apply small-step rules until halting  

In ALUX terms:  
- The **EVM bytecode** is a defunctionalized free monad program.  
- The **EVM interpreter** is its operational semantics.  

## Dependent Types as Enriched Semantics

Dependent types can enrich operational semantics with proofs:

- **Stack safety**: `pop` only valid if stack depth > 0  
- **Gas constraints**: program type encodes available gas and its consumption  
- **Resource invariants**: state transitions guaranteed by types  

This turns operational semantics from *rules for execution* into *proofs of correctness*.

## Summary

- Operational semantics is the **execution model** of programs.  
- Free monads encode the same idea as syntax + sequencing.  
- CPS and defunctionalization provide mechanical ways to express operational semantics.  
- Real systems like the EVM are defunctionalized operational semantics in practice.  
- Dependent types elevate semantics into **proof-carrying computations**.
