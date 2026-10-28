<!-- reader: {"title":"Đại số EVM","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# Đại số EVM {#evm-algebra}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Bộ diễn giải và hiệu ứng](../rust-dd/interpreters.md), [Chương trình bậc nhất](../rust-dd/first-order-programs.md), [Quy trình ngôn ngữ và trình biên dịch](../rust-dd/compiler-pipelines.md)  
Khái niệm: [Ngữ nghĩa vận hành](../concepts/operational_semantics.md), [Monad tự do](../concepts/free_monad.md), [Phong cách truyền tiếp nối](../concepts/cps.md), [Phi chức năng hóa](../concepts/defunctionalization.md)
```

**Máy ảo Ethereum (EVM)** là CPU ảo dựa trên ngăn xếp, thực thi **bytecode Ethereum**, tức dạng đã biên dịch của hợp đồng thông minh viết bằng Solidity, Vyper hoặc ngôn ngữ tương thích EVM khác.

Ở cấp thấp nhất:

*   EVM xử lý **opcode** (ADD, PUSH, JUMP, SSTORE, v.v.).
*   Execution state includes:
    *   **Ngăn xếp**: ngăn xếp dữ liệu LIFO cho toán hạng.
    *   **Bộ nhớ**: mảng byte tạm thời cho giá trị trung gian.
    *   **Lưu trữ**: kho khóa-giá trị bền vững cho từng hợp đồng.
    *   **Bộ đếm chương trình**: trỏ đến opcode tiếp theo.
    *   **Gas**: cơ chế đo lường tính phí cho các bước thực thi.

## EVM như mẫu bộ diễn giải {#evm-as-an-interpreter-pattern}

Máy khách EVM là bộ diễn giải trên ngôn ngữ lệnh:

*   **Tập lệnh** = các opcode EVM (enum các biến thể).
*   **Chương trình** = chuỗi lệnh.
*   **Bộ diễn giải** = quy tắc cho cách mỗi opcode thay đổi trạng thái máy.
*   **Nhiều bộ diễn giải** = đặc tả EVM cố định, nhưng Geth, Nethermind, Besu và Erigon là các cách triển khai thay thế của cùng bộ diễn giải.

Đây là mạch xuyên suốt của ba kỹ thuật trong sách — **monad tự do**, **phong cách truyền tiếp nối** và **phi chức năng hóa** — chúng chỉ khác ở cách biểu diễn *phần còn lại của chương trình*.

## Ba cách mã hóa của một máy {#three-encodings-of-one-machine}

Mỗi cách mã hóa bên dưới chạy cùng một chương trình cố định:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

và mỗi cách đều tạo ra cùng một quan sát:

```text
stack:   [5, 5]
storage: {1: 5}
```

Chúng chỉ khác cách biểu diễn điều khiển — “tiếp theo cần làm gì”.

<details>
<summary><strong>Monad tự do</strong> — chương trình là dữ liệu; bộ diễn giải gán ý nghĩa cho nó</summary>

Functor lệnh sinh ra cây chương trình. `and_then` là bind của monad, còn `run` là một bộ diễn giải — bộ thứ hai (trình biên dịch sang bytecode) có thể gấp cùng cây đó. `Free<A>` tổng quát được chuyên biệt hóa cho tập lệnh này để biên dịch được với Rust ổn định.

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
<summary><strong>Phong cách truyền tiếp nối (CPS)</strong> — mỗi opcode gọi “phần còn lại của chương trình”</summary>

Mỗi handler thực hiện công việc rồi gọi tiếp nối `k`. `sload` truyền giá trị được nạp cho tiếp nối đang đợi giá trị đó. Điều khiển tường minh dưới dạng tiếp nối lồng nhau, hoàn toàn không có cấu trúc dữ liệu chương trình.

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
<summary><strong>Đã phi chức năng hóa</strong> — lời gọi phép toán trở thành dữ liệu do một <code>apply</code> duy nhất chạy</summary>

Trong các phiên bản monad tự do và CPS, các phép toán (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) được *gọi* — một đại số nhỏ gần như đọc được như đặc tả. Phi chức năng hóa tái hóa mỗi lời gọi thành dữ liệu bậc nhất. Sau đó, một hàm `apply` diễn giải dữ liệu đó, đồng thời các tiếp nối cũng sụp lại: “phần còn lại của chương trình” trở thành chỉ mục kế tiếp (`pc`). Hãy đọc đây là đại số phép toán được viết dưới dạng dữ liệu, trong đó `apply` là bộ diễn giải duy nhất.

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

## Từ tiếp nối đến bytecode {#from-continuations-to-bytecode}

Ba cách mã hóa là cùng một phép tính được quan sát ở những khoảng cách khác nhau với máy:

*   **Monad tự do** dựng chương trình *bằng đại số* dưới dạng dữ liệu rồi diễn giải nó. Có thể gấp cùng cây đó bằng nhiều bộ diễn giải — một bộ chạy nó, một bộ in định dạng đẹp, một bộ biên dịch nó.
*   **CPS** loại bỏ cấu trúc dữ liệu và làm điều khiển tường minh: “thực hiện opcode này, rồi gọi tiếp nối”. Giá trị được nạp chảy đến tiếp nối cần nó.
*   **Phi chức năng hóa** chuyển các *lời gọi* phép toán thành dữ liệu bậc nhất, rồi đọc lại chúng bằng một `apply`; các tiếp nối cũng rút gọn thành `pc` trên một `Vec<Op>`. Vòng lặp điều khiển là một trampoline CPS không dùng closure.

```admonish note title="Phép loại suy, không phải phép suy dẫn"
Có thể phân tích EVM như máy trừu tượng bậc nhất với bộ đếm chương trình tường minh giống cách biểu diễn điều khiển đã phi chức năng hóa. Phép loại suy cấu trúc này tự nó không chứng minh bytecode EVM thu được từ phép biến đổi CPS rồi phi chức năng hóa.
```

## Nhận định chính {#key-insight}

| Khái niệm | Mô hình monad tự do | Thực tế EVM |
| --- | --- | --- |
| Kiểu lệnh | Enum opcode | Các opcode EVM cố định |
| Cách biểu diễn chương trình | Cây dựng từ `Free<A>` | Mảng bytecode tuyến tính |
| Tiếp nối | Closure trong nút lệnh | Bộ đếm chương trình (`pc`) |
| Bộ diễn giải | Đối sánh mẫu trên chương trình | Chuyển nhánh theo opcode, biến đổi trạng thái máy ảo |
| Nhiều bộ diễn giải | Các phép gấp khác nhau trên cùng chương trình | Nhiều cách triển khai máy khách Ethereum |

## Ánh xạ này vào EVM thực tế {#how-this-maps-to-the-real-evm}

*   **Tập lệnh** (các biến thể của `Free` hoặc enum `Op`) phản chiếu tập opcode EVM.
*   **Chương trình** (cây `Free`, tiếp nối lồng nhau hoặc `Vec<Op>`) là hợp đồng trước và sau khi biên dịch.
*   **Bộ diễn giải** (`run`, các handler CPS hoặc `apply`) là thứ mà máy khách như Geth, Besu hoặc Nethermind triển khai.
*   **Trạng thái máy** (`stack`, `storage`) là ngăn xếp, bộ nhớ và vùng lưu trữ của EVM.
*   Bytecode EVM thực tế là dạng đã phi chức năng hóa: mảng lệnh phẳng được đánh chỉ mục bằng bộ đếm chương trình, đúng bằng cách mã hóa đã phi chức năng hóa ở trên.
