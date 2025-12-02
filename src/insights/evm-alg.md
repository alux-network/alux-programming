# **EVM as a Virtual Machine**

~~~admonish tip title="Related"
Concepts: [Operational Semantics](../concepts/operational_semantics.md), [Free Monad](../concepts/free_monad.md), [CPS](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)
~~~

The **Ethereum Virtual Machine (EVM)** is a stack-based virtual CPU that executes **Ethereum bytecode**. This bytecode is the compiled form of Ethereum smart contracts, usually written in Solidity, Vyper, or another EVM-compatible language.

At the lowest level:

* The EVM processes **opcodes** (ADD, PUSH, JUMP, SSTORE, etc.).
* Execution state includes:

  * **Stack**: LIFO data stack for operand storage.
  * **Memory**: transient byte array for temporary values.
  * **Storage**: persistent key-value store for each contract.
  * **Program counter**: points to the next opcode.
  * **Gas**: metering system that charges for execution steps.

## **EVM as an Interpreter Pattern**

From the free monad and GoF design patterns perspective:

* **Instruction Set** = EVM opcodes (similar to your `enum Console`).
* **Program AST** = Actually, EVM code is *already compiled*, so it’s a flat sequence of instructions, not a rich high-level AST.
  High-level languages like Solidity first have a compiler that builds an AST, optimizes it, and then emits EVM bytecode.
* **Interpreter** = The EVM specification defines how each opcode changes the machine state.
* **Multiple interpreters** = While the EVM spec is fixed, different clients (Geth, Nethermind, Besu, Erigon) are alternative implementations of the same interpreter.

In GoF terms:

* The EVM is an **Interpreter** over an instruction language (bytecode).
* Opcodes are **Command objects** executed in sequence.
* The program state (stack, memory, storage) acts like the context in Interpreter pattern.

## **EVM and Free Monad Analogy**

If we model the EVM in a free monad style:

1. **Syntax**: Enum of opcodes with parameters, e.g.

   ```rust
   enum EvmInstr<A> {
       Add(A),
       Push(U256, A),
       SStore(U256, U256, A),
       // ...
   }
   ```
2. **Program**: `Free<EvmInstr, ()>` would represent an abstract Ethereum program before compilation.
3. **Semantics**: Interpreter function that executes these instructions against the EVM state.

The difference:

* The real EVM executes a **linear bytecode sequence** (already defunctionalized into an array of low-level instructions).
* A free monad version would allow you to build programs algebraically, chain them with `flat_map`, and then interpret or compile them into EVM bytecode.

## **EVM and CPS / Defunctionalization**

The EVM’s real execution loop is **very similar to a defunctionalized CPS interpreter**:

* In CPS: “do instruction, then call continuation”.
* In EVM: “execute opcode, then increment program counter” is equivalent to applying the continuation for that instruction.
* Defunctionalization: The “continuations” are already turned into a **position in bytecode** (program counter). This is the tag identifying the next action.
* The interpreter (`switch` or `match` on opcode) is the `apply` function of the defunctionalized continuations.

So:

* **CPS form**: Smart contract execution as “do opcode → continuation”.
* **Defunctionalized form**: Replace continuations with `pc` + bytecode array.
* **Free monad form**: Build higher-level EVM programs before compiling them into the defunctionalized form.

## **Key Insight**

EVM execution = **defunctionalized CPS interpreter** for Ethereum bytecode.

| Concept                | Free Monad World                    | EVM Reality                              |
| ---------------------- | ----------------------------------- | ---------------------------------------- |
| Instruction type       | Enum of opcodes                     | Fixed EVM opcodes                        |
| Program representation | AST built from `Free<F, A>`         | Linear bytecode array                    |
| Continuation           | Closure in `FlatMap`                | Program counter (PC)                     |
| Interpreter            | Pattern match on instruction enum   | Switch on opcode, mutate VM state        |
| Multiple interpreters  | Different interpreters for same AST | Multiple Ethereum client implementations |

# Mini EVM

Here’s a **mini-EVM in Rust** using the same free monad style from the `Console` example, so you can clearly see the mapping to Ethereum’s real EVM execution model.

## 1. Instruction Set (EVM subset)

```rust
#[derive(Clone)]
enum EvmInstr<A> {
    Push(u64, A),              // Push constant to stack
    Add(A),                    // Pop two, push sum
    SStore(u64, u64, A),       // Store key-value
    SLoad(u64, fn(u64) -> A),  // Load value from storage
}
```

## 2. Free Monad Core

```rust
#[derive(Clone)]
enum Free<F, A> {
    Pure(A),
    Suspend(F),
    FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>),
}

impl<F: Clone + 'static, A: 'static> Free<F, A> {
    fn pure(a: A) -> Self {
        Free::Pure(a)
    }
    fn flat_map<B: 'static, G>(self, f: G) -> Free<F, B>
    where
        G: Fn(A) -> Free<F, B> + 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            other => Free::FlatMap(Box::new(other), Box::new(f)),
        }
    }
}
```

