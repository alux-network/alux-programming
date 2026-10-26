<!-- reader: {"title":"Ngữ nghĩa vận hành","sourceHash":"sha256:ac0d98925f230224cd8aee84741bb9ef24b9a477b131eafa8d0367b730ea077d"} -->

# Ngữ nghĩa vận hành {#operational-semantics}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](../denotational-design/design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Quy trình ngôn ngữ và trình biên dịch](../rust-dd/compiler-pipelines.md)  
Khái niệm: [Monad tự do](free_monad.md), [Phong cách truyền tiếp nối](cps.md), [Phi chức năng hóa](defunctionalization.md)  
Nhận định: [Từ ngữ nghĩa đến máy móc](../insights/operational_semantics.md)
```

## Định nghĩa {#definition}

**Ngữ nghĩa vận hành** mô tả hành vi chương trình bằng các phán đoán đánh giá hoặc chuyển tiếp giữa **cấu hình**. Một cấu hình có thể chứa một phần chương trình cùng môi trường, vùng lưu trữ, tiếp nối hoặc trạng thái máy trừu tượng khác.

Mô tả này có tính toán học: nó nêu những phép đánh giá hoặc chuyển tiếp nào là hợp lệ. Bộ diễn giải hoặc máy ảo có thể triển khai các quy tắc đó, nhưng bản thân cách triển khai cụ thể không phải định nghĩa.

```admonish note title="Vị trí ngữ nghĩa"
Ngữ nghĩa vận hành là ngữ nghĩa chính xác, không chỉ là chi tiết triển khai không chính thức. Nó giải thích hành vi bằng quy tắc đánh giá hoặc chuyển tiếp. [Thiết kế theo ngữ nghĩa](../denotational-design/design.md) đặt ra câu hỏi thiết kế bổ trợ, có trước: các ý nghĩa hợp thành và phương trình nào cần được những quy tắc đó bảo toàn?
```

## Các phong cách ngữ nghĩa vận hành {#styles-of-operational-semantics}

### Bước nhỏ (ngữ nghĩa vận hành cấu trúc) {#small-step-structural-operational-semantics}

Tính toán được chia thành các chuyển tiếp nguyên tử:

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

Hữu ích để mô hình hóa tính đồng thời, đan xen và thực thi từng phần.

### Bước lớn (ngữ nghĩa tự nhiên) {#big-step-natural-semantics}

Mô tả việc đánh giá theo kết quả cuối cùng:

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

Thường rõ ràng hơn khi lập luận về các chương trình kết thúc.

## Quy tắc hình thức {#formal-rules}

Ngữ nghĩa vận hành thường được đưa ra bằng **quy tắc suy diễn**. Với một ngôn ngữ số học đơn giản:

$$ E ::= n \mid E + E $$

Với đánh giá từ trái sang phải, cần ba quy tắc:

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

Hai quy tắc đầu chọn biểu thức con có thể rút gọn tiếp theo. Quy tắc thứ ba thực hiện phép cộng khi cả hai toán hạng đã là giá trị.

Vết đánh giá:

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## Vì sao điều này quan trọng {#why-it-matters}

*   Cung cấp một **mô hình thực thi chính xác, gần với máy**.
*   Nền tảng cho bộ diễn giải và máy ảo.
*   Hỗ trợ lập luận về tính đúng đắn, mức dùng tài nguyên và an toàn.

## Quan hệ với các khái niệm khác {#relation-to-other-concepts}

*   **Monad tự do** cung cấp cú pháp lệnh và phép tuần tự hóa. Các quy tắc vận hành có thể mô tả cách chương trình trong biểu diễn đó được đánh giá.
*   **CPS** làm phần còn lại của phép tính trở nên tường minh dưới dạng tiếp nối. Các quy tắc vận hành có thể mô tả cách giá trị được truyền cho các tiếp nối ấy.
*   **Phi chức năng hóa** thay một họ hàm đã biết bằng dữ liệu bậc nhất và một phép toán `apply`. Các quy tắc vận hành có thể mô tả những trạng thái máy tường minh thu được.

Đây là các đối tượng và phép biến đổi có thể được gán ngữ nghĩa vận hành. Bản thân chúng không phải ngữ nghĩa vận hành.

## Trong thực tế {#in-practice}

Quy tắc vận hành có thể hướng dẫn bộ diễn giải và cung cấp mô hình chính xác để kiểm tra nó:

*   **EVM** có thể được mô hình hóa tự nhiên như hệ chuyển trạng thái bước nhỏ, trong khi toàn bộ lần thực thi kết thúc cũng có thể được liên hệ bằng phán đoán bước lớn.
*   Các quy tắc bước nhỏ thường tương ứng chặt chẽ với các nhánh `match` trong bộ diễn giải Rust.

$$ n_1 + n_2 \to n_3 $$

Quan hệ trái sang phải đầy đủ ở trên có thể được biểu diễn bằng mã Rust:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

Hàm này thực hiện một chuyển tiếp. Áp dụng lặp lại sẽ tạo ra vết hiển thị; trả về `None` nghĩa là biểu thức đã là một giá trị.

## Câu hỏi vận hành và ngữ nghĩa chỉ định {#operational-and-denotational-questions}

Các quy tắc vận hành có thể chứng minh tính an toàn, tiến triển, giới hạn tài nguyên và sự tương ứng với cách triển khai. Giới hạn xuất hiện khi chọn cơ chế vận hành trước ý nghĩa trừu tượng dự định: lựa chọn triển khai có thể vô tình trở thành cam kết ngữ nghĩa.

Thiết kế theo ngữ nghĩa không bác bỏ ngữ nghĩa vận hành. Nó yêu cầu ta phát biểu trước miền ngữ nghĩa, phép hợp thành và các định luật, rồi liên hệ mô hình vận hành với chúng.

| Góc nhìn | Câu hỏi |
| --- | --- |
| Ngữ nghĩa chỉ định | Toàn bộ chương trình có ý nghĩa gì? |
| Vận hành | Chương trình được đánh giá qua những chuyển tiếp nào? |
| Tính đúng đắn | Các chuyển tiếp đó có bảo toàn ý nghĩa dự định không? |

Các đoạn phim sau gợi mở nguy cơ khi xem mô tả vận hành là nguồn hiểu biết duy nhất.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Mô tả vận hành không phải toàn bộ ý nghĩa (1/2)</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Mô tả vận hành không phải toàn bộ ý nghĩa (2/2)</figcaption></figure>
