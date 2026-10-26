<!-- reader: {"title":"Bộ diễn giải và hiệu ứng","sourceHash":"sha256:4ca52b24121e8361c8cc8983e3807794110bade03c63105c1609e60eb9554b93"} -->

# Bộ diễn giải và hiệu ứng {#interpreters-and-effects}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Định luật và cách diễn giải](../denotational-design/laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](capability-algebras.md), [Định luật, tình huống và bằng chứng](laws.md)  
Khái niệm: [Monad tự do](../concepts/free_monad.md)  
Nhận định: [Đại số EVM](../insights/evm-alg.md)
```

```admonish note title="Định hướng"
Bộ diễn giải chọn cách biểu diễn hoặc hiệu ứng cho một năng lực. Nó hiện thực hóa các phép toán nguyên thủy mà không định nghĩa lại hành vi miền được suy ra ở lớp phía trên, nhờ vậy các định luật giữ nguyên với mọi bộ diễn giải.
```

Bộ diễn giải hiện thực hóa một năng lực ngữ nghĩa bằng cách biểu diễn hoặc hiệu ứng cụ thể. Nó cần chọn cơ chế mà không định nghĩa lại hành vi miền.

## Bộ diễn giải mỏng {#a-thin-interpreter}

Cách biểu diễn nhánh bằng đường đi bit có thể là:

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

Cách triển khai lưu trữ và quan sát các sự kiện nguyên thủy. `branch_left`, `branch_right` và `branch_is_ancestor` vẫn thuộc về phần mở rộng dùng chung.

## Bộ diễn giải phụ thuộc vào ranh giới {#interpreters-are-boundary-relative}

Cùng một kiểu có thể là bộ diễn giải ở ranh giới này và đầu vào ngữ nghĩa ở ranh giới khác.

| Ranh giới | Sử dụng | Diễn giải |
| --- | --- | --- |
| Bộ chuyển đổi hệ thống tệp | Truy cập hệ thống tệp | Tra cứu nguồn |
| Môi trường chuẩn hóa | Tra cứu nguồn như năng lực nguyên thủy | Kiến tạo ngôn ngữ đã chuẩn hóa |
| Quy trình trình biên dịch | Các số hạng đã chuẩn hóa | Kiến tạo tệp thực thi |

Không có một “lớp triển khai” phổ quát duy nhất. Có nhiều ranh giới ngữ nghĩa lồng nhau.

## Hiệu ứng ở rìa {#effects-at-the-edge}

Bộ diễn giải cụ thể sở hữu các lựa chọn như:

*   bố cục cơ sở dữ liệu
*   môi trường chạy bất đồng bộ
*   quyền sở hữu tác vụ
*   chiến lược thử lại
*   kiểu của khung HTTP hoặc RPC
*   tuần tự hóa
*   khóa và kênh
*   bộ nhớ đệm

Hãy loại các lựa chọn này khỏi đặc trưng ngữ nghĩa, trừ khi bên gọi cần quan sát chúng.

Chẳng hạn, năng lực nguồn ngữ nghĩa có thể trả về giá trị nguồn và lỗi. Bộ diễn giải sản xuất có thể lưu đệm tệp và thực hiện các lần đọc bất đồng bộ. Bộ diễn giải kiểm thử có thể dùng bản đồ bất biến. Logic chuẩn hóa suy ra nên hoạt động với cả hai.

## Quyền sở hữu ở môi trường chạy {#runtime-ownership}

Callback của khung thường yêu cầu trạng thái có quyền sở hữu, có thể sao chép và an toàn giữa các luồng. Đó là ràng buộc của bộ diễn giải, không nhất thiết là ràng buộc miền.

````admonish warning title="Đừng để đối tượng mang của khung xâm nhập phép toán nguyên thủy"
Tránh làm nhiễm phép toán nguyên thủy bằng đối tượng mang của khung:

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

Ưu tiên ứng dụng ngữ nghĩa:

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

Bộ diễn giải web có thể chọn `Arc<Context>`, trích xuất đầu vào yêu cầu, gọi `status` rồi chuyển đổi kết quả. Bên gọi trong miền không cần biết có máy chủ web.

## Bộ diễn giải trung lập {#neutral-interpreters}

Không phải bộ diễn giải nào cũng cần thực thi hiệu ứng.

Bộ diễn giải văn bản cho chương trình API có thể ghi lại:

| Phương thức | Đường dẫn | Đầu vào | Đầu ra |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

Bộ diễn giải siêu dữ liệu có thể tạo tài liệu. Bộ diễn giải kiểm thử có thể thu thập tên phép toán. Bộ diễn giải sản xuất có thể dựng các tuyến máy chủ.

Bộ diễn giải trung lập chứng minh chương trình mang ý nghĩa độc lập với một môi trường chạy.

## Hợp thành bộ diễn giải bằng ủy quyền {#composing-interpreters-by-delegation}

Vì ý nghĩa nằm trong các đặc trưng năng lực nhỏ, bộ diễn giải thường được *lắp ghép* thay vì viết toàn bộ. Đối tượng mang có được một năng lực bằng cách ủy quyền cho thành phần vốn cung cấp nó, nên phần chuyển tiếp được tạo sinh chứ không phải viết thủ công. Hầu hết trường hợp được bao phủ bởi hai dạng.

**Chuyển tiếp năng lực đến một trường.** macro ambassador `#[derive(Delegate)]` chuyển tiếp toàn bộ đặc trưng đến một giá trị bên trong. Đối tượng mang chứa nhiều thành phần sẽ ủy quyền mỗi năng lực cho trường sở hữu nó, không cần viết phần thân chuyển tiếp:

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

