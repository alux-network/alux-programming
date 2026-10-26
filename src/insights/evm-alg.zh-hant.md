<!-- reader: {"title":"EVM 代數"} -->

# EVM 代數 {#evm-algebra}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[直譯器與效應](../rust-dd/interpreters.md)、[一階程式](../rust-dd/first-order-programs.md)、[語言與編譯器流水線](../rust-dd/compiler-pipelines.md)  
概念：[操作語義](../concepts/operational_semantics.md)、[自由單子](../concepts/free_monad.md)、[延續傳遞風格](../concepts/cps.md)、[去函式化](../concepts/defunctionalization.md)
```

<strong>以太坊虛擬機器（EVM）</strong>是一種基於棧的虛擬 CPU，用於執行**以太坊位元組碼**，後者是以 Solidity、Vyper 或其他相容 EVM 的語言編寫的智慧合約編譯後的形式。

在最低層：

*   EVM 會處理**操作碼**（ADD、PUSH、JUMP、SSTORE 等）。
*   Execution state includes:
    *   **棧**：後進先出的運算元資料棧。
    *   **記憶體**：用於臨時值的瞬態位元組陣列。
    *   **儲存**：每份合約對應的持久鍵值儲存。
    *   **程式計數器**：指向下一條操作碼。
    *   **Gas**：對執行步驟計量並收費。

## 作為直譯器模式的 EVM {#evm-as-an-interpreter-pattern}

EVM 客戶端是對一門指令語言的直譯器：

*   **指令集** = EVM 操作碼（由多個變體組成的列舉）。
*   **程式** = 一系列指令。
*   **直譯器** = 每種操作碼如何改變機器狀態的規則。
*   **多個直譯器** = EVM 規範固定，但 Geth、Nethermind、Besu 與 Erigon 是同一直譯器的不同實作。

本書中的三種技術——**自由單子**、**延續傳遞風格**與**去函式化**——貫穿同一條主線；它們只在如何表示*程式剩餘部分*上有所不同。

## 一臺機器的三種編碼 {#three-encodings-of-one-machine}

以下每種編碼都執行同一個固定程式：

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

而且每種編碼都會產生相同的觀察結果：

```text
stack:   [5, 5]
storage: {1: 5}
```

它們的區別僅在於如何表示控制流——“接下來要做什麼”。

<details>
<summary><strong>自由單子</strong>——程式是資料；直譯器賦予它含義</summary>

指令函子會生成程式樹。`and_then`是單子 bind，`run`是一種直譯器——另一個直譯器（編譯為位元組碼）也可以摺疊同一棵樹。泛型`Free<A>`針對這套指令集專門化，因此可以在穩定版 Rust 中編譯。

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
<summary><strong>延續傳遞風格（CPS）</strong>——每個操作碼都會呼叫“程式剩餘部分”</summary>

每個處理器完成工作後都會呼叫延續`k`。`sload`會將載入的值傳遞給一個需要該值的延續。控制流以巢狀延續的形式顯式表達，完全沒有程式資料結構。

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
<summary><strong>去函式化</strong>——操作呼叫變成由一個<code>apply</code>執行的資料</summary>

自由單子與 CPS 版本會*呼叫*操作（`push(2)`、`add()`、`sstore(1, 5)`、`sload(1)`）——這是一種幾乎可直接讀作規範說明的小型代數；去函式化則將每次呼叫具體化為一階資料。接著由一個`apply`函式解釋這些資料，延續也會隨之摺疊：「程式剩餘部分」變成下一個索引（`pc`）。可以把它看作以資料形式書寫的操作代數，並由`apply`這個單一直譯器解釋。

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

## 從延續到位元組碼 {#from-continuations-to-bytecode}

以下三種編碼呈現的是同一計算，只是各自與機器的距離不同：

*   **自由單子**先以*代數方式*將程式構造為資料，再對其作出解釋。同一棵樹可以由多個直譯器摺疊：一個執行它，一個漂亮列印它，一個編譯它。
*   **CPS**會移除資料結構並顯式表示控制流：“執行此操作碼，然後呼叫延續。”載入的值會流向需要它的延續。
*   **去函式化**會將操作的*呼叫*轉換為一階資料，並由一個`apply`函式解釋這些資料；延續則摺疊為一個`pc`，其操作對象是`Vec<Op>`。驅動迴圈就是一個不使用閉包的 CPS 蹦床。

```admonish note title="類比，而非推導"
EVM 可以分析為一階抽象機，其顯式程式計數器類似於去函式化的控制表示。但這種結構類比本身無法證明 EVM 位元組碼是經 CPS 變換再去函式化得到的。
```

## 關鍵洞見 {#key-insight}

| 概念 | 自由單子世界 | EVM 實際情況 |
| --- | --- | --- |
| 指令型別 | 操作碼列舉 | 固定的 EVM 操作碼 |
| 程式表示 | 由`Free<A>`構造的樹 | 線性位元組碼陣列 |
| 延續 | 指令節點中的閉包 | 程式計數器（`pc`） |
| 直譯器 | 對程式進行模式匹配 | 按操作碼切換分支，並修改虛擬機器狀態 |
| 多種直譯器 | 對同一程式進行不同摺疊 | 多個以太坊客戶端實作 |

## 與真實 EVM 的對應 {#how-this-maps-to-the-real-evm}

*   **指令集**（`Free`的變體，或`Op`列舉）對應 EVM 操作碼集合。
*   **程式**（`Free`樹、巢狀延續或`Vec<Op>`）表示編譯前後的合約。
*   **直譯器**（`run`、CPS 處理器或`apply`）是 Geth、Besu 或 Nethermind 等客戶端所實作的部分。
*   **機器狀態**（`stack`、`storage`）是 EVM 的棧、記憶體與儲存。
*   真實的 EVM 位元組碼是去函式化後的形式：由程式計數器索引的扁平指令陣列，恰如上文展示的去函式化編碼。