## 3. Smart Constructors

```rust
fn push(val: u64) -> Free<EvmInstr<()>, ()> {
    Free::Suspend(EvmInstr::Push(val, ()))
}

fn add() -> Free<EvmInstr<()>, ()> {
    Free::Suspend(EvmInstr::Add(()))
}

fn sstore(key: u64, value: u64) -> Free<EvmInstr<()>, ()> {
    Free::Suspend(EvmInstr::SStore(key, value, ()))
}

fn sload(key: u64) -> Free<EvmInstr<u64>, u64> {
    Free::Suspend(EvmInstr::SLoad(key, Free::pure))
}
```

## 4. EVM State

```rust
use std::collections::HashMap;

struct EvmState {
    stack: Vec<u64>,
    storage: HashMap<u64, u64>,
}
```

## 5. Interpreter

```rust
fn run_evm<A>(mut prog: Free<EvmInstr<A>, A>, state: &mut EvmState) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(EvmInstr::Push(v, next)) => {
                state.stack.push(v);
                prog = Free::Pure(next);
            }
            Free::Suspend(EvmInstr::Add(next)) => {
                let b = state.stack.pop().unwrap();
                let a = state.stack.pop().unwrap();
                state.stack.push(a + b);
                prog = Free::Pure(next);
            }
            Free::Suspend(EvmInstr::SStore(k, v, next)) => {
                state.storage.insert(k, v);
                prog = Free::Pure(next);
            }
            Free::Suspend(EvmInstr::SLoad(k, cont)) => {
                let val = *state.storage.get(&k).unwrap_or(&0);
                prog = cont(val);
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op),
                _ => unreachable!(),
            },
        }
    }
}
```

## 6. Example Program

```rust
fn main() {
    let program = push(2)
        .flat_map(|_| push(3))
        .flat_map(|_| add())
        .flat_map(|_| sstore(1, 5))
        .flat_map(|_| sload(1))
        .flat_map(|val| push(val));

    let mut state = EvmState {
        stack: vec![],
        storage: HashMap::new(),
    };

    run_evm(program, &mut state);

    println!("Final stack: {:?}", state.stack);
    println!("Storage: {:?}", state.storage);
}
```

## 7. How This Maps to the Real EVM

* **`EvmInstr` enum** = EVM opcode set (syntax).
* **`Free<EvmInstr, A>`** = Abstract EVM program before compilation.
* **`run_evm`** = Interpreter (like Geth, Besu, Nethermind).
* **`EvmState`** = EVM stack, memory, and storage.
* The `FlatMap` continuations here are **exactly what the real EVM defunctionalizes** into a program counter and bytecode array.

Here is the defunctionalized mini-EVM: continuations are replaced by a program counter.

## Core idea

* Continuation in Free `FlatMap` becomes an integer `pc`.
* Program is a flat `Vec<Op>`.
* The interpreter is a loop that reads `code[pc]`, mutates state, then updates `pc`.

## Rust code

```rust
use std::collections::HashMap

#[derive(Clone, Debug)]
enum Op {
    Push(u64),
    Add,
    SStore(u64, u64),
    SLoad(u64),       // pushes value at key
    Halt,
}

#[derive(Default)]
struct VM {
    pc: usize,
    stack: Vec<u64>,
    storage: HashMap<u64, u64>,
    code: Vec<Op>,
}

impl VM {
    fn new(code: Vec<Op>) -> Self {
        VM { code, ..Default::default() }
    }

    fn step(&mut self) -> bool {
        match self.code.get(self.pc).cloned().unwrap_or(Op::Halt) {
            Op::Push(v) => {
                self.stack.push(v);
                self.pc += 1;
            }
            Op::Add => {
                let b = self.stack.pop().expect("stack underflow")
                let a = self.stack.pop().expect("stack underflow")
                self.stack.push(a + b);
                self.pc += 1;
            }
            Op::SStore(k, v) => {
                self.storage.insert(k, v);
                self.pc += 1;
            }
            Op::SLoad(k) => {
                let v = *self.storage.get(&k).unwrap_or(&0);
                self.stack.push(v);
                self.pc += 1;
            }
            Op::Halt => return false,
        }
        true
    }

    fn run(&mut self) {
        while self.step() {}
    }
}

fn main() {
    // Program: push 2; push 3; add; sstore 1,5; sload 1; halt
    let code = vec![
        Op::Push(2),
        Op::Push(3),
        Op::Add,
        Op::SStore(1, 5),
        Op::SLoad(1),
        Op::Halt,
    ]

    let mut vm = VM::new(code)
    vm.run()

    println!("Final stack: {:?}", vm.stack)
    println!("Storage: {:?}", vm.storage)
}
```

## Mapping to Free and CPS

* Free continuation `Fn(A) -> Free` is now the integer `pc`.
* `match` on `Op` is the defunctionalized apply function.
* `Vec<Op>` is the defunctionalized program - a linear bytecode.
* The loop `while self.step()` is the CPS trampoline without closures.
