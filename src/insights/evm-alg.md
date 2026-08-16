# EVM algebra

```admonish tip title="Related"
Design by Meaning in Rust: [Interpreters and effects](../rust-dd/interpreters.md), [First-order programs](../rust-dd/first-order-programs.md), [Language and compiler pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Operational semantics](../concepts/operational_semantics.md), [Free monad](../concepts/free_monad.md), [Continuation-passing style](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)
```

The **Ethereum Virtual Machine (EVM)** is a stack-based virtual CPU that executes **Ethereum bytecode**, the compiled form of smart contracts written in Solidity, Vyper, or another EVM-compatible language.

At the lowest level:

* The EVM processes **opcodes** (ADD, PUSH, JUMP, SSTORE, etc.).
* Execution state includes:
  * **Stack**: LIFO data stack for operands.
  * **Memory**: transient byte array for temporary values.
  * **Storage**: persistent key-value store for each contract.
  * **Program counter**: points to the next opcode.
  * **Gas**: metering that charges for execution steps.

## EVM as an interpreter pattern

An EVM client is an interpreter over an instruction language:

* **Instruction set** = EVM opcodes (an enum of variants).
* **Program** = a sequence of instructions.
* **Interpreter** = the rule for how each opcode changes machine state.
* **Multiple interpreters** = the EVM spec is fixed, but Geth, Nethermind, Besu, and Erigon are alternative implementations of the same interpreter.

This is the through-line of three techniques in this book — **free monads**, **continuation-passing style**, and **defunctionalization** — which differ only in how they represent *the rest of the program*.

## Three encodings of one machine

Each encoding below runs the same fixed program:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

and every one produces the same observation:

```text
stack:   [5, 5]
storage: {1: 5}
```

They differ only in how control — "what to do next" — is represented.

<details>
<summary><strong>Free monad</strong> — the program is data; an interpreter gives it meaning</summary>

The instruction functor generates a program tree. `and_then` is monadic bind, and `run` is one interpreter — a second interpreter (a compiler to bytecode) could fold the same tree. The generic `Free<A>` is specialized to this instruction set so it compiles in stable Rust.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// The free monad over the EVM instruction set: a program is data — a tree of
// instructions ending in `Pure`, each carrying its continuation.
enum Free<A> {
    Pure(A),
    Push(u64, Box<Free<A>>),
    Add(Box<Free<A>>),
    SStore(u64, u64, Box<Free<A>>),
    SLoad(u64, Box<dyn FnOnce(u64) -> Free<A>>),
}

impl<A: 'static> Free<A> {
    // Monadic bind: graft `k` onto every leaf of the program.
    fn and_then<B: 'static>(self, k: impl FnOnce(A) -> Free<B> + 'static) -> Free<B> {
        match self {
            Free::Pure(a) => k(a),
            Free::Push(v, next) => Free::Push(v, Box::new(next.and_then(k))),
            Free::Add(next) => Free::Add(Box::new(next.and_then(k))),
            Free::SStore(x, y, next) => Free::SStore(x, y, Box::new(next.and_then(k))),
            Free::SLoad(key, cont) => Free::SLoad(key, Box::new(move |v| cont(v).and_then(k))),
        }
    }
}

fn push(v: u64) -> Free<()> { Free::Push(v, Box::new(Free::Pure(()))) }
fn add() -> Free<()> { Free::Add(Box::new(Free::Pure(()))) }
fn sstore(k: u64, v: u64) -> Free<()> { Free::SStore(k, v, Box::new(Free::Pure(()))) }
fn sload(k: u64) -> Free<u64> { Free::SLoad(k, Box::new(|v| Free::Pure(v))) }

// Interpreter: give the program data meaning against the machine state.
fn run(mut prog: Free<()>, st: &mut State) {
    loop {
        prog = match prog {
            Free::Pure(()) => return,
            Free::Push(v, next) => { st.stack.push(v); *next }
            Free::Add(next) => {
                let b = st.stack.pop().unwrap();
                let a = st.stack.pop().unwrap();
                st.stack.push(a + b);
                *next
            }
            Free::SStore(k, v, next) => { st.storage.insert(k, v); *next }
            Free::SLoad(k, cont) => { let v = *st.storage.get(&k).unwrap_or(&0); cont(v) }
        };
    }
}

