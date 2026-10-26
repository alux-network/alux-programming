<!-- reader: {"title":"Quy trình lấy ý nghĩa làm trọng tâm","sourceHash":"sha256:4e52a8067c665db3ce38a802a1615b5d660d1aeee86656c13b53a33c6ebd2dff"} -->

# Quy trình lấy ý nghĩa làm trọng tâm {#a-meaning-first-workflow}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Vì sao ý nghĩa được đặt lên trước](../denotational-design/semantic-view.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](capability-algebras.md), [Ý nghĩa suy ra và phép hợp thành](derived-meaning.md), [Định luật, tình huống và bằng chứng](laws.md)
```

```admonish note title="Một quy trình có thể lặp lại"
Thiết kế theo ngữ nghĩa là quy trình làm việc, không chỉ là lời giải thích cho mã đã hoàn tất: phát biểu thay đổi ngữ nghĩa, tìm các năng lực nguyên thủy nhỏ nhất, hợp thành chúng một cách trung thực, rồi triển khai các bộ diễn giải mỏng và kiểm tra định luật.
```

Thiết kế theo ngữ nghĩa hữu ích nhất khi là một quy trình phát triển có thể lặp lại, chứ không chỉ là lời giải thích cho mã đã hoàn tất.

## Quy trình cốt lõi {#the-core-workflow}

Với tính năng mới hoặc đợt tái cấu trúc:

1.  Nêu thay đổi ngữ nghĩa trong một câu.
2.  Xác định đối tượng mang và đẳng thức có thể quan sát.
3.  Tìm các năng lực nguyên thủy nhỏ nhất cần thiết.
4.  Định nghĩa hành vi suy ra dựa trên các năng lực tường minh.
5.  Chọn hình thức hợp thành trung thực.
6.  Chỉ tái hóa chương trình bậc nhất nếu cấu trúc cần nhiều cách diễn giải.
7.  Triển khai các bộ diễn giải cụ thể mỏng.
8.  Bổ sung định luật hoặc tình huống dùng chung.
9.  Thẩm định các cách diễn giải thay thế.
10.  Tài liệu hóa ý nghĩa trước cơ chế.

## Phát biểu thay đổi ngữ nghĩa {#state-the-semantic-change}

Phát biểu yếu:

> Thêm bộ nhớ đệm và phương thức trình quản lý.

Phát biểu định hướng theo ý nghĩa:

> Việc phân giải cùng một tên nguồn bất biến sẽ biểu thị cùng một giá trị nguồn trong một lần biên dịch.

Phát biểu thứ hai làm lộ một định luật ứng viên. Sau này có thể chọn lưu đệm như một cách triển khai.

## Tìm ranh giới nguyên thủy {#find-the-primitive-boundary}

Hãy hỏi:

*   Cần quan sát hoặc phép biến đổi mới nào?
*   Nó là nguyên thủy ở ranh giới này hay có thể suy ra từ ý nghĩa hiện có?
*   Có cần đối tượng mang liên kết mới không?
*   Phụ thuộc được cho là cần thiết có chỉ là một vị trí lưu trữ không?
*   Những khác biệt nào cần tiếp tục vô hình?

Chỉ thêm năng lực khi có ý nghĩa nguyên thủy mới thực sự.

## Chọn cách hợp thành trung thực {#choose-composition-truthfully}

Dùng bảng quyết định này:

| Câu hỏi | Lựa chọn |
| --- | --- |
| Một bên nhận có diễn giải mọi ý nghĩa cần thiết không? | Ràng buộc trực tiếp |
| Hành vi có được lựa chọn độc lập không? | Giá trị chính sách tường minh |
| Các chính sách có thể hợp thành độc lập không? | Tích |
| Môi trường có chứa bộ diễn giải khác không? | Phép chiếu |
| Lớp bọc có cần thay thế bộ diễn giải bên trong không? | Ủy quyền |

Đừng mặc định câu trả lời là một đặc trưng ngữ cảnh lớn.

## Tái cấu trúc từng ý nghĩa một {#refactor-one-meaning-at-a-time}

Khi mã hiện có ưu tiên biểu diễn:

1.  Xác định một quan sát ngữ nghĩa.
2.  Định nghĩa một năng lực nhỏ.
3.  Chuyển một phép suy ra vào phần mở rộng.
4.  Giữ cấu trúc hiện tại làm bộ diễn giải.
5.  Thêm một kiểm thử dạng định luật.

```admonish warning title="DD không phải chủ nghĩa trừu tượng tối đa"
Tránh viết lại toàn bộ hệ thống con thành các trừu tượng mang tính suy đoán. DD không phải chủ nghĩa trừu tượng tối đa.
```

## Duyệt từ ý nghĩa đến cơ chế {#review-from-meaning-to-machinery}

Đọc mã theo thứ tự này:

1.  đặc trưng năng lực
2.  kiểu giá trị ngữ nghĩa
3.  các phần mở rộng suy ra
4.  cú pháp chương trình bậc nhất nếu có
5.  định luật và tình huống dùng chung
6.  bộ diễn giải cụ thể
7.  điều phối môi trường chạy

Bắt đầu từ cấu trúc trạng thái lớn nhất khiến việc duyệt thiên về cách biểu diễn của nó.

## Các kiểu thất bại thường gặp {#common-failure-modes}

````admonish warning title="Trạng thái cụ thể mang hình dạng đặc trưng không phải Thiết kế theo ngữ nghĩa"
```rust,noplayground
trait ContextAlg {
    fn state(&self) -> &ConcreteState;
}
```

Đặc trưng chỉ thay đổi cú pháp, không thay đổi quyền sở hữu ý nghĩa. Lõi ngữ nghĩa vẫn phụ thuộc vào cách biểu diễn cụ thể.
````

### Logic suy ra nằm trong mọi bộ diễn giải {#derived-logic-in-every-interpreter}

Nếu từng cách triển khai tự định nghĩa cùng một thuật toán miền, đặc tả đã bị sao chép.

### Năng lực toàn năng {#god-capability}

Đặc trưng cha chứa các phép toán không liên quan sẽ che giấu hàng phụ thuộc và ngăn việc diễn giải độc lập.

### Đặc tả thuộc sở hữu của khung {#framework-owned-specification}

Nếu chú giải tuyến hoặc đăng ký RPC là định nghĩa giao diện duy nhất, tài liệu và thực thi có thể sai khác.

### Ý nghĩa thuộc sở hữu của macro {#macro-owned-meaning}

Nếu mã được tạo không có đích bậc nhất công khai, phần khai triển macro sẽ vô tình trở thành đặc tả.

### Chính sách bị ẩn trong giá trị mặc định {#policy-hidden-in-defaults}

Nếu `Default` âm thầm chọn túc số, thử lại, thứ tự hoặc chính sách biên dịch, phép hợp thành không còn tường minh.

### Kiểm thử các bước riêng tư {#tests-of-private-steps}

Kiểm thử gắn với bố cục trường hoặc thứ tự duyệt sẽ cản trở các bộ diễn giải thay thế hợp lệ.

## Danh sách kiểm tra yêu cầu gộp {#pull-request-checklist}

### Ý nghĩa {#meaning}

*   Thay đổi ngữ nghĩa đã được nêu rõ chưa?
*   Đối tượng mang và đẳng thức có rõ ràng không?
*   Các nội dung lược bỏ có chủ ý đã được nêu tên chưa?

### Năng lực {#capabilities}

*   Mỗi đặc trưng có bộc lộ ý nghĩa nguyên thủy nhất quán không?
*   Các ràng buộc có được đặt tại nơi phép toán sử dụng chúng không?
*   Mã suy ra có tránh các trường cụ thể không?

### Phép hợp thành {#composition}

*   Ràng buộc trực tiếp, chính sách, tích, phép chiếu và ủy quyền có được dùng trung thực không?
*   Các giá trị mặc định ngữ nghĩa có được nêu tường minh không?

### Chương trình và bộ diễn giải {#programs-and-interpreters}

*   Cấu trúc bậc nhất chỉ được đưa vào khi một cách diễn giải khác cần đến nó chứ?
*   Macro tiện ích có thể hạ xuống các giá trị chương trình công khai không?
*   Các bộ diễn giải cụ thể có mỏng và riêng cho từng ranh giới không?

### Bằng chứng {#evidence}

*   Có định luật hoặc khẳng định ngữ nghĩa tập trung không?
*   Có thể chạy cùng tình huống với bộ diễn giải khác không?
*   Kiểm thử hữu hạn có được mô tả là bằng chứng thay vì chứng minh không?

## Đọc mã theo phong cách ALUX {#reading-alux-style-code}

Hình thái tổng quát cần nhận ra là:

1.  đặc trưng năng lực nguyên thủy nhỏ
2.  phần mở rộng suy ra trên các ràng buộc tường minh
3.  chương trình bậc nhất khi cần kiểm tra hoặc hợp thành
4.  định luật và tình huống dùng chung
5.  các bộ diễn giải cụ thể cho môi trường chạy, trình biên dịch, HTTP, RPC hoặc lưu trữ

Các hệ thống đồng thời lớn vẫn có những vùng nặng về điều phối. Đừng cho rằng mọi giao diện hiện có đều đã là đặc tả ngữ nghĩa chỉ định lý tưởng. Hãy tìm các đường nối ngữ nghĩa và đọc từ đó ra ngoài.

Tolang áp dụng cùng góc nhìn ở quy mô ngôn ngữ: cú pháp được chuẩn hóa thành dạng mang ý nghĩa, biên dịch bảo toàn ý nghĩa đó, còn môi trường chạy đồng thời diễn giải cách biểu diễn thực thi. Câu chuyện vận hành vẫn thiết yếu, nhưng chỉ đến sau hợp đồng ngữ nghĩa.

## Nguyên lý cuối cùng {#final-principle}

Khi chưa chắc chắn, hãy quay lại một câu hỏi:

```admonish quote title="Câu hỏi cần quay lại"
Cơ chế này cần bảo toàn ý nghĩa nào?
```

Câu hỏi đó không giải quyết mọi vấn đề kỹ thuật. Nó giúp thấy vấn đề ở đúng cấp độ.
