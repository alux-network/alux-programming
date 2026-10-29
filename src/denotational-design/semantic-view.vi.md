<!-- reader: {"title":"Vì sao ý nghĩa được đặt lên trước","sourceHash":"sha256:ae896b29c1d884e5f54c3937b60d791be4dd745e85f605b91d647e32b95a0ee6"} -->

# Vì sao ý nghĩa được đặt lên trước {#why-meaning-comes-first}

![The semantic view — choosing what a program means before how it runs](/semantic-view.png)

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Ngữ nghĩa và tính hợp thành](denotations.md), [Thiết kế theo ngữ nghĩa](design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md)  
Khái niệm: [Giới thiệu](../concepts/index.md)
```

```admonish note title="Định hướng"
Thiết kế theo ngữ nghĩa chọn ý nghĩa của chương trình trước, rồi suy ra từ vựng, cách biểu diễn và chiến lược thực thi để bảo toàn ý nghĩa đó. Trang này đối chiếu thứ tự ngữ nghĩa ấy với cách thiết kế ưu tiên biểu diễn mà phần lớn phần mềm đang theo.
```

Phần lớn phần mềm được thiết kế theo thứ tự mà nó sẽ chạy:

1.  Chọn trạng thái.
2.  Chọn luồng điều khiển.
3.  Tạo các phương thức xoay quanh cơ chế đó.
4.  Sau đó mới giải thích các phương thức được dự định mang ý nghĩa gì.

Thiết kế theo ngữ nghĩa đảo ngược thứ tự ấy:

1.  Chọn ý nghĩa.
2.  Xác định cấu trúc hợp thành của ý nghĩa.
3.  Suy ra từ vựng từ cấu trúc đó.
4.  Chọn cách biểu diễn và chiến lược thực thi.
5.  Xác minh rằng chúng bảo toàn ý nghĩa.

Sự đảo ngược này chính là góc nhìn ngữ nghĩa.

```admonish quote title="Cơ chế và ý nghĩa"
[Các khái niệm](../concepts/index.md) và [nhận định](../insights/index.md) giải thích những cơ chế lập trình hữu ích. [Thiết kế theo ngữ nghĩa](design.md) giải thích cách xác định cơ chế cần bảo toàn điều gì.
```

## Ba câu hỏi {#three-questions}

Khi thiết kế chương trình, hãy tách biệt ba câu hỏi.

| Góc nhìn | Câu hỏi | Sản phẩm thường gặp |
| --- | --- | --- |
| Ngữ nghĩa | Chương trình này có ý nghĩa gì? | giá trị, quan hệ, hàm, phương trình, định luật |
| Biểu diễn | Ý nghĩa đó được mã hóa như thế nào? | kiểu Rust, đặc trưng, AST, bảng, cây, bytecode |
| Vận hành | Cách biểu diễn được thực thi ra sao? | vòng lặp, biến đổi trạng thái, tác vụ, thông điệp, bộ diễn giải, máy ảo |

Cả ba góc nhìn đều quan trọng. Sai lầm là để biểu diễn hoặc thực thi âm thầm định nghĩa góc nhìn ngữ nghĩa.

Ngữ nghĩa vận hành là mô tả chính xác và có giá trị về việc thực thi. Nó có thể mô tả mọi chuyển tiếp mà bộ đánh giá thực hiện. Tuy vậy, nó vẫn trả lời một câu hỏi thiết kế khác với cách tiếp cận ngữ nghĩa chỉ định. Câu hỏi ngữ nghĩa chỉ định là chương trình hoàn chỉnh biểu thị giá trị toán học quan sát được nào và những phương trình nào phải đúng bất kể chiến lược thực thi.

## Một ví dụ nhỏ {#a-small-example}

Giả sử một hệ thống xác định các vị trí trong một quá trình phân nhánh.

Thiết kế ưu tiên biểu diễn có thể bắt đầu bằng một vectơ bit:

```rust,noplayground
struct BranchId(Vec<bool>);
```

Sau đó, các phương thức phát sinh quanh những trường dữ liệu: nối thêm bit, lấy lát cắt tiền tố, so sánh vectơ, tuần tự hóa byte.

Góc nhìn ngữ nghĩa bắt đầu từ nơi khác:

*   Có một vị trí gốc.
*   Một vị trí có thể mở rộng sang trái hoặc phải.
*   Một vị trí có thể là tổ tiên của vị trí khác.
*   Có thể quan sát đường đi giữa tổ tiên và hậu duệ.

Những phát biểu đó vẫn có ý nghĩa nếu sau này cách biểu diễn trở thành số nguyên, tọa độ cây, giá trị lai gọn nhẹ hoặc khóa cơ sở dữ liệu. Vectơ bit là một cách diễn giải vị trí nhánh, chứ không phải định nghĩa của nó.

## Ý nghĩa không phải phần tài liệu viết sau cùng {#meaning-is-not-documentation-after-the-fact}

Viết văn xuôi về một API cụ thể không biến thiết kế thành thiết kế ngữ nghĩa chỉ định. Ý nghĩa phải ràng buộc API trước khi chọn cách biểu diễn.

Một mô tả ngữ nghĩa cần cho biết:

*   những khác biệt nào quan trọng
*   những quan sát nào là nguyên thủy
*   các ý nghĩa lớn hơn hợp thành ra sao
*   những phương trình nào hợp lệ
*   mọi cách triển khai phải bảo toàn điều gì
*   những chi tiết nào được chủ ý lược bỏ

Nếu sản phẩm duy nhất có độ chính xác là một cấu trúc trạng thái hoặc vòng lặp thực thi, thì ý nghĩa vẫn thuộc về phần triển khai.

## Trừu tượng hóa và ý nghĩa {#abstraction-versus-meaning}

````admonish warning title="Đặc trưng ngữ cảnh không định nghĩa ý nghĩa"
Giao diện có thể che giấu cơ chế mà không giải thích ý nghĩa:

```rust,noplayground
trait ApplicationContext {
    fn database(&self) -> &Database;
    fn settings(&self) -> &Settings;
    fn runtime(&self) -> &Runtime;
}
```

Giao diện này trừu tượng hóa quyền truy cập vào các thành phần cụ thể. Nó không nêu các quan sát ngữ nghĩa mà phép tính cần có.
````

````admonish success title="Hỏi trực tiếp về ý nghĩa"
Giao diện định hướng theo ý nghĩa yêu cầu chính quan sát đó:

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```
````

