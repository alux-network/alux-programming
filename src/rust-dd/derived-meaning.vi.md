<!-- reader: {"title":"Ý nghĩa suy ra và phép hợp thành","sourceHash":"sha256:c7473063df63eb2d15fda98f9a500fae54294e9185911fd432265986a9f87f56"} -->

# Ý nghĩa suy ra và phép hợp thành {#derived-meaning-and-composition}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](../denotational-design/design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](capability-algebras.md), [Bộ diễn giải và hiệu ứng](interpreters.md)  
Khái niệm: [Bài toán biểu thức](../concepts/expression-problem.md)
```

```admonish note title="Định hướng"
Hành vi suy ra thuộc về các năng lực mà nó sử dụng; hãy viết hành vi đó một lần như phần mở rộng dựa trên những ràng buộc ấy, thay vì gắn vào một kiểu cụ thể tình cờ triển khai chúng. Mệnh đề `where` nêu trung thực các phụ thuộc của phép suy ra.
```

Năng lực nguyên thủy cung cấp từ vựng. Phần lớn hành vi ứng dụng nên được suy ra từ từ vựng đó một lần và dùng chung cho mọi bộ diễn giải.

## Phần mở rộng sở hữu phép suy ra {#extensions-own-derivations}

Dùng crate [`extend`](https://docs.rs/extend/latest/extend/), có thể suy ra các phép toán nhánh độc lập với cách biểu diễn:

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

Mệnh đề `where` là khai báo đầy đủ các phụ thuộc ngữ nghĩa: `BranchAlg` và không gì hơn. Không có kiểu nhánh cụ thể nào sở hữu các định nghĩa này.

Macro chỉ loại bỏ phần khuôn mẫu của đặc trưng và phần triển khai. Đặc trưng mở rộng thông thường cũng biểu đạt được cùng thiết kế. Thiết kế theo ngữ nghĩa nằm ở ranh giới ngữ nghĩa và phép suy ra, không nằm ở thuộc tính macro.

## Vì sao không đặt nó lên cấu trúc? {#why-not-put-it-on-the-struct}

````admonish warning title="Đừng hàn ý nghĩa suy ra vào cấu trúc"
Đây là cách tiếp cận ưu tiên biểu diễn. Nếu bổ sung đối tượng mang nhánh dạng số, phép suy ra sẽ bị sao chép hoặc triển khai lại, và kiểu cụ thể đầu tiên vô tình trở thành đặc tả.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

Phần mở rộng đảo ngược quyền sở hữu:

| Lớp | Trách nhiệm |
| --- | --- |
| Năng lực ngữ nghĩa | Sở hữu ý nghĩa suy ra |
| Kiểu cụ thể | Diễn giải ý nghĩa nguyên thủy |

## Hợp thành với ràng buộc {#compose-with-bounds}

Khi một bên nhận diễn giải nhiều năng lực, hãy dùng các ràng buộc trực tiếp:

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="Đừng gom nhóm năng lực"
Đừng tạo đặc trưng cha chỉ để viết ràng buộc ngắn hơn:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

Nhóm này che giấu phép toán nào sử dụng năng lực nào và tạo thêm một giao diện mà mọi bộ diễn giải phải đáp ứng.
````

## Năm ý nghĩa hợp thành khác nhau {#five-different-composition-meanings}

Hãy chọn dạng mô tả trung thực mối quan hệ.

| Tình huống | Dạng Rust |
| --- | --- |
| Một bên nhận diễn giải nhiều năng lực | Ràng buộc trực tiếp |
| Một giá trị riêng chọn hành vi | Tham số chính sách tường minh |
| Các chính sách độc lập hợp thành tĩnh | Tích hoặc cấu trúc thông thường |
| Một môi trường mang theo bộ diễn giải khác | Phép chiếu `HasX` nhỏ |
| Một lớp bọc thay thế bộ diễn giải bên trong | Ủy quyền |

### Chính sách tường minh {#explicit-policy}

Nếu một chiến lược được lựa chọn độc lập, hãy truyền chiến lược đó một cách tường minh vào phần mở rộng:

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

Phần mở rộng sở hữu phép suy ra dùng chung, còn chính sách vẫn là đầu vào được chọn độc lập. Nó không bị giấu trong môi trường hay được chọn bởi `Default`.

### Tích các chính sách {#product-of-policies}

Có thể hợp thành các chính sách độc lập mà không cần tạo ra kế thừa:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### Phép chiếu {#projection}

Một đặc trưng `HasClock` chỉ cho biết môi trường có thể chiếu ra một giá trị đồng hồ riêng:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

Phép toán đọc thời gian thêm `This::Clock: ClockAlg` vào mệnh đề `where` của chính nó. Phép chiếu vẫn chỉ nói về việc chứa giá trị; phép toán sử dụng nêu năng lực cần có. Chỉ dùng mẫu này khi sự phân tách là thực sự cần thiết. Đừng thêm `HasX` chỉ để sắp xếp các trường.

### Ủy quyền {#delegation}

Ủy quyền nghĩa là bản thân lớp bọc có thể thay thế bộ diễn giải bên trong. Cách này phù hợp với newtype trong suốt, con trỏ dùng chung và bộ chuyển đổi bảo toàn toàn bộ hợp đồng năng lực.

Phép chiếu nói “có”. Ủy quyền nói “là”. Hai cách này không thể thay thế cho nhau.

## Giá trị mặc định cũng là quyết định ngữ nghĩa {#defaults-are-semantic-decisions-too}

Các trạng thái rỗng mang tính cơ học có thể triển khai `Default`. Chính sách miền thường nên được nêu tường minh.

Các trường hợp hữu ích thường có lời giải thích đại số: giá trị mặc định là phần tử đơn vị đối với phép hợp thành tự nhiên của kiểu. Nối bộ đệm rỗng, kết hợp với bản đồ rỗng hoặc cộng dồn không chẩn đoán nào đều không đóng góp gì. Khi phép hợp thành có tính kết hợp, kiểu và phép toán tạo thành một monoid, và `Default` có thể đặt tên cho phần tử trung hòa thay vì chọn một chính sách.

Giá trị mặc định tốt:

*   Bộ đệm rỗng
*   Bản đồ rỗng
*   Không có chẩn đoán nào được tích lũy

Giá trị mặc định đáng ngờ:

*   Ngưỡng túc số
*   Chính sách chọn người lãnh đạo
*   Ngữ nghĩa thử lại
*   Độ sâu xác nhận
*   Định dạng đầu ra

Đây là điểm phân biệt quan trọng: phần tử trung hòa không đưa ra quyết định nào, còn túc số, chiến lược chọn người lãnh đạo hay quy tắc thử lại sẽ chọn hành vi miền. Nếu thay đổi mặc định làm đổi ý nghĩa miền, hãy hợp thành chính sách một cách tường minh.

## Giữ ý nghĩa suy ra khép kín {#derived-meaning-should-stay-closed}

Phần mở rộng chỉ được dùng các năng lực đã khai báo và đầu vào tường minh. Truy cập trực tiếp trường, trạng thái toàn cục và ép kiểu xuống cụ thể khiến mệnh đề `where` không trung thực.

Hãy xem xét phần thân như thể đó là chứng minh cho khai báo phụ thuộc:

```admonish question title="Kiểm tra từng phép suy ra"
Có thể biện minh cho mọi phép toán trong phần thân này từ các ràng buộc đó không?
```

Nếu không, hoặc ràng buộc chưa đầy đủ, hoặc mã cần thuộc về lớp khác.

## Các câu hỏi khi duyệt {#review-checks}

*   Hành vi suy ra có được định nghĩa một lần dựa trên các năng lực không?
*   Phần mở rộng có tránh dùng trường cụ thể và kiểu ngữ cảnh không?
*   Có dùng ràng buộc trực tiếp cho một bộ diễn giải không?
*   Chính sách có phải là các giá trị tường minh khi được chọn độc lập không?
*   Phép chiếu và ủy quyền có đưa ra khẳng định trung thực không?
*   Giá trị mặc định miền có hiển thị trong phép hợp thành không?
