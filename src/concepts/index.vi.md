<!-- reader: {"title":"Giới thiệu","sourceHash":"sha256:aea0854cd288084035720b57d882094019b47b9cb967dc1c0115a6acb9d122a3"} -->

# Giới thiệu phần Khái niệm {#concepts-introduction}

![Concepts — the programming machinery](/concepts.png)

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Vì sao ý nghĩa được đặt lên trước](../denotational-design/semantic-view.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md)  
Nhận định: [Giới thiệu](../insights/index.md)
```

Các chương trong phần này giải thích những cơ chế lập trình và công cụ lý thuyết quan trọng:

*   ngữ nghĩa vận hành mô tả quy tắc thực thi
*   CPS làm cho phần tiếp nối điều khiển trở nên tường minh
*   phi chức năng hóa chuyển hành vi bậc cao đã biết thành dữ liệu bậc nhất
*   monad tự do biểu diễn cú pháp hiệu ứng kèm thứ tự hóa
*   các cách mã hóa bài toán biểu thức quản lý khả năng mở rộng
*   tính minh bạch tham chiếu hỗ trợ phép thế
*   tính hội tụ, vết thực thi và mô phỏng song hành so sánh các dạng hành vi

Thiết kế theo ngữ nghĩa không thay thế các khái niệm này. Nó đặt chúng vào đúng vị trí.

```admonish quote title="Cơ chế và ý nghĩa"
[Các khái niệm](index.md) và [nhận định](../insights/index.md) giải thích những cơ chế lập trình hữu ích. [Thiết kế theo ngữ nghĩa](../denotational-design/design.md) giải thích cách xác định cơ chế cần bảo toàn điều gì.
```

Khi đọc mỗi chương, hãy đặt ba câu hỏi:

1.  Khái niệm này mô tả ý nghĩa, biểu diễn, thực thi hay phép biến đổi giữa chúng?
2.  Nó bảo toàn những quan sát và đẳng thức nào?
3.  Đây là đặc tả, một cách mã hóa đặc tả hay một bộ diễn giải?

Một số chương được viết trước khi sách áp dụng tiến trình ngữ nghĩa tường minh này. Ví dụ trong đó chủ ý nhấn mạnh vận hành. Các liên kết theo ngữ cảnh và chương Nhận định kết nối chúng trở lại góc nhìn ngữ nghĩa.
