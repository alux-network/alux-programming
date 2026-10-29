<!-- reader: {"title":"EVM 代数","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# EVM 代数 {#evm-algebra}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[解释器与效应](../rust-dd/interpreters.md)、[一阶程序](../rust-dd/first-order-programs.md)、[语言与编译器流水线](../rust-dd/compiler-pipelines.md)  
概念：[操作语义](../concepts/operational_semantics.md)、[自由单子](../concepts/free_monad.md)、[延续传递风格](../concepts/cps.md)、[去函数化](../concepts/defunctionalization.md)
```

<strong>以太坊虚拟机（EVM）</strong>是一种基于栈的虚拟 CPU，用于执行**以太坊字节码**，后者是以 Solidity、Vyper 或其他兼容 EVM 的语言编写的智能合约编译后的形式。

在最低层：

*   EVM 会处理**操作码**（ADD、PUSH、JUMP、SSTORE 等）。
*   Execution state includes:
    *   **栈**：后进先出的操作数数据栈。
    *   **内存**：用于临时值的瞬态字节数组。
    *   **存储**：每份合约对应的持久键值存储。
    *   **程序计数器**：指向下一条操作码。
    *   **Gas**：对执行步骤计量并收费。

## 作为解释器模式的 EVM {#evm-as-an-interpreter-pattern}

EVM 客户端是对一门指令语言的解释器：

*   **指令集** = EVM 操作码（由多个变体组成的枚举）。
*   **程序** = 一系列指令。
*   **解释器** = 每种操作码如何改变机器状态的规则。
*   **多个解释器** = EVM 规范固定，但 Geth、Nethermind、Besu 与 Erigon 是同一解释器的不同实现。

本书中的三种技术——**自由单子**、**延续传递风格**与**去函数化**——贯穿同一条主线；它们只在如何表示*程序剩余部分*上有所不同。

## 一台机器的三种编码 {#three-encodings-of-one-machine}

以下每种编码都运行同一个固定程序：

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

而且每种编码都会产生相同的观察结果：

```text
stack:   [5, 5]
storage: {1: 5}
```

它们的区别仅在于如何表示控制流——“接下来要做什么”。

<details>
<summary><strong>自由单子</strong>——程序是数据；解释器赋予它含义</summary>

指令函子会生成程序树。`and_then`是单子 bind，`run`是一种解释器——另一个解释器（编译为字节码）也可以折叠同一棵树。泛型`Free<A>`针对这套指令集专门化，因此可以在稳定版 Rust 中编译。

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
<summary><strong>延续传递风格（CPS）</strong>——每个操作码都会调用“程序剩余部分”</summary>

每个处理器完成工作后都会调用延续`k`。`sload`会将加载的值传递给一个需要该值的延续。控制流以嵌套延续的形式显式表达，完全没有程序数据结构。

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
<summary><strong>去函数化</strong>——操作调用变成由一个<code>apply</code>执行的数据</summary>

自由单子与 CPS 版本会*调用*操作（`push(2)`、`add()`、`sstore(1, 5)`、`sload(1)`）——这是一种几乎可直接读作规范说明的小型代数；去函数化则将每次调用具体化为一阶数据。随后由一个`apply`函数解释这些数据，延续也会随之折叠：“程序剩余部分”变成下一个索引（`pc`）。可以把它看作以数据形式书写的操作代数，并由`apply`这个单一解释器解释。

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

## 从延续到字节码 {#from-continuations-to-bytecode}

以下三种编码是同一计算在距机器远近不同的视角下呈现的形式：

*   **自由单子**先以*代数方式*将程序构造为数据，再对其作出解释。同一棵树可以由多个解释器折叠：一个运行它，一个漂亮打印它，一个编译它。
*   **CPS**会移除数据结构并显式表示控制流：“执行此操作码，然后调用延续。”加载的值会流向需要它的延续。
*   **去函数化**会将操作的*调用*转换为一阶数据，并由一个`apply`函数解释这些数据；延续则折叠为一个`pc`，其操作对象是`Vec<Op>`。驱动循环就是一个不使用闭包的 CPS 蹦床。

```admonish note title="类比，而非推导"
EVM 可以分析为一阶抽象机，其显式程序计数器类似于去函数化的控制表示。但这种结构类比本身无法证明 EVM 字节码是经 CPS 变换再去函数化得到的。
```

## 关键洞见 {#key-insight}

| 概念 | 自由单子世界 | EVM 实际情况 |
| --- | --- | --- |
| 指令类型 | 操作码枚举 | 固定的 EVM 操作码 |
| 程序表示 | 由`Free<A>`构造的树 | 线性字节码数组 |
| 延续 | 指令节点中的闭包 | 程序计数器（`pc`） |
| 解释器 | 对程序进行模式匹配 | 按操作码切换分支，并修改虚拟机状态 |
| 多种解释器 | 对同一程序进行不同折叠 | 多个以太坊客户端实现 |

## 与真实 EVM 的对应 {#how-this-maps-to-the-real-evm}

*   **指令集**（`Free`的变体，或`Op`枚举）对应 EVM 操作码集合。
*   **程序**（`Free`树、嵌套延续或`Vec<Op>`）表示编译前后的合约。
*   **解释器**（`run`、CPS 处理器或`apply`）是 Geth、Besu 或 Nethermind 等客户端所实现的部分。
*   **机器状态**（`stack`、`storage`）是 EVM 的栈、内存与存储。
*   真实的 EVM 字节码是去函数化后的形式：由程序计数器索引的扁平指令数组，恰如上文展示的去函数化编码。
