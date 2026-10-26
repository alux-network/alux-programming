<!-- reader: {"title":"Định luật và cách diễn giải"} -->

# Định luật và cách diễn giải {#laws-and-interpretations}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Định luật, tình huống và bằng chứng](../rust-dd/laws.md), [Bộ diễn giải và hiệu ứng](../rust-dd/interpreters.md)  
Khái niệm: [Phân nhánh và hội tụ](../concepts/branching.md)
```

```admonish note title="Ý tưởng cốt lõi"
Các định luật nêu quan hệ giữa những phép toán của giao diện ngữ nghĩa, còn cách diễn giải gán các đối tượng mang cụ thể phải bảo toàn những định luật đó. Đẳng thức được chọn xác định khác biệt nào giữa các bộ diễn giải là có ý nghĩa và khác biệt nào được tự do.
```

Giao diện ngữ nghĩa đặt tên cho các phép toán. Định luật nêu quan hệ giữa chúng. Không có định luật, hai cách triển khai có thể cùng đáp ứng chữ ký Rust nhưng vẫn bất đồng về phép trừu tượng.

## Định luật hoàn thiện từ vựng {#laws-complete-the-vocabulary}

Với vị trí nhánh, các định luật hữu ích bao gồm:

$$ \begin{aligned} \operatorname{path}(b,b) &= \lbrack\,\rbrack \\ \operatorname{path}(\operatorname{root}, \operatorname{from\_path}(d_s)) &= d_s \\ \operatorname{from\_path}(\operatorname{path}(\operatorname{root},b)) &= b \\ \operatorname{is\_ancestor}(b,b) &= \mathsf{true} \\ \operatorname{left}(b) &\ne \operatorname{right}(b) \end{aligned} $$

Các định luật này giải thích nhiều hơn chú thích phương thức. Chúng mô tả tính đơn vị, phép tái dựng, tính phản xạ và tính phân biệt.

Không phải phương trình hấp dẫn nào cũng đúng. Chẳng hạn, cách biểu diễn độ rộng cố định có thể tràn ở độ sâu cực lớn. Khi đó, đây là:

*   giới hạn của bộ diễn giải nằm ngoài miền được chấp nhận
*   lỗi ngữ nghĩa mà giao diện cần bộc lộ
*   bằng chứng cho thấy đối tượng mang được chọn là sai

Thiết kế phải nêu rõ lựa chọn nào đúng.

## Diễn giải {#interpretation}

**Cách diễn giải** gán các đối tượng mang và phép toán cụ thể cho một đại số ngữ nghĩa.

| Chương trình ngữ nghĩa | Các cách diễn giải khả dĩ |
| --- | --- |
| Vị trí nhánh | Đường đi bit, cây số, dạng ký hiệu |
| Chương trình biểu thức | Bộ đánh giá, bộ in đẹp, bộ tối ưu hóa |
| Chương trình API có kiểu | Các tuyến máy chủ thực thi được, tài liệu, bộ tạo ứng dụng khách |

Cùng một chương trình có thể có nhiều cách diễn giải vì bản thân chương trình không đồng nhất với bất kỳ kết quả nào.

## Nghĩa vụ triển khai {#implementation-obligations}

Bộ diễn giải phải bảo toàn cấu trúc mà đặc tả tuyên bố.

Nếu phép gộp có tính kết hợp trong chương trình ngữ nghĩa:

$$ (a \oplus b) \oplus c = a \oplus (b \oplus c) $$

thì bộ diễn giải cần bảo toàn ý nghĩa quan sát được của phép kết hợp đó. Nếu thứ tự tuyến cũng được đặc tả, đẳng thức phải bao gồm cả thứ tự. Nếu chủ ý lược bỏ thứ tự, các cách triển khai có thể khác nhau về vận hành nhưng vẫn tương đương ngữ nghĩa.

Vì vậy cần chọn miền ngữ nghĩa và quan hệ đẳng thức trước khi viết định luật.

## Định luật, chứng minh và kiểm thử {#laws-proofs-and-tests}

Các thuật ngữ này không thể thay thế cho nhau:

*   **Định luật** là thuộc tính được dự định áp dụng tổng quát cho phép trừu tượng.
*   **Chứng minh** xác lập một định luật dưới các giả định đã nêu.
*   **Kiểm thử thuộc tính** kiểm tra nhiều ví dụ được tạo sinh.
*   **Kiểm thử tình huống** kiểm tra một trường hợp hữu hạn có ý nghĩa.
*   **Kiểm thử đơn vị** kiểm tra một hành vi cụ thể.

Kiểm thử là bằng chứng có thể thực thi, không phải chứng minh phổ quát. Dù vậy, chúng vẫn hữu ích vì có thể dùng lại với mọi bộ diễn giải.

## Bằng chứng có thể thực thi {#executable-evidence}

Các định luật ngữ nghĩa độc lập với cách triển khai. Kiểm tra có thể thực thi cung cấp bằng chứng hữu hạn rằng bộ diễn giải bảo toàn những định luật đó: kiểm tra thuộc tính khảo sát các khẳng định dạng phương trình, còn kiểm tra tình huống khảo sát tương tác quan sát được. Khi chỉ dùng các phép toán ngữ nghĩa, có thể tái sử dụng cùng bằng chứng giữa các bộ diễn giải tương thích. Kiểm thử hỗ trợ đặc tả; chúng không định nghĩa hay chứng minh đặc tả.

Các cách mã hóa Rust được trình bày trong [Định luật, tình huống và bằng chứng](../rust-dd/laws.md).

## Nhiều bộ diễn giải giúp làm rõ ý nghĩa {#multiple-interpreters-clarify-meaning}

Không cần cách triển khai thứ hai cho mọi đặc trưng nhỏ, nhưng đây là phép thử thiết kế mạnh mẽ.

Nếu một định luật được cho là trừu tượng chỉ có thể phát biểu bằng các trường của cách triển khai đầu tiên, có lẽ ranh giới ngữ nghĩa chưa đúng. Nếu bộ diễn giải thứ hai có thể triển khai các phép toán nguyên thủy và đáp ứng cùng định luật mà không bắt chước cách biểu diễn đầu tiên, thì phép trừu tượng đang trở nên đáng tin hơn.

Các bộ diễn giải trung lập đặc biệt hữu ích:

*   bộ diễn giải văn bản làm lộ cấu trúc chương trình
*   mô hình thuần trong bộ nhớ giúp cô lập các định luật
*   bộ diễn giải truy vết làm lộ các quan sát được chọn
*   bộ diễn giải sản xuất thực thi các hiệu ứng thực

## Đẳng thức quyết định quyền tự do tái cấu trúc {#equality-determines-refactoring-freedom}

Mọi đẳng thức ngữ nghĩa đều trao quyền tự do cho cách triển khai. Nếu hai cách biểu diễn bằng nhau theo ngữ nghĩa chỉ định đã chọn, cách triển khai có thể thay thế cách này bằng cách kia.

Mọi quan sát bị lược bỏ cũng tạo ra quyền tự do. Nếu thứ tự cấp phát không thuộc ngữ nghĩa thì có thể thay đổi. Nếu thứ tự phương thức thuộc ngữ nghĩa thì không được đổi.

Vì thế, định luật không chỉ là ràng buộc về tính đúng đắn. Chúng xác định phạm vi an toàn cho tối ưu hóa, thay thế và phát triển.

## Điểm kiểm tra {#checkpoint}

Trước khi chuyển sang các cách mã hóa Rust, hãy xác minh bạn có thể trả lời:

1.  Đối tượng mang ngữ nghĩa là gì?
2.  Phép trừu tượng chủ ý lược bỏ điều gì?
3.  Các phép toán nào là nguyên thủy?
4.  Các phép toán nào được suy ra?
5.  Đang dùng đẳng thức nào?
6.  Mọi bộ diễn giải phải bảo toàn những định luật nào?
7.  Bằng chứng nào sẽ được dùng chung giữa các bộ diễn giải?

Phần còn lại của cuốn sách trình bày một câu trả lời thực tiễn bằng Rust. Đó là cách mã hóa bức tranh ngữ nghĩa này, không phải thứ thay thế nó.