Đảo ngược phụ thuộc rất hữu ích, nhưng Thiết kế theo ngữ nghĩa đòi hỏi nhiều hơn: ranh giới trừu tượng phải được tổ chức xoay quanh ý nghĩa, chứ không phải vị trí lưu trữ.

## Hướng thẩm quyền {#the-direction-of-authority}

Khi các tạo phẩm bất đồng, đừng trao thẩm quyền cho tạo phẩm gần với mã đang chạy nhất. Hãy hỏi mỗi tạo phẩm cần bảo toàn điều gì.

| Vai trò | Nội dung thuộc về đây | Trách nhiệm |
| --- | --- | --- |
| **Ý nghĩa** | Các quan sát, khác biệt và đẳng thức dự định của miền | Quyết định thế nào là đúng |
| **Đặc tả** | Miền ngữ nghĩa, ngữ nghĩa chỉ định, kiểu, phép toán nguyên thủy, định luật và phép hợp thành suy ra | Phát biểu ý nghĩa đó một cách chính xác |
| **Hiện thực hóa** | Cách biểu diễn cụ thể, bộ diễn giải, trình biên dịch, môi trường chạy, lưu trữ và lập lịch | Triển khai đặc tả mà không thay đổi nó |
| **Bằng chứng** | Chứng minh, kiểm tra định luật, tình huống và so sánh giữa các bộ diễn giải | Kết nối một cách hiện thực hóa với đặc tả; bản thân nó không định nghĩa ý nghĩa |

Từ đó có một quy tắc thực tế để giải quyết bất đồng:

*   Nếu một cách triển khai vi phạm định luật ngữ nghĩa, hãy sửa cách triển khai.
*   Nếu một bài kiểm thử mâu thuẫn với định luật mà nó cần kiểm tra, hãy sửa bài kiểm thử.
*   Nếu đặc tả hình thức không diễn đạt được ý nghĩa dự định của miền, hãy chỉnh sửa đặc tả.

Một tạo phẩm được phân loại theo vai trò, không phải cú pháp. Một đặc trưng Rust hoặc chương trình bậc nhất có thể thuộc về đặc tả khi nó trực tiếp bảo toàn cấu trúc ngữ nghĩa đã chọn; một kiểu Rust khác có thể chỉ là một cách mã hóa cụ thể. Ngữ nghĩa vận hành hình thức cũng có thể là một phần của đặc tả ngôn ngữ, nhưng các bước chuyển tiếp của nó vẫn phải tuân theo những quan sát và quan hệ tương đương mà ngôn ngữ hướng tới.

Giờ đây có thể đặt CPS, phi chức năng hóa, monad tự do, máy ảo, môi trường chạy giao thức và quy trình biên dịch vào đúng chỗ mà không cần hỏi cái nào là trừu tượng cuối cùng. Mỗi kỹ thuật đều là một cách biểu diễn hoặc thực thi hữu ích cho một số đối tượng sử dụng. Đặc tả ngữ nghĩa cho biết mọi kỹ thuật được chọn phải bảo toàn điều gì.
