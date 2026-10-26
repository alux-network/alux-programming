<!-- reader: {"title":"Chương trình bậc nhất"} -->

# Chương trình bậc nhất {#first-order-programs}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Ý nghĩa suy ra và phép hợp thành](derived-meaning.md), [Quy trình ngôn ngữ và trình biên dịch](compiler-pipelines.md)  
Khái niệm: [Phong cách truyền tiếp nối](../concepts/cps.md), [Phi chức năng hóa](../concepts/defunctionalization.md), [Monad tự do](../concepts/free_monad.md)  
Nhận định: [Bài toán biểu thức trở lại](../insights/expression-problem.md)
```

```admonish note title="Khi nào nên tái hiện phép áp dụng hàm"
Các hàm thông thường và phần mở rộng đã biểu đạt được hành vi suy ra. Chỉ chuyển phép áp dụng hàm thành dữ liệu bậc nhất khi một bộ diễn giải khác cần kiểm tra, hợp thành, tuần tự hóa hoặc biên dịch chương trình trước khi chạy.
```

Hàm thông thường và phương thức mở rộng thường là cách tốt nhất để biểu đạt hành vi suy ra. Đôi khi bộ diễn giải khác phải kiểm tra, kết hợp, lập tài liệu, tuần tự hóa hoặc biên dịch cấu trúc chương trình trước khi áp dụng nó. Khi đó, bản thân phép áp dụng hàm phải trở thành dữ liệu bậc nhất.

## Thực thi xóa mất cấu trúc {#execution-erases-structure}

Hãy xét:

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

Gọi phương thức này sẽ cho ra trạng thái. Sau khi lời gọi bắt đầu, bộ diễn giải bên ngoài thường không thể khôi phục:

*   kiểu ngữ cảnh ngữ nghĩa
*   các đối số theo thứ tự
*   tên đối số trong mã nguồn
*   kiểu kết quả
*   danh tính của phép toán

Thông tin đó có trong kiểu hàm ở cấp nguồn, nhưng bị tiêu thụ trong quá trình thực thi thông thường.

## Phi chức năng hóa phép áp dụng hàm {#defunctionalizing-application}

Phi chức năng hóa thay một phần tử thuộc họ hàm đã biết bằng thẻ bậc nhất và một phép áp dụng dùng chung.

Một tập từ vựng phép toán tối thiểu là:

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

`CurrentStatusOperation<App>` kích thước bằng không có thể biểu thị việc áp dụng phương thức mở rộng gốc. Nó cần gọi phương thức đó, không chứa bản sao thứ hai của phần thân.

1.  Bắt đầu từ phương thức mở rộng.
2.  Tái hóa nó thành một kiểu phép toán.
3.  Bảo toàn ngữ cảnh, tích các đối số, tên đối số và đầu ra.
4.  Diễn giải nó thông qua `ApplyAlg`.

Phương thức vẫn thuận tiện cho các lời gọi thông thường. Giá trị phép toán dành cho những ngữ cảnh cần cấu trúc bậc nhất.

## Đừng tái hóa khi chưa có bên sử dụng {#do-not-reify-without-a-consumer}

Chương trình bậc nhất thêm cơ chế kiểu. Hãy dùng chúng khi chúng cho phép một cách diễn giải thứ hai thực sự:

*   đăng ký lúc chạy
*   tạo tài liệu hoặc lược đồ
*   kiểm tra tĩnh
*   hợp thành chương trình trước khi thực thi
*   tuần tự hóa
*   biên dịch

Nếu mã chỉ cần gọi một hàm, hãy giữ nguyên hàm đó.

## Chương trình giao diện khả chuyển {#portable-interface-programs}

Giả sử một bề mặt HTTP gồm:

| Phương thức | Đường dẫn | Đầu vào | Phép toán | Đầu ra |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | Thân: `f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | Tệp truyền theo luồng |

Chương trình khả chuyển phải bảo toàn:

*   bộ chọn phương thức và đường dẫn
*   vai trò đầu vào như đường dẫn, truy vấn, thân, tiêu đề và xác thực
*   giá trị phép toán
*   vai trò đầu ra như JSON hoặc tệp
*   phép gộp và lồng tuyến

Nó không nên bảo toàn kiểu yêu cầu, bộ định tuyến hay phản hồi của một khung cụ thể.

Một ký pháp chuỗi phương thức có thể là:

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

Các lời gọi nối tiếp tạo ra một chương trình có kiểu. Chúng không nhất thiết phải đăng ký tuyến máy chủ ngay lập tức.

