<!-- reader: {"title":"Phong cách truyền tiếp nối","sourceHash":"sha256:cf423534a1315531133363dea3ff20097731dacb0c4efc6db7e28806acf97237"} -->

# Phong cách truyền tiếp nối (CPS) {#continuation-passing-style-cps}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Chương trình bậc nhất](../rust-dd/first-order-programs.md), [Quy trình ngôn ngữ và trình biên dịch](../rust-dd/compiler-pipelines.md)  
Khái niệm: [Monad tự do](free_monad.md), [Phi chức năng hóa](defunctionalization.md)  
Nhận định: [Đại số EVM](../insights/evm-alg.md)
```

```admonish note title="Vị trí ngữ nghĩa"
CPS là cách biểu diễn và phép biến đổi chương trình làm cho điều khiển trở nên tường minh. Việc nó có bảo toàn ý nghĩa hay không phụ thuộc vào ngữ nghĩa nguồn, ngữ nghĩa đích và mối tương ứng giữa chúng đã được nêu rõ.
```

## Định nghĩa {#definition}

Phong cách truyền tiếp nối (CPS) là cách viết chương trình trong đó hàm không trả về giá trị trực tiếp. Thay vào đó, chúng truyền kết quả cho một hàm khác gọi là *tiếp nối*, biểu thị phần còn lại của chương trình.

## Động lực {#motivation}

*   Làm cho luồng điều khiển trở nên tường minh và có thể lập trình.
*   Cho phép các phép biến đổi nâng cao như IO không chặn, thoát sớm, coroutine, quay lui và lập lịch đồng thời.
*   Được dùng trong biểu diễn trung gian của trình biên dịch để đơn giản hóa tối ưu hóa và phân tích.

## Dạng cơ bản {#basic-form}

Theo phong cách trực tiếp:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

Theo CPS:

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

Ở đây, `k` là tiếp nối. Thay vì trả về `x + 1`, ta gọi `k(x + 1)`.

## Các thuộc tính chính {#key-properties}

*   Mọi lời gọi hàm đều là *lời gọi đuôi* đến các tiếp nối.
*   Phép tính hiện tại không bao giờ “trả về” bên gọi; thay vào đó, nó nhảy vào tiếp nối.
*   Luồng điều khiển trở nên tường minh trong chương trình.

## Quan hệ với hàm bậc cao {#relation-to-higher-order-functions}

*   Trong CPS, tiếp nối chỉ là các hàm bậc cao.
*   Mỗi bước tính toán nhận một tiếp nối biểu thị việc cần làm tiếp theo.

## Quan hệ với phi chức năng hóa {#relation-to-defunctionalization}

*   Trong CPS, tiếp nối là một giá trị hàm thực sự.
*   Phi chức năng hóa thay hàm tiếp nối bằng cấu trúc dữ liệu (enum) biểu diễn các bước tiếp theo có thể có, cùng một hàm `apply` để diễn giải chúng.

## Quan hệ với monad tự do {#relation-to-free-monads}

*   Cấu trúc `FlatMap` trong monad tự do chính là tiếp nối được lưu trữ.
*   Diễn giải monad tự do giống như chạy mã CPS trong đó tiếp nối là một phần của dữ liệu chương trình.
*   Các cách mã hóa monad tự do phù hợp có thể liên hệ với CPS và cách biểu diễn tiếp nối đã phi chức năng hóa.

## Ưu điểm {#advantages}

*   Biểu diễn luồng điều khiển linh hoạt.
*   Dễ lập luận hơn về thứ tự đánh giá.
*   Mạnh mẽ khi triển khai bộ diễn giải, trình gỡ lỗi, bộ tối ưu hóa và môi trường chạy bất đồng bộ.

## Nhược điểm {#disadvantages}

*   Dài dòng hơn phong cách trực tiếp.
*   Con người có thể khó đọc hơn.
*   Cần tối ưu hóa lời gọi đuôi để đạt hiệu năng trong ngôn ngữ không hỗ trợ sẵn.
