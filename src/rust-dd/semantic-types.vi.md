<!-- reader: {"title":"Kiểu ngữ nghĩa trong Rust"} -->

# Kiểu ngữ nghĩa trong Rust {#semantic-types-in-rust}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Kiểu phụ thuộc và chứng minh](../denotational-design/dependent-types.md), [Thiết kế theo ngữ nghĩa](../denotational-design/design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](capability-algebras.md), [Chương trình bậc nhất](first-order-programs.md), [Định luật, tình huống và bằng chứng](laws.md)  
Khái niệm: [Tính minh bạch tham chiếu](../concepts/referential_transparency.md)
```

```admonish note title="Định hướng"
Rust lấy ý nghĩa làm trọng tâm dùng kiểu để giữ cho cấu trúc ngữ nghĩa luôn hiển thị. Kiểu liên kết đặt tên cho các họ đối tượng mang, ràng buộc nêu quan hệ giữa chúng, còn phần mở rộng suy ra phép toán mới từ các tiền đề tường minh. Định luật vẫn xác định mọi cách diễn giải phải bảo toàn điều gì.
```

Trong Rust, nhiều vai trò khác nhau đều được viết là `type`. Phân biệt chúng giúp ý nghĩa không sụp đổ thành biểu diễn.

| Vai trò | Ví dụ | Nội dung được phát biểu |
| --- | --- | --- |
| Kiểu ngữ nghĩa | `Direction` | Những khác biệt nào trong miền quan trọng |
| Đối tượng mang do bộ diễn giải chọn | `BranchAlg::Branch` | Bộ diễn giải chọn cách biểu diễn nào |
| Phép toán suy ra | `BranchExt::branch_child` | Điều gì được suy ra từ các năng lực đã khai báo |
| Kiểu giai đoạn | `Syntax`, `CoreProgram`, `Executable` | Giá trị đã trải qua phép biến đổi nào |
| Kiểu biểu diễn | `BitBranch` | Một bộ diễn giải lưu trữ ý nghĩa nhánh như thế nào |
| Chương trình bằng chứng | Một tình huống hoặc phần mở rộng định luật có thể tái sử dụng | Các quan sát mà bộ diễn giải tương thích phải thỏa mãn |

## Kiểu ngữ nghĩa trước biểu diễn {#semantic-types-before-representation}

Giả sử một miền phân nhánh phân biệt hai hướng:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction` nêu trực tiếp sự phân biệt đó. Một bộ diễn giải có thể mã hóa gọn đường đi:

```rust,noplayground
struct BitBranch(Vec<bool>);
```

Các giá trị boolean thuộc về cách biểu diễn đó. Chúng không định nghĩa trái và phải, và bộ diễn giải khác không cần dùng đến chúng.

```admonish warning title="Mã hóa gọn không phải kiểu ngữ nghĩa"
Đừng định nghĩa hành vi miền bằng vị trí bit, độ lệch byte hay nhánh máy. Những tạo phẩm đó phải mã hóa các khác biệt ngữ nghĩa, chứ không sở hữu chúng.
```

Sự phân tách này cho phép thay đổi bố cục lưu trữ và thực thi mà không âm thầm thay đổi miền.

## Kiểu liên kết chọn đối tượng mang {#associated-types-choose-carriers}

Đại số năng lực có thể để mỗi bộ diễn giải quyết định đối tượng mang:

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

`Self::Branch` không phải kiểu trường bị che giấu. Đây là đối tượng mang được cách diễn giải ý nghĩa nhánh chọn. Đường đi bit, vị trí cây số, số hạng ký hiệu hoặc cách biểu diễn khác đều có thể thỏa mãn cùng đại số.

Với bộ diễn giải `T`, có thể đọc ký hiệu `T::Branch` như họ đối tượng mang $\mathsf{Branch}(T)$. Thay đổi bộ diễn giải có thể làm thay đổi đối tượng mang, trong khi mọi phép toán vẫn được đánh chỉ mục nhất quán theo cùng lựa chọn.

## Phần mở rộng suy ra hệ quả {#extensions-derive-consequences}

Phần mở rộng có thể tạo phép toán mới chỉ từ đúng các tiền đề cần thiết:

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

Mệnh đề `where` là tiền đề: `This` diễn giải đại số nhánh. Phương thức là hệ quả: đối với đối tượng mang của bộ diễn giải đó, một nhánh và một hướng xác định nhánh con.

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

Không có gì trong phép suy ra này chọn cách biểu diễn nhánh cụ thể. Kết quả vẫn thuộc họ đối tượng mang do bộ diễn giải chọn.

## Ràng buộc đẳng thức nêu tính tương thích {#equality-bounds-state-compatibility}

Đôi khi hai năng lực cần thống nhất về một đối tượng mang. Đẳng thức kiểu liên kết có thể nêu yêu cầu đó mà không chọn cách biểu diễn cụ thể:

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