## Một chương trình, nhiều phép gấp {#one-program-several-folds}

Cùng chương trình bậc nhất có thể hỗ trợ nhiều cách diễn giải:

| Chương trình | Các cách diễn giải |
| --- | --- |
| Chương trình HTTP có kiểu | Tài liệu văn bản, tuyến có thể thực thi, siêu dữ liệu OpenAPI, liên kết phía ứng dụng khách, kiểm thử tính phù hợp |
| Chương trình JSON-RPC có kiểu | Sổ đăng ký phương thức, lược đồ, ứng dụng khách, bộ khung kiểm thử |

Đừng duy trì danh sách tuyến hoặc phương thức riêng cho thực thi và tài liệu. Việc đó tạo ra các đặc tả cạnh tranh.

## Vai trò đầu vào và đầu ra {#input-and-output-roles}

Phép toán đã biết kiểu đối số và kết quả. Khai báo truyền tải chỉ nên bổ sung ý nghĩa truyền tải.

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`, `query` và `json` xác định vai trò. Chúng không nên buộc tác giả nêu lại kiểu đầu ra vốn đã được xác định bởi `ApplyAlg`.

Việc chuyển đổi đầu ra thuộc về bộ diễn giải truyền tải. Máy chủ có thể chuyển kết quả này thành JSON và kết quả khác thành tệp đính kèm truyền theo luồng. Các phép toán ngữ nghĩa không nhận biết các cách biểu diễn đó.

## Phép hợp thành là ý nghĩa chương trình {#composition-is-program-meaning}

Chương trình nên bảo toàn phép hợp thành tổng quát:

*   Chương trình rỗng
*   Gộp các chương trình
*   Lồng chương trình dưới một tiền tố
*   Nâng một điểm cuối thành chương trình

Các phép này căn bản hơn phương thức bộ định tuyến của một khung cụ thể. Các tên nối chuỗi quen thuộc như `get`, `post`, `merge` và `nest` có thể là bí danh trên đại số trung lập.

Các đặc tả độc lập có thể công bố chương trình nhỏ:

| Chương trình đầu vào | Phép hợp thành | Kết quả |
| --- | --- | --- |
| Chương trình trạng thái và tải xuống | Gộp | Chương trình dịch vụ |
| Chương trình danh mục | Lồng | Chương trình dịch vụ |

Ứng dụng chọn và diễn giải phép hợp thành kết quả.

## Macro phải hạ xuống ý nghĩa công khai {#macros-must-lower-to-public-meaning}

Macro Rust có thể giúp khai báo bậc nhất dễ viết:

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

Macro chỉ lành mạnh khi nó hạ xuống một chương trình bậc nhất công khai, có thể tự dựng thủ công. Callback được tạo sinh không được trở thành định nghĩa duy nhất của giao diện.

Hướng đi tốt:

1.  Cú pháp thuận tiện
2.  Giá trị phép toán và chương trình công khai
3.  Phép gấp tổng quát
4.  Khung cụ thể

Hướng đi ưu tiên biểu diễn:

1.  Chú giải của khung
2.  Callback được tạo sinh mờ đục
3.  Tài liệu được suy ngược

## Quan hệ với các khái niệm hiện có {#relation-to-existing-concepts}

Chương trình giao diện bậc nhất xây dựng dựa trên các kỹ thuật ở chương khác: phi chức năng hóa là phép biến đổi tổng quát, cú pháp có thể mở rộng và cách diễn giải tạo thành Bài toán biểu thức, còn monad tự do là một dạng biểu diễn cú pháp kèm thứ tự hóa. Các liên kết liên quan ở đầu trang dẫn đến từng nội dung.

Đừng đồng nhất những kỹ thuật này với DD. DD xác định cấu trúc nào quan trọng; biểu diễn bậc nhất bảo toàn cấu trúc ấy khi lời gọi thông thường có thể xóa mất nó.

## Các câu hỏi khi duyệt {#review-checks}

*   Việc tái hóa có cần thiết cho một bộ diễn giải thứ hai thực sự không?
*   Phép toán có gọi phương thức do tác giả viết thay vì sao chép phương thức đó không?
*   Đối số và đầu ra có được suy ra từ phép toán không?
*   Cú pháp truyền tải chỉ bổ sung các vai trò truyền tải chứ?
*   Có thể dựng chương trình mà không cần macro tiện ích không?
*   Môi trường chạy và siêu dữ liệu có diễn giải cùng chương trình không?
