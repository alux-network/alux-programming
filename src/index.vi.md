<!-- reader: {"title":"Lập trình ALUX","parts":{"Welcome":"Chào mừng","The Semantic View":"Góc nhìn ngữ nghĩa","Design by Meaning in Rust":"Thiết kế theo ngữ nghĩa trong Rust","Concepts":"Khái niệm","Insights":"Nhận định","Contributing":"Đóng góp"},"sourceHash":"sha256:801d6c5e7d3e5862395c094158caadb1df71cec65054c97d146882cf39bd00dc"} -->

```admonish warning title="Dự án ALUX"
Mã nguồn ALUX đang được phát triển tích cực và chưa được công bố rộng rãi.
```

# <img src="/alux-logo.png" style="margin-right: 10px; width: 60px;"> Hướng dẫn lập trình ALUX {#alux-programming-guidelines}

```admonish note title="ghi chú"
Cuốn sách này xây dựng nền tảng cần thiết để hiểu và đóng góp vào cơ sở mã lấy ý nghĩa làm trọng tâm của ALUX, bắt đầu từ nguyên lý cốt lõi của [Thiết kế theo ngữ nghĩa](denotational-design/design.md): xác định ý nghĩa của chương trình trước khi quyết định cách chương trình vận hành.

Theo Conal Elliott, cuốn sách xem tính toán là một đối tượng toán học rõ ràng, thay vì một chuỗi bước mờ đục.

Các đặc tả được biểu đạt bằng những [đặc trưng năng lực](rust-dd/capability-algebras.md) đơn giản, có thể hợp thành, mô tả *ý nghĩa* của chương trình. [Các bộ diễn giải](rust-dd/interpreters.md) cung cấp những cách *hiện thực hóa* các ý nghĩa đó mà có thể thay thế cho nhau.

Nhờ vậy, các quy tắc hợp thành, nghĩa vụ triển khai và [các phương trình hợp lệ](denotational-design/laws-and-interpretations.md) của phần mềm trở nên dễ nhận biết và kiểm thử hơn.
```

```admonish quote title="Cơ chế và ý nghĩa"
[Các khái niệm](concepts/index.md) và [nhận định](insights/index.md) giải thích những cơ chế lập trình hữu ích. [Thiết kế theo ngữ nghĩa](denotational-design/design.md) giải thích cách xác định cơ chế cần bảo toàn điều gì.
```

## Cách đọc cuốn sách này {#how-to-read-this-book}

Hãy đọc sách theo ba lớp:

*   [**Góc nhìn ngữ nghĩa**](denotational-design/semantic-view.md) giới thiệu [ngữ nghĩa và tính hợp thành](denotational-design/denotations.md), [các định luật và cách diễn giải](denotational-design/laws-and-interpretations.md), cùng mối quan hệ giữa ý nghĩa và biểu diễn.
*   [**Thiết kế theo ngữ nghĩa trong Rust**](rust-dd/capability-algebras.md) chuyển góc nhìn đó thành [các năng lực nhỏ](rust-dd/capability-algebras.md), [các mở rộng được suy ra](rust-dd/derived-meaning.md), [chương trình bậc nhất](rust-dd/first-order-programs.md) và [các bộ diễn giải mỏng](rust-dd/interpreters.md).
*   [**Các khái niệm**](concepts/index.md) và [**nhận định**](insights/index.md) giải thích những mô hình thực thi, cách mã hóa, phép biến đổi và mối liên hệ quan trọng.

Các nguyên lý ngữ nghĩa không phụ thuộc ngôn ngữ. Rust là ngôn ngữ triển khai chính, còn [một quy trình ngôn ngữ đồng thời](rust-dd/compiler-pipelines.md) kết nối các nguyên lý này với Tolang.

## Cuốn sách dành cho ai {#who-this-book-is-for}

*   Lập trình viên muốn phần mềm phức tạp vẫn **mô-đun, có thể hợp thành, kiểm thử và bảo trì** khi phát triển.
*   Nhà phát triển muốn **kết nối lý thuyết phạm trù, hệ kiểu và thiết kế chương trình**.
*   Độc giả quen thuộc với các kỹ thuật biểu diễn và vận hành—như [**monad tự do**](concepts/free_monad.md), [**phong cách truyền tiếp nối (CPS)**](concepts/cps.md) và [**phi chức năng hóa**](concepts/defunctionalization.md)—muốn hiểu cách những cơ chế ấy phục vụ, thay vì định nghĩa, thiết kế lấy ý nghĩa làm trọng tâm.
*   Độc giả quen thuộc với [**kiểu phụ thuộc**](denotational-design/dependent-types.md) và lập trình hướng chứng minh, muốn áp dụng mô hình tư duy đó khi viết Rust hiệu năng cao.
*   Người đóng góp cần đọc [đặc tả Rust lấy ý nghĩa làm trọng tâm](rust-dd/capability-algebras.md) và hiểu cách [biên dịch một ngôn ngữ đồng thời](rust-dd/compiler-pipelines.md) mà không biến trình biên dịch thành định nghĩa của ngôn ngữ.
