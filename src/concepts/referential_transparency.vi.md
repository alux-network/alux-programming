<!-- reader: {"title":"Tính minh bạch tham chiếu","sourceHash":"sha256:cf7ad00c5e2f7e6e1da3d3f18d03b6ec9ec16d836e412d29a99f0fa801064234"} -->

# Tính minh bạch tham chiếu {#referential-transparency}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Ngữ nghĩa và tính hợp thành](../denotational-design/denotations.md), [Định luật và cách diễn giải](../denotational-design/laws-and-interpretations.md)  
Nhận định: [Tính minh bạch tham chiếu trở lại](../insights/referential-transparency.md)
```

```admonish note title="Vị trí ngữ nghĩa"
Tính minh bạch tham chiếu phụ thuộc vào ngữ nghĩa chỉ định và đẳng thức đã chọn. Nó cho phép phép thế khi thay biểu thức bằng ngữ nghĩa chỉ định của nó vẫn bảo toàn ý nghĩa được đặc tả, ngay cả khi cách triển khai khác nhau về vận hành phía sau ranh giới ngữ nghĩa.
```

Tính minh bạch tham chiếu (RT) là thuộc tính thế của biểu thức: có thể thay biểu thức bằng ngữ nghĩa chỉ định của nó mà không làm đổi ý nghĩa chương trình.

Ngày nay, RT được dùng trong thực tế làm nền tảng cho lập luận phương trình, tái cấu trúc an toàn và thiết kế API dựa trên định luật.

## Ý nghĩa cốt lõi {#core-meaning}

RT phát biểu:

*   nếu `e` biểu thị `v`
*   thì dùng `v` thay cho `e` sẽ bảo toàn ý nghĩa

Đây là khẳng định ngữ nghĩa, không phải khẩu hiệu về phong cách viết mã.

### Tính thuần {#purity}

Hàm thuần trả về cùng đầu ra với cùng đầu vào và không có hiệu ứng phụ quan sát được. RT là định luật thế cho biểu thức: thay biểu thức bằng ngữ nghĩa chỉ định phải bảo toàn ý nghĩa. Vì vậy, tính thuần là một cách phổ biến để có RT trong thực tế, còn RT là tiêu chí ngữ nghĩa rộng hơn. Xem [Tính minh bạch tham chiếu trở lại](../insights/referential-transparency.md) để biết phân biệt giữa tính thuần và RT theo DD.

## Bối cảnh lịch sử {#historical-context}

Trong ngữ nghĩa ngôn ngữ lập trình, RT gắn chặt với cách đặt vấn đề của Christopher Strachey. Cách ông trình bày phân biệt lập luận về giá trị với hành vi nặng về cập nhật:

*   **Giá trị R**: giá trị biểu thức.
*   **Giá trị L**: các vị trí có thể được gán.

Điểm then chốt là phép thế ở cấp biểu thức ổn định khi ta chỉ lập luận về giá trị. Phép gán đưa vào cập nhật vị trí, khiến lập luận bằng phép thế khó hơn hoặc không còn hợp lệ theo dạng ngây thơ.

## Ý nghĩa của phép gán và hiệu ứng phụ ở đây {#what-assignment-and-side-effects-mean-here}

Trong ngữ cảnh này:

*   **phép gán** là cập nhật một vị trí (ví dụ `x := x + 1`)
*   **hiệu ứng phụ** là mọi thay đổi quan sát được ngoài việc trả về giá trị

Phép gán là một dạng hiệu ứng phụ cụ thể.

Vì vậy RT thất bại trong nhiều bối cảnh mệnh lệnh: việc đánh giá có thể phụ thuộc hoặc làm thay đổi ngữ cảnh quan sát được bên ngoài giao diện giá trị tường minh của biểu thức.

## RT được trình bày ra sao trong ngôn ngữ hiện đại {#how-modern-languages-present-rt}

### Haskell {#haskell}

RT được dạy như cách lập luận mặc định cho biểu thức thuần. Hiệu ứng được biểu đạt tường minh bằng cấu trúc có kiểu (`IO`, truyền trạng thái và các phép trừu tượng liên quan), vì vậy định luật thế là trọng tâm trong sử dụng hằng ngày.

### Scala (Cats / Cats Effect) {#scala-cats--cats-effect}

Trong thực hành FP với Scala, Cats Effect đưa ra cách trình bày RT phổ biến nhất:

*   `IO[A]` là mô tả thuần túy của công việc có hiệu ứng
*   phép hợp thành các giá trị `IO` có tính RT
*   thực thi được tường minh hóa tại ranh giới môi trường chạy (`unsafeRun*`)

Cats Effect cũng đối chiếu điều này với việc đánh giá `Future` háo hức, một lý do khiến thảo luận RT trong Scala nhấn mạnh tính lười và thực thi trì hoãn.

## RT ngày nay {#rt-today}

Trong các hệ sinh thái hiện đại, RT thường được dùng làm cách gọi tắt cho hành vi an toàn với phép thế. Trong hệ thống kết hợp nhiều mô hình, các nhóm thường áp dụng khẳng định RT cho những mô-đun, API hoặc vùng có kiểu hiệu ứng cụ thể, thay vì áp dụng toàn cục cho mọi mã.

Để biết cách diễn giải RT theo Thiết kế theo ngữ nghĩa, xem [Tính minh bạch tham chiếu trở lại](../insights/referential-transparency.md).

## Tài liệu tham khảo {#references}

*   Strachey, C. *Fundamental Concepts in Programming Languages* (ghi chú bài giảng Oxford PRG, 1967).  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Tài liệu Cats Effect: `IO` kiểu dữ liệu và ghi chú về RT/đánh giá lười.  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Blog Typelevel: *An IO monad for cats* (động cơ về tính không thuần và RT trong Scala).  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
