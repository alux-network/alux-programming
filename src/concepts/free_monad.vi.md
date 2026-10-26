<!-- reader: {"title":"Monad tự do"} -->

# Monad tự do {#free-monad}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Chương trình bậc nhất](../rust-dd/first-order-programs.md), [Bộ diễn giải và hiệu ứng](../rust-dd/interpreters.md)  
Khái niệm: [Phong cách truyền tiếp nối](cps.md), [Phi chức năng hóa](defunctionalization.md)  
Nhận định: [Đại số EVM](../insights/evm-alg.md)
```

```admonish note title="Vị trí ngữ nghĩa"
Monad tự do là cách biểu diễn cú pháp lệnh cùng phép tuần tự hóa được sinh tự do. Bộ thông dịch lệnh đã chọn một từ vựng; sau đó bộ diễn giải ánh xạ cú pháp này vào miền ngữ nghĩa. Đây là một cách mã hóa mạnh mẽ, không phải định nghĩa của Thiết kế theo ngữ nghĩa.
```

## Monad tự do là gì (phiên bản Rust) {#what-is-a-free-monad-rust-version}

**Monad tự do** cho phép bạn:

*   **Mô tả** chương trình dưới dạng *dữ liệu* — thay vì chạy ngay lập tức.
*   **Diễn giải** chương trình đó về sau theo một hoặc nhiều cách.

Hãy hình dung nó như sau:

> AST của các phép toán có hiệu ứng + `bind`/`flat_map` để nối chúng lại.

Bạn tách biệt:

*   **Cú pháp** → enum các lệnh.
*   **Cách diễn giải** → ánh xạ bảo toàn cấu trúc vào miền ngữ nghĩa đã chọn.

“Tự do” nghĩa là cấu trúc monad được sinh từ một functor `F` mà không thêm phương trình nào ngoài các định luật monad. Việc chọn `F` đã chọn cú pháp lệnh; diễn giải chương trình thu được sẽ cung cấp một ngữ nghĩa chỉ định cụ thể.

## Triển khai bằng Rust {#rust-implementation}

```admonish warning title="Cách mã hóa sơ đồ"
Rust không có tham số kiểu bậc cao trực tiếp, vì vậy cách mã hóa monad tự do dùng trong sản phẩm cần thêm cơ chế cấp kiểu hoặc một functor lệnh chuyên biệt. Đoạn mã sau minh họa hình dạng dự định; không phải triển khai tổng quát có thể dùng ngay.
```

### Kiểu monad tự do {#free-monad-type}

```rust,noplayground
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
        F: 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            Free::Suspend(op) => {
                Free::FlatMap(Box::new(Free::Suspend(op)), Box::new(f))
            }
            Free::FlatMap(inner, g) => {
                Free::FlatMap(inner, Box::new(move |x| g(x).flat_map(f.clone())))
            }
        }
    }
}
```

### DSL: các thao tác bảng điều khiển {#dsl-console-operations}

```rust,noplayground
#[derive(Clone)]
enum Console<A> {
    Print(String, A),
    ReadLine(fn(String) -> A),
}

// Smart constructors
fn print_line(s: &str) -> Free<Console<()>, ()> {
    Free::Suspend(Console::Print(s.to_string(), ()))
}

fn read_line() -> Free<Console<String>, String> {
    Free::Suspend(Console::ReadLine(|input| Free::Pure(input)))
}
```

### Bộ diễn giải {#interpreter}

```rust,noplayground
fn run_console<A>(mut prog: Free<Console<A>, A>) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(Console::Print(s, next)) => {
                println!("{}", s);
                prog = Free::Pure(next);
            }
            Free::Suspend(Console::ReadLine(f)) => {
                let mut buf = String::new();
                std::io::stdin().read_line(&mut buf).unwrap();
                prog = f(buf.trim().to_string());
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op), // minimal handling
                _ => unimplemented!(),
            },
        }
    }
}
```

### Cách dùng {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## Điểm chính {#takeaway}

*   **Cú pháp** = `enum Console` (các lệnh có thể có)
*   **Chương trình** = `Free<Console, A>` (dữ liệu mô tả các bước)
*   **Cách diễn giải cụ thể** = `run_console`
*   Lợi ích: Bạn có thể viết nhiều bộ diễn giải cho cùng một chương trình — ví dụ chạy với IO thật, ghi nhật ký vào tệp hoặc biên dịch sang ngôn ngữ khác.

## Tương quan với tiếp nối và CPS {#correlation-to-continuations-and-cps}

**Phong cách truyền tiếp nối (CPS)** là cách viết chương trình trong đó hàm không bao giờ trả giá trị trực tiếp mà truyền kết quả cho một hàm khác (*tiếp nối*) biểu thị “phần còn lại của chương trình”.

**Monad tự do** về cơ bản là một **chương trình dưới dạng chuỗi bước**, trong đó mỗi bước nói rằng:

> “Làm việc này, rồi tiếp tục với phần còn lại.”

“Phần còn lại của chương trình” đó chính là một **tiếp nối** — hàm ánh xạ kết quả hiện tại sang bước tiếp theo.

*   Trong monad tự do Rust của chúng ta:
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>` **là tiếp nối**.
    
*   Khi diễn giải monad tự do, bạn đang **chạy theo CPS**:
    
    *   Thay vì trả về giá trị trực tiếp, bạn truyền chúng vào tiếp nối kế tiếp.
    *   Kết quả là một vòng lặp gồm: `current_instruction -> feed result into continuation -> next instruction`
