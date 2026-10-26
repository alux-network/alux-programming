<!-- reader: {"title":"Nhìn lại tính minh bạch tham chiếu","sourceHash":"sha256:3f37fd77a20744f5881d426de372b671f438c12c29fc26e32f79a6cf91e6ab6a"} -->

# Nhìn lại tính minh bạch tham chiếu {#referential-transparency-reloaded}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Ngữ nghĩa và tính hợp thành](../denotational-design/denotations.md), [Định luật và cách diễn giải](../denotational-design/laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md), [Ý nghĩa suy ra và phép hợp thành](../rust-dd/derived-meaning.md)  
Khái niệm: [Tính minh bạch tham chiếu](../concepts/referential_transparency.md)
```

Trang này trình bày cách diễn giải tính minh bạch tham chiếu theo Thiết kế theo ngữ nghĩa.<em>Trang khái niệm đề cập lịch sử và cách dùng phổ biến trong các ngôn ngữ.</em>Ở đây ta tập trung vào ý nghĩa của RT như một ràng buộc thiết kế.

Trong DD, RT không phải nhãn chỉ tính thuần. Đó là định luật về ngữ nghĩa chỉ định: phép thế phải bảo toàn ý nghĩa được đặc tả.

## Cách diễn đạt lại RT theo Thiết kế theo ngữ nghĩa {#denotational-design-restatement-of-rt}

Thiết kế theo ngữ nghĩa diễn đạt lại RT thành yêu cầu dành cho đặc tả, không phải phong cách triển khai. Trước hết, đặc tả phải định nghĩa ý nghĩa hợp thành; chiến lược thực thi được chọn sau.

Vì vậy, RT được kiểm tra tại ranh giới ngữ nghĩa:

*   cùng đầu vào
*   cùng ngữ cảnh đã khai báo
*   cùng ngữ nghĩa chỉ định

Nếu những điều này được giữ nguyên, phép thế hợp lệ và có thể lập luận bằng phương trình. Điều này vẫn đúng ngay cả khi các bộ diễn giải cụ thể thực hiện IO, đồng thời, thử lại hoặc chuyển trạng thái, vì các chi tiết đó được ủy quyền phía sau ranh giới năng lực đã đặc tả.

Nói cách khác, DD không hỏi “cách triển khai này có thuần không?” DD hỏi “các đẳng thức ngữ nghĩa chỉ định có tường minh không, và các bộ diễn giải có bảo toàn chúng không?”

## Tính thuần và RT {#purity-and-rt}

RT và tính thuần có liên quan nhưng không đồng nhất.

*   **RT** là định luật phép thế về ý nghĩa.
*   **Tính thuần** là ràng buộc vận hành: không có hiệu ứng quan sát được bị che giấu.

Tính thuần là cách phổ biến để có RT ở cấp biểu thức. Nhưng RT vẫn là tiêu chí ngữ nghĩa: phép thế phải bảo toàn ngữ nghĩa chỉ định được đặc tả.

Vì vậy, DD tránh biến RT thành nhãn phong cách như “chỉ dùng mã thuần”. Yêu cầu là các đẳng thức ngữ nghĩa tường minh, với hiệu ứng được cô lập phía sau ranh giới năng lực.

Một cách đọc ngữ nghĩa tối thiểu là:

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

Với cùng đầu vào `a` và cùng đầu vào `io`, `f` tạo ra cùng `(result, io')`. Đây là dạng lập luận phép thế theo ngữ cảnh, có đánh chỉ mục, theo phong cách DD.

## Vì sao cách này làm rõ RT {#why-this-clarifies-rt}

Nhiều tranh luận về RT làm mờ một khác biệt hữu ích:

*   tính minh bạch ngữ nghĩa
*   hiệu ứng phụ vận hành

DD tách biệt các lớp này:

*   lõi ngữ nghĩa nêu ý nghĩa
*   bộ diễn giải hiện thực hóa chiến lược thực thi

Sự phân tách này cho phép hiệu ứng thực tiễn mà không làm mất khả năng lập luận dựa trên định luật.

## Kiểu thất bại của thiết kế ưu tiên biểu diễn {#representation-first-failure-mode}

Nếu cam kết với cách biểu diễn cụ thể quá sớm, thảo luận RT sẽ trôi sang tranh luận phong cách:

*   “phong cách này thuần”
*   “phong cách kia không thuần”
*   “lớp bọc IO giải quyết được”

Phần lớn đây chỉ là tranh luận về cách mã hóa. DD hỏi câu đơn giản hơn: đặc tả của bạn cho phép những đẳng thức nào?

## Mẫu DD thực tiễn {#practical-dd-pattern}

Định nghĩa các đặc trưng năng lực nhỏ và viết hành vi chương trình thành phần mở rộng dựa trên chúng. Sau đó cung cấp các bộ diễn giải cụ thể mỏng.

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]` là macro từ crate [`extend`](https://docs.rs/extend/latest/extend/), dùng để giảm mã khuôn mẫu bằng cách tạo phương thức mở rộng từ khối `impl`; đây không phải tính năng mới của ngôn ngữ Rust.

Trong FP Scala, RT thường được trình bày qua các giá trị kiểu `F[A]` (ví dụ `IO[A]` hoặc `F[Either[E, A]]`). Ở đây, RT được biểu đạt ở cấp cao hơn: như ý nghĩa chương trình bị ràng buộc bởi năng lực. Vì vậy, phương thức Rust này không phải vùng chứa giá trị RT theo cùng nghĩa mã hóa như `F[A]`; đây là hành vi RT được đặc tả dựa trên các năng lực tường minh, còn hiệu ứng cụ thể được ủy quyền cho cách triển khai.

Phần mở rộng phát biểu hành vi ngữ nghĩa dựa trên các năng lực. Cách triển khai cụ thể quyết định chiến lược thực thi: gom lô, thử lại, truyền tải, song song và chi tiết lưu trữ.

## Nhận định cuối {#final-insight}

Trong Thiết kế theo ngữ nghĩa, RT là thuộc tính của đặc tả ngữ nghĩa. Lựa chọn triển khai là thứ yếu miễn là chúng bảo toàn các định luật ngữ nghĩa chỉ định đã nêu.

Giữ lại định luật. Đừng mắc kẹt ở nhãn gọi.