**Cấp năng lực qua getter.** Cung cấp cho một kiểu một getter, rồi một triển khai tổng quát sẽ cấp toàn bộ năng lực cho mọi kiểu có getter đó:

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

Hệ quả là nhiều cấu trúc không cần tồn tại. Một đối tượng ngữ cảnh nguyên khối — một đặc trưng lớn mang theo nhiều kiểu liên kết và hàng chục phương thức, cùng một cách triển khai cụ thể duy nhất — được thay bằng một nhóm nhỏ đặc trưng năng lực và một đối tượng mang mỏng ủy quyền từng đặc trưng cho trường hoặc getter cung cấp nó. Các phép toán suy ra, chẳng hạn kiểm tra hạn chót đã qua chưa, được viết một lần dưới dạng phần mở rộng dựa trên các phép toán nguyên thủy thay vì triển khai lại trên từng đối tượng mang.

```admonish warning title="Ủy quyền chuyển tiếp phép toán, không chuyển tiếp ý nghĩa"
Ủy quyền được tạo sinh loại bỏ mã khuôn mẫu nhưng không xác lập khả năng thay thế ngữ nghĩa. Macro `derive` như `#[derive(Delegate)]` của ambassador chỉ chứng minh các triển khai biên dịch được, chứ không chứng minh đối tượng mang biểu thị cùng bộ diễn giải. Nếu `Shared<T>(Arc<T>)` cần thay thế cho `T`, hãy kiểm tra các định luật trên đối tượng mang — lớp bọc thay đổi tính chia sẻ hoặc danh tính (`Arc`, gộp nhóm, lưu đệm) vẫn có thể chuyển tiếp mọi phương thức chính xác nhưng vi phạm định luật tính mới hoặc tính duy nhất. Khi đối tượng mang chỉ lưu giữ `T` giữa các dịch vụ không liên quan, phép chiếu trung thực hơn ủy quyền.
```

## Lỗi thuộc về một ranh giới {#errors-belong-to-a-boundary}

Lỗi cần truyền đạt ý nghĩa thất bại ở ranh giới xử lý chúng.

| Lỗi | Chuyển đổi ở ranh giới |
| --- | --- |
| Lỗi miền | Bộ diễn giải truyền tải ánh xạ lỗi thành phản hồi giao thức |
| Lỗi phân tích cú pháp | Giao diện đầu trình biên dịch ánh xạ lỗi thành chẩn đoán |
| Lỗi lưu trữ | Bộ diễn giải nguồn ánh xạ lỗi thành tình trạng nguồn ngữ nghĩa |

Đừng ép mã trạng thái HTTP, đối tượng lỗi RPC hoặc lỗi cơ sở dữ liệu vào đặc trưng miền nguyên thủy. Hãy chuyển đổi chúng tại ranh giới bộ diễn giải.

## Hiệu năng là mối quan tâm của cách diễn giải cho đến khi được quan sát {#performance-is-an-interpretation-concern-until-observed}

Gom lô, song song hóa, lưu đệm và bố cục dữ liệu thường thuộc về bộ diễn giải. Chúng chỉ trở thành ngữ nghĩa khi đặc tả cam kết thứ tự, thời gian, mức dùng tài nguyên, tính công bằng hoặc hành vi lỗi có thể quan sát.

Sự phân tách này cho phép tối ưu hóa mà không làm trôi lệch ngữ nghĩa:

*   Cùng các định luật
*   Cùng các quan sát được khai báo
*   Chiến lược vận hành khác nhau

## Các câu hỏi khi duyệt {#review-checks}

*   Bộ diễn giải có triển khai các phép toán nguyên thủy thay vì lặp lại phép suy ra không?
*   Các ràng buộc của môi trường chạy và khung có được giới hạn ở ranh giới sử dụng không?
*   Bộ diễn giải trung lập hoặc kiểm thử có thể triển khai cùng năng lực không?
*   Lỗi truyền tải và lưu trữ có được chuyển đổi ở rìa không?
*   Ủy quyền có trung thực về mặt ngữ nghĩa không?
*   Các khác biệt hiệu năng có không quan sát được theo ngữ nghĩa chỉ định đã nêu không?