fn main() {
    let program = push(2)
        .and_then(|_| push(3))
        .and_then(|_| add())
        .and_then(|_| sstore(1, 5))
        .and_then(|_| sload(1))
        .and_then(|v| push(v));

    let mut st = State { stack: vec![], storage: HashMap::new() };
    run(program, &mut st);
    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

<details>
<summary><strong>Continuation-passing style (CPS)</strong> — each opcode calls "the rest of the program"</summary>

Every handler does its work and then invokes the continuation `k`. `sload` passes the loaded value to a continuation that expects it. Control is explicit as nested continuations, with no program data structure at all.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// Each opcode does its work, then calls the continuation `k` = "the rest of
// the program". `sload` passes the loaded value on to its continuation.
fn push(st: &mut State, v: u64, k: impl FnOnce(&mut State)) {
    st.stack.push(v);
    k(st);
}
fn add(st: &mut State, k: impl FnOnce(&mut State)) {
    let b = st.stack.pop().unwrap();
    let a = st.stack.pop().unwrap();
    st.stack.push(a + b);
    k(st);
}
fn sstore(st: &mut State, key: u64, val: u64, k: impl FnOnce(&mut State)) {
    st.storage.insert(key, val);
    k(st);
}
fn sload(st: &mut State, key: u64, k: impl FnOnce(&mut State, u64)) {
    let v = *st.storage.get(&key).unwrap_or(&0);
    k(st, v);
}

fn main() {
    let mut st = State { stack: vec![], storage: HashMap::new() };

    push(&mut st, 2, |st| {
        push(st, 3, |st| {
            add(st, |st| {
                sstore(st, 1, 5, |st| {
                    sload(st, 1, |st, v| {
                        push(st, v, |_st| {});
                    });
                });
            });
        });
    });

    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

<details>
<summary><strong>Defunctionalized</strong> — the operation calls become data run by one <code>apply</code></summary>

Where the free monad and CPS versions *call* the operations (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) — a small algebra that reads almost like a specification — defunctionalization reifies each call as first-order data. One `apply` function then interprets that data, and the continuations collapse too: "the rest of the program" becomes the next index (`pc`). Read it as the operation algebra written as data, with `apply` its single interpreter.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// The EVM algebra reified: where the other encodings CALL `push(2)`, `add()`,
// `sstore(1, 5)`, `sload(1)`, each such call becomes a first-order value — a
// tag with its arguments.
enum Op {
    Push(u64),
    Add,
    SStore(u64, u64),
    SLoad(u64),
}

// `apply` is the single interpreter for the reified operations: it gives each
// tag its meaning against the machine state.
fn apply(op: &Op, st: &mut State) {
    match op {
        Op::Push(v) => st.stack.push(*v),
        Op::Add => {
            let b = st.stack.pop().unwrap();
            let a = st.stack.pop().unwrap();
            st.stack.push(a + b);
        }
        Op::SStore(k, v) => { st.storage.insert(*k, *v); }
        Op::SLoad(k) => {
            let v = *st.storage.get(k).unwrap_or(&0);
            st.stack.push(v);
        }
    }
}

fn main() {
    // The program is now data: a flat list of reified operation calls.
    let code = vec![
        Op::Push(2),
        Op::Push(3),
        Op::Add,
        Op::SStore(1, 5),
        Op::SLoad(1),
    ];

    // `pc` is the defunctionalized continuation: "the rest of the program" is
    // just the next index.
    let mut st = State { stack: vec![], storage: HashMap::new() };
    let mut pc = 0;
    while pc < code.len() {
        apply(&code[pc], &mut st);
        pc += 1;
    }

    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

## From continuations to bytecode

The three encodings are the same computation seen at different distances from the machine:

* **Free monad** builds the program *algebraically* as data, then interprets it. The same tree could be folded by several interpreters — one that runs it, one that pretty-prints it, one that compiles it.
* **CPS** removes the data structure and makes control explicit: "do this opcode, then call the continuation." The loaded value flows to the continuation that needs it.
* **Defunctionalization** turns the operation *calls* into first-order data and reads them back with one `apply`, while the continuations collapse into a `pc` over a `Vec<Op>`. The driver loop is a CPS trampoline without closures.

```admonish note title="Analogy, not derivation"
The EVM can be analyzed as a first-order abstract machine whose explicit program counter resembles a defunctionalized control representation. This structural analogy does not by itself prove that EVM bytecode was obtained by a CPS transformation followed by defunctionalization.
```

## Key insight

| Concept                | Free monad world                    | EVM reality                              |
| ---------------------- | ----------------------------------- | ---------------------------------------- |
| Instruction type       | Enum of opcodes                     | Fixed EVM opcodes                        |
| Program representation | Tree built from `Free<A>`           | Linear bytecode array                    |
| Continuation           | Closure in the instruction node     | Program counter (`pc`)                   |
| Interpreter            | Pattern match on the program        | Switch on opcode, mutate VM state        |
| Multiple interpreters  | Different folds of the same program | Multiple Ethereum client implementations |

## How this maps to the real EVM

* The **instruction set** (`Free`'s variants, or the `Op` enum) mirrors the EVM opcode set.
* The **program** (a `Free` tree, nested continuations, or a `Vec<Op>`) is the contract before and after compilation.
* The **interpreter** (`run`, the CPS handlers, or `apply`) is what a client such as Geth, Besu, or Nethermind implements.
* The **machine state** (`stack`, `storage`) is the EVM's stack, memory, and storage.
* Real EVM bytecode is the defunctionalized form: a flat instruction array indexed by a program counter, exactly the defunctionalized encoding above.