*   **Quan hệ CPS**:
    
    *   Monad tự do *mã hóa CPS trong một cấu trúc dữ liệu*.
    *   CPS *là cách biểu diễn luồng điều khiển lúc chạy* của cùng ý tưởng.

**Bảng đối chiếu nhanh**:

| Khái niệm | Trong CPS | Trong AST monad tự do |
| --- | --- | --- |
| Kết quả bước | Đối số cho tiếp nối | `A` trong `Fn(A) -> Free` |
| Tiếp nối | Hàm `(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| Chương trình | Tiếp nối lồng nhau | Các biến thể `FlatMap` lồng nhau |
| Thực thi | Gọi hàm | Đối sánh mẫu + gọi |

## Ánh xạ với các mẫu thiết kế GoF (Gang of Four) {#gof-gang-of-four-design-patterns-mapping}

Monad tự do **không thuộc** GoF vì chúng bắt nguồn từ lý thuyết lập trình hàm, nhưng chúng **bao hàm** hoặc **mô phỏng** một số mẫu:

| Mẫu GoF | Quan hệ với monad tự do |
| --- | --- |
| **Interpreter** | Toàn bộ cấu trúc “AST + chạy” chính là mẫu Interpreter — monad tự do chỉ cung cấp AST và bộ kết hợp miễn phí. |
| **Command** | Mỗi biến thể `enum` trong DSL là một đối tượng Command. Monad tự do nối chuỗi chúng như một macro-command. |
| **Composite** | Cấu trúc AST (các lệnh lồng nhau) là Composite của các lệnh. |
| **Builder** | Chuỗi `.flat_map` là builder dạng nối chuỗi để tạo chương trình. |
| **Visitor** | Bộ diễn giải về cơ bản là visitor duyệt tập lệnh. |

## Vì sao monad tự do vượt trội các mẫu này {#why-free-monad--these-patterns}

*   Mẫu GoF là công việc OO **thủ công** — bạn định nghĩa giao diện, lớp và cách hợp thành chúng.
    
*   Monad tự do có tính **đại số** — bạn định nghĩa *dữ liệu* cho lệnh và *hàm* để diễn giải chúng.
    
*   Bạn tự động có:
    
    *   Tuần tự hóa (`flat_map`)
    *   Phép hợp thành
    *   Nhiều bộ diễn giải mà không đụng đến logic lõi

**Bảng tóm tắt**:

| Khái niệm FP monad tự do | Mẫu GoF/OOP tương đương |
| --- | --- |
| Enum lệnh | Command |
| AST chương trình | Composite |
| Builder `flat_map` | Builder |
| Hàm diễn giải | Interpreter / Visitor |
| Nhiều bộ diễn giải | Strategy |

## Quan hệ với phi chức năng hóa {#relation-to-defunctionalization}

**Phi chức năng hóa** là phép biến đổi chương trình thay hàm bậc cao bằng cấu trúc dữ liệu bậc nhất biểu diễn các hàm có thể có, cùng một bộ diễn giải áp dụng chúng.

Trong CPS, tiếp nối là hàm bậc cao. Phi chức năng hóa chương trình CPS thay các tiếp nối đó bằng enum các trường hợp tiếp nối và một hàm `apply` để chạy chúng.

Với cách mã hóa phù hợp, có thể liên hệ monad tự do với các tiếp nối đã phi chức năng hóa bên trong chương trình chuyển đổi sang CPS:

1.  Bắt đầu bằng phiên bản CPS của chương trình. “Phần còn lại của chương trình” được mang trong các hàm tiếp nối.
2.  Phi chức năng hóa các hàm tiếp nối đó thành tập hữu hạn trường hợp trong kiểu dữ liệu.
3.  Kiểu dữ liệu bậc nhất thu được có thể mang cùng hình dạng lệnh-và-tiếp-nối như một biểu diễn monad tự do.

**Điểm tương đồng chính**

*   Cả monad tự do lẫn phi chức năng hóa đều tạo biểu diễn dữ liệu cho phép tính và cần bộ diễn giải để gán ý nghĩa cho dữ liệu đó.
*   Trường hợp `FlatMap` trong monad tự do giữ tiếp nối; phi chức năng hóa thay closure đó bằng một trường hợp trong kiểu dữ liệu.

**Khác biệt chính**

| Khía cạnh | Phi chức năng hóa | Monad tự do |
| --- | --- | --- |
| Mục đích | Kỹ thuật trình biên dịch mang tính cơ học để loại bỏ hàm bậc cao | Cấu trúc đại số để tách cú pháp khỏi ngữ nghĩa |
| Đầu vào | Bất kỳ chương trình bậc cao nào, thường ở dạng CPS | Functor F mô tả các lệnh có thể có |
| Đầu ra | Enum các trường hợp hàm cùng hàm apply | `Free<F, A>` AST cùng các bộ diễn giải |
| Monad? | Không nhất thiết | Luôn là monad do cách kiến tạo |
| Phạm vi | Phép biến đổi tổng quát | Mẫu lập trình hàm chuyên biệt |

**Tóm tắt** Phi chức năng hóa là kỹ thuật biến đổi. Monad tự do là cấu trúc đại số. Chúng có liên hệ chặt chẽ trong một số cách biểu diễn, nhưng nói chung không cách nào suy ra cách kia nếu thiếu giả định bổ sung.