Hãy đọc ràng buộc như một mệnh đề cục bộ: `Left` và `Right` diễn giải các phép toán nhánh trên cùng đối tượng mang. Đặt đẳng thức ở phép toán cần sự thống nhất, thay vì ép áp dụng toàn cục lên một trong hai đại số.

Ràng buộc như vậy mạnh và chính xác hơn việc nhận một ngữ cảnh cụ thể chỉ vì nó tình cờ chứa cả hai cách triển khai.

## Kiểu giai đoạn làm lộ hợp đồng trình biên dịch {#stage-types-make-compiler-contracts-visible}

Quy trình trình biên dịch không nên chuyển cùng một cây không phân biệt qua mọi giai đoạn. Các kiểu giai đoạn riêng biệt nêu rõ phép biến đổi nào đã diễn ra:

| Giai đoạn | Đầu vào | Đầu ra | Hợp đồng |
| --- | --- | --- | --- |
| Phân tích cú pháp | Văn bản nguồn | `Syntax` | Nhận diện ngữ pháp bề mặt |
| Chuẩn hóa | `Syntax` | `CoreProgram` | Tạo ra ý nghĩa lõi đã chọn |
| Sinh mã | `CoreProgram` | `Executable` | Bảo toàn các quan sát chương trình trong dạng thực thi được |
| Môi trường chạy | `Executable` | Hành vi quan sát được | Diễn giải tệp thực thi nhất quán với mô hình ngôn ngữ |

Các kiểu này ngăn nhầm lẫn giai đoạn ngoài ý muốn, nhưng chỉ tên gọi không chứng minh được tính bảo toàn. Các phép biến đổi vẫn cần định luật được nêu rõ, tình huống tiêu biểu và bằng chứng so sánh giữa các bộ diễn giải.

## Đọc hợp đồng {#read-the-contract}

Cấu trúc ở cấp kiểu cho phép một cách đọc logic hữu ích:

| Dạng Rust | Cách đọc |
| --- | --- |
| `This: BranchAlg` | `This` cung cấp một cách diễn giải ý nghĩa nhánh |
| `This::Branch` | Đối tượng mang nhánh do `This` chọn |
| `Right: BranchAlg<Branch = Left::Branch>` | Hai cách diễn giải thống nhất về đối tượng mang |
| `-> This::Branch` | Kết quả vẫn thuộc họ đối tượng mang đã chọn |

Cách đọc này khuyến khích API bộc lộ yếu tố quyết định một kiểu, các đẳng thức mà phép hợp thành cần và kết luận nào suy ra từ những tiền đề đó. Kiểu liên kết, kiểu liên kết tổng quát, generic hằng, typestate và các chứng nhân kích thước bằng không đều có thể biểu đạt một phần hợp đồng như vậy khi sự phân biệt nền tảng là có thật.

Đừng tạo ra cơ chế cấp kiểu chỉ để làm cho cách triển khai trông hình thức hơn. Kiểu cần bộc lộ ý nghĩa hoặc bảo toàn quan hệ cần thiết, không phải tô điểm cách biểu diễn.

## Kiểu không thay thế định luật {#types-do-not-replace-laws}

Chữ ký kiểu giới hạn những chương trình có thể được tạo thành. Định luật ràng buộc quan hệ giữa các phép toán. Cần có cả hai.

Chẳng hạn, `BranchAlg::Branch` cho biết mỗi bộ diễn giải chọn một đối tượng mang nhánh. Bản thân điều đó không xác lập rằng:

*   đường đi từ một nhánh đến chính nó là rỗng
*   phát lại đường đi từ gốc sẽ dựng lại nhánh
*   hai nhánh con ngược hướng là khác nhau

Đó là các định luật ngữ nghĩa mà những bộ diễn giải tương thích cùng chia sẻ. Khẳng định riêng cho một cách biểu diễn — chẳng hạn các bit không dùng đến phải bằng không — thuộc về bộ diễn giải đã chọn cách biểu diễn đó.

```admonish quote title="Đọc kiểu như các khẳng định"
Hãy hỏi mỗi kiểu khẳng định điều gì, yếu tố nào quyết định kiểu, định luật nào bổ sung cho nó và bộ diễn giải nào hiện thực hóa nó.
```

## Các câu hỏi khi duyệt {#review-checks}

*   Khác biệt trong miền có xuất hiện trước cách mã hóa máy gọn nhẹ không?
*   Kiểu liên kết có phải là đối tượng mang do bộ diễn giải chọn thay vì trạng thái cụ thể được ngụy trang không?
*   Ràng buộc đẳng thức có chỉ nêu tính tương thích cần thiết tại nơi sử dụng đó không?
*   Các giai đoạn trình biên dịch khác nhau có kiểu riêng và hợp đồng tường minh không?
*   Mệnh đề ngữ nghĩa có được tách khỏi bất biến biểu diễn không?
*   Các khẳng định Rust không thể biểu đạt có được hỗ trợ bằng định luật hoặc tình huống tái sử dụng không?
