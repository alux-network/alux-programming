<!-- reader: {"title":"EVM代数"} -->

# EVM代数 {#evm-algebra}

```admonish tip title="関連項目"
Rustで意味から設計する：[インタープリターと副作用](../rust-dd/interpreters.md)、[一階プログラム](../rust-dd/first-order-programs.md)、[言語とコンパイラーパイプライン](../rust-dd/compiler-pipelines.md)  
概念：[操作的意味論](../concepts/operational_semantics.md)、[自由モナド](../concepts/free_monad.md)、[継続渡し形式](../concepts/cps.md)、[関数のデファンクショナライズ](../concepts/defunctionalization.md)
```

<strong>Ethereum Virtual Machine（EVM）</strong>は、**Ethereumバイトコード**を実行するスタックベースの仮想CPUです。このバイトコードはSolidity、Vyper、その他のEVM互換言語で書かれたスマートコントラクトのコンパイル結果です。

最も低いレベルでは：

*   EVMは**オペコード**（ADD、PUSH、JUMP、SSTOREなど）を処理する。
*   Execution state includes:
    *   **スタック**：オペランド用の後入れ先出しデータスタック。
    *   **メモリー**：一時的な値を格納するバイト配列。
    *   **ストレージ**：コントラクトごとに用意される永続的なキー・バリューストア。
    *   **プログラムカウンター**：次のオペコードを指す。
    *   **Gas**：実行ステップに課金する計量機構。

## インタープリターパターンとしてのEVM {#evm-as-an-interpreter-pattern}

EVMクライアントは命令言語のインタープリターです。

*   **命令セット**＝EVMオペコード（バリアントの列挙型）。
*   **プログラム**＝命令の列。
*   **インタープリター**＝各オペコードによって機械状態がどう変わるかを定める規則。
*   **複数のインタープリター**＝EVMの仕様は固定されており、Geth、Nethermind、Besu、Erigonは同じインタープリターの代替実装である。

本書で扱う三つの技法、**自由モナド**、**継続渡し形式**、**デファンクショナライズ**を結ぶ筋道は、*プログラムの残り*をどう表すかの違いです。

## 一つの機械を表す三つの符号化 {#three-encodings-of-one-machine}

以下の各符号化は、同じ固定プログラムを実行します。

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

どの形式でも同じ観測結果になります。

```text
stack:   [5, 5]
storage: {1: 5}
```

違うのは、制御、つまり「次に何をするか」の表現方法だけです。

<details>
<summary><strong>自由モナド</strong> — プログラムをデータとして表し、インタープリターが意味を与える</summary>

命令ファンクターがプログラム木を生成します。`and_then`はモナド的bindで、`run`は一つのインタープリターです（バイトコードへのコンパイラーなど、二つ目のインタープリターでも同じ木をfoldできます）。ジェネリックな`Free<A>`は、この命令セットに特化することで安定版Rustでもコンパイルできます。

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
<summary><strong>継続渡し形式（CPS）</strong> — 各オペコードが「プログラムの残り」を呼び出す</summary>

各ハンドラーは処理を行い、その後継続`k`を呼び出します。`sload`では、読み込んだ値をそれを受け取る継続に渡します。制御はネストされた継続として明示され、プログラムのデータ構造はありません。

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
<summary><strong>デファンクショナライズ</strong> — 操作の呼び出しをデータに変え、一つの<code>apply</code>で実行する</summary>

自由モナド版とCPS版は、仕様のように読める小さな代数である操作（`push(2)`、`add()`、`sstore(1, 5)`、`sload(1)`）を*呼び出します*。デファンクショナライズでは、各呼び出しを一階データとして再構化します。一つの`apply`関数でそのデータを解釈し、継続もまとめます。「プログラムの残り」は次のインデックス（`pc`）になります。操作の代数をデータとして記述し、`apply`一つのインタープリターで解釈すると考えてください。

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

## 継続からバイトコードへ {#from-continuations-to-bytecode}

三つの符号化は、機械との距離の異なる場所から同じ計算を見たものです。

*   **自由モナド**では、プログラムを*代数的に*データとして構築し、その後で解釈します。同じ木を複数のインタープリターでfoldできます。実行用、整形表示用、コンパイル用などを用意できます。
*   **CPS**ではデータ構造を取り除き、制御を明示します。「このオペコードを実行し、その後に継続を呼び出す」。読み込んだ値は、それを必要とする継続へ流れます。
*   **デファンクショナライズ**では、操作の*呼び出し*を一階データにし、一つの`apply`で読み戻します。同時に継続は、`Vec<Op>`上の`pc`へと縮約されます。ドライブループはクロージャのないCPSトランポリンです。

```admonish note title="類推であり、導出ではない"
EVMは、明示的なプログラムカウンターを持つ一階抽象機械として分析できます。その構造はデファンクショナライズされた制御表現に似ています。しかしこの類似だけでは、EVMバイトコードがCPS変換の後にデファンクショナライズして得られた証明にはなりません。
```

## 主な洞察 {#key-insight}

| 概念 | 自由モナドの世界 | EVMの実際 |
| --- | --- | --- |
| 命令型 | オペコードの列挙型 | 固定されたEVMオペコード |
| プログラム表現 | `Free<A>`から構築される木 | 線形のバイトコード配列 |
| 継続 | 命令ノードのクロージャ | プログラムカウンター（`pc`） |
| インタープリター | プログラムに対するパターンマッチ | オペコードのswitchとVM状態の変更 |
| 複数のインタープリター | 同じプログラムの異なるfold | 複数のEthereumクライアント実装 |

## 実際のEVMとの対応 {#how-this-maps-to-the-real-evm}

*   **命令セット**（`Free`のバリアント、または`Op`列挙型）はEVMオペコード集合に対応します。
*   **プログラム**（`Free`木、ネストされた継続、または`Vec<Op>`）はコンパイル前後のコントラクトを表します。
*   **インタープリター**（`run`、CPSハンドラー、または`apply`）は、Geth、Besu、Nethermindなどのクライアントが実装するものです。
*   **機械状態**（`stack`、`storage`）はEVMのスタック、メモリー、ストレージです。
*   実際のEVMバイトコードはデファンクショナライズされた形式です。上記のデファンクショナライズ符号化と同じく、プログラムカウンターでインデックス付けされた平坦な命令配列です。
