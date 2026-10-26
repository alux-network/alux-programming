<!-- reader: {"title":"Phi chức năng hóa"} -->

# Phi chức năng hóa {#defunctionalization}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Chương trình bậc nhất](../rust-dd/first-order-programs.md), [Quy trình ngôn ngữ và trình biên dịch](../rust-dd/compiler-pipelines.md)  
Khái niệm: [Monad tự do](free_monad.md), [Phong cách truyền tiếp nối](cps.md)  
Nhận định: [Đại số EVM](../insights/evm-alg.md)
```

```admonish note title="Vị trí ngữ nghĩa"
Phi chức năng hóa thay đổi cách biểu diễn trong khi hướng tới bảo toàn hành vi ứng dụng. Trong thiết kế lấy ý nghĩa làm trọng tâm, các giá trị bậc nhất được tạo sinh hữu ích khi một bộ diễn giải khác cần kiểm tra hoặc hợp thành phép toán trước khi thực thi.
```

## Định nghĩa {#definition}

Phi chức năng hóa là phép biến đổi chương trình thay các hàm bậc cao bằng cấu trúc dữ liệu bậc nhất biểu diễn các hàm có thể có, cùng một hàm diễn giải để áp dụng chúng.

## Động lực {#motivation}

Một số ngôn ngữ, trình biên dịch hoặc môi trường chạy không thể xử lý hàm bậc cao hiệu quả, thậm chí không thể xử lý. Phi chức năng hóa khiến chương trình hoàn toàn bậc nhất, nhờ đó dễ biên dịch, phân tích, tuần tự hóa hoặc chạy trong môi trường hạn chế.

## Quy trình {#the-process}

1.  Xác định mọi hàm bậc cao có thể được tạo ra và truyền đi.
2.  Gán cho mỗi hàm một thẻ duy nhất trong enum hoặc kiểu tổng, cùng mọi dữ liệu mà nó cần để hoạt động.
3.  Thay các giá trị hàm bằng những thẻ này.
4.  Định nghĩa hàm `apply` nhận một thẻ cùng các đối số hàm, sau đó đối sánh mẫu theo thẻ để chạy mã phù hợp.

## Ví dụ trong Rust {#example-in-rust}

Trước: dùng closure

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

Sau: dạng đã phi chức năng hóa

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## Thuộc tính {#properties}

*   Giờ mọi hàm đều được biểu diễn bằng dữ liệu đơn giản.
*   Chương trình trở thành hoàn toàn bậc nhất.
*   Hàm `apply` thay cho các lời gọi hàm trực tiếp.

## Ứng dụng {#applications}

*   Đơn giản hóa backend trình biên dịch: nhiều trình biên dịch tạo mã CPS rồi phi chức năng hóa mã đó.
*   Tuần tự hóa hàm: có thể gửi thẻ enum qua mạng hoặc lưu trong tệp.
*   Phân tích tĩnh: mã bậc nhất dễ lập luận hơn.
*   Suy ra bộ diễn giải: phi chức năng hóa tự nhiên dẫn đến mẫu bộ diễn giải.

## Quan hệ với CPS {#relation-to-cps}

Trong CPS (phong cách truyền tiếp nối), tiếp nối là hàm bậc cao. Phi chức năng hóa mã CPS chuyển các tiếp nối này thành tập trường hợp hữu hạn trong enum cùng hàm apply.

## Quan hệ với monad tự do {#relation-to-free-monads}

Các biểu diễn monad tự do phù hợp có thể liên hệ với tiếp nối đã phi chức năng hóa trong chương trình được chuyển đổi sang CPS. Đây là mối liên hệ chặt chẽ, không phải sự đồng nhất phổ quát giữa hai cấu trúc.

## Phép áp dụng ở cấp kiểu {#type-level-application}

Phi chức năng hóa cũng có thể mã hóa phép áp dụng ở cấp kiểu trong các ngôn ngữ không có kiểu bậc cao nguyên thủy. Thử nghiệm [đại số đối tượng C#](https://github.com/tgrospic/object-algebras) áp dụng cách mã hóa nhẹ này thông qua `App<F, a>` để biểu đạt các đại số functor, applicative, monad và hiệu ứng.

## Tài liệu tham khảo {#references}

*   Reynolds, J. C. (1972). *Definitional Interpreters for Higher-Order Programming Languages*.  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J. và White, L. (2014). *Lightweight Higher-Kinded Polymorphism* (dùng phi chức năng hóa để mã hóa ứng dụng cấp kiểu).  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
