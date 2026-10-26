<!-- reader: {"title":"Ngữ nghĩa chỉ định và tính hợp thành"} -->

# Ngữ nghĩa chỉ định và tính hợp thành {#denotations-and-compositionality}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Vì sao ý nghĩa được đặt lên trước](semantic-view.md), [Thiết kế theo ngữ nghĩa](design.md), [Định luật và cách diễn giải](laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md)  
Khái niệm: [Tính minh bạch tham chiếu](../concepts/referential_transparency.md), [Phân nhánh và hội tụ](../concepts/branching.md)
```

```admonish note title="Ý tưởng cốt lõi"
Ngữ nghĩa chỉ định là một hàm ý nghĩa từ cú pháp sang miền ngữ nghĩa được chọn. Ngữ nghĩa có tính hợp thành khi ý nghĩa của toàn thể được xác định bởi ý nghĩa các phần, nhờ đó có thể xác lập đẳng thức ngữ nghĩa và phép thay thế an toàn.
```

**Ngữ nghĩa chỉ định** là ý nghĩa được gán cho một đoạn cú pháp hoặc cấu trúc lập trình. Ta thường viết:

$$ \llbracket e \rrbracket $$

để chỉ “ý nghĩa của biểu thức `e`”.

Ký hiệu ngoặc không bắt buộc ngữ nghĩa chỉ định phải là một số. Tùy miền, chương trình có thể biểu thị:

*   một giá trị
*   một hàm
*   một quan hệ
*   một tập hợp kết quả có thể có
*   một phép biến đổi trạng thái
*   một phân phối xác suất
*   hành vi của một tiến trình
*   một kết quả từng phần

Vì vậy, quyết định thiết kế đầu tiên không phải là “cấu trúc nào nên chứa nó?” mà là “miền ngữ nghĩa nào chứa các ý nghĩa ta quan tâm?”

## Miền ngữ nghĩa {#semantic-domains}

Với biểu thức số học, miền đơn giản có thể là các số nguyên:

$$ \llbracket e \rrbracket_{eval} \in \mathbb{Z} $$

Với việc định dạng, cùng ngôn ngữ biểu thức đó có thể được diễn giải thành văn bản:

$$ \llbracket e \rrbracket_{pretty} \in \mathsf{String} $$

Với phép tính có hiệu ứng, miền có thể là một phép biến đổi trạng thái:

$$ \llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State} $$

Với ngôn ngữ đồng thời, miền có thể mô tả hành vi tiến trình quan sát được thay vì một vết thực thi định trước.

Miền được chọn quyết định những khác biệt nào có ý nghĩa. Nếu thời gian không có trong miền, hai cách triển khai có thời gian chạy khác nhau vẫn có thể biểu thị cùng một chương trình. Nếu mức tiêu thụ tài nguyên được đưa vào, chính khác biệt đó có thể trở thành khác biệt ngữ nghĩa.

## Trừu tượng hóa là chủ ý quên đi {#abstraction-forgets-intentionally}

Một ngữ nghĩa chỉ định hữu ích sẽ lược bỏ chi tiết máy không liên quan.

Với một vị trí nhánh, ngữ nghĩa chỉ định có thể giữ lại đường đi từ gốc, đồng thời lược bỏ:

*   bố cục byte
*   chiến lược cấp phát
*   hành vi bộ nhớ đệm
*   định dạng tuần tự hóa

Với chương trình HTTP, ngữ nghĩa chỉ định khả chuyển có thể giữ lại phương thức, đường dẫn, vai trò đầu vào, phép toán và vai trò đầu ra, đồng thời lược bỏ bộ định tuyến hoặc bộ thực thi nào sẽ lưu trữ nó.

Với một giai đoạn trình biên dịch, ngữ nghĩa chỉ định có thể giữ phép dịch từ mã nguồn chuẩn hóa sang ý nghĩa thực thi, đồng thời lược bỏ các bộ đệm tạm và thứ tự duyệt.

Lược bỏ không phải là khiếm khuyết. Chính điều đó khiến các cách biểu diễn khác nhau có thể tương đương.

## Tính hợp thành {#compositionality}

Ngữ nghĩa có tính **hợp thành** khi ý nghĩa của toàn thể được xác định bởi ý nghĩa các phần và cách kết hợp chúng.

Với phép cộng:

$$ \llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket $$

Với phép hợp thành hàm tuần tự:

$$ \llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket $$

Với toán tử tiến trình song song, miền ngữ nghĩa cần có phép hợp thành song song tương ứng:

$$ \llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket $$

Toán tử chính xác $\otimes$ phụ thuộc vào mô hình tiến trình được chọn. Điểm quan trọng là phép hợp thành cú pháp được ánh xạ một cách có hệ thống sang phép hợp thành ngữ nghĩa.

Tính hợp thành cho phép suy luận cục bộ. Nếu hai phần có cùng ngữ nghĩa chỉ định, có thể thay phần này bằng phần kia trong mọi ngữ cảnh hợp thành:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket \implies \llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket $$

Đây là nền tảng cho phép thay thế an toàn và tái cấu trúc ngữ nghĩa.

## Đẳng thức ngữ nghĩa {#semantic-equality}

Các chương trình không cần giống nhau về văn bản hay cách vận hành để tương đương về ngữ nghĩa.

Hãy xét hai cách triển khai vị trí nhánh:

$$ \lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack $$

và một cách mã hóa bằng số nguyên biểu thị cùng đường đi. Giá trị bộ nhớ của chúng khác nhau, nhưng ngữ nghĩa chỉ định của chúng có thể bằng nhau.

Tương tự, hai lượt của trình biên dịch có thể duyệt cú pháp theo thứ tự khác nhau nhưng tạo ra các tệp thực thi có hành vi như nhau theo đặc tả. Việc có yêu cầu chúng giống hệt từng byte hay không là một định luật riêng, mạnh hơn.

Luôn nêu rõ loại đẳng thức đang được khẳng định:

*   đẳng thức giá trị
*   đẳng thức cấu trúc
*   đẳng thức biểu diễn chuẩn tắc
*   tương đương vết thực thi
*   tính mô phỏng song hành
*   tương đương quan sát
*   đẳng thức ngữ nghĩa chỉ định

Nhầm lẫn những đẳng thức này là nguyên nhân phổ biến dẫn đến các định luật sai.

## Tính ngoại tại phụ thuộc tương quan {#externality-is-relative}

Giả sử một phép tính có ý nghĩa như sau:

$$ H \times E \to O $$

Xét theo `H`, bằng chứng `E` là bên ngoài. Nếu một lớp trừu tượng mới chọn `H × E` làm đối tượng mang, bằng chứng ấy trở thành nội tại trong ranh giới mới.

Nhận xét này quan trọng đối với hiệu ứng và ngữ cảnh. Không có sự kiện nào “thuộc môi trường” một cách tuyệt đối. Cần hỏi đối tượng mang ngữ nghĩa hiện tại có bao gồm nó không và những định luật nào chi phối nó.

```admonish warning title="Tránh một đối tượng ngữ cảnh toàn năng"
Đừng giải quyết câu hỏi về ranh giới này bằng một đối tượng ngữ cảnh toàn năng. Hãy nêu rõ từng ý nghĩa được chấp nhận dưới dạng năng lực hoặc giá trị tường minh.
```

## Ý nghĩa nguyên thủy và ý nghĩa suy ra {#primitive-and-derived-meaning}

Các phép toán nguyên thủy là từ vựng được chọn cho miền ngữ nghĩa. Các phép toán suy ra được định nghĩa từ chúng.

Với vị trí nhánh, một tập từ vựng nguyên thủy gọn có thể gồm:

*   Một vị trí gốc
*   Mở rộng theo một hướng
*   Quan sát đường đi từ vị trí này đến vị trí khác

Sau đó có thể suy ra:

*   Mở rộng sang trái
*   Mở rộng sang phải
*   Tạo từ một đường đi
*   Kiểm tra xem một vị trí có phải tổ tiên của vị trí khác không
*   Kiểm tra xem một vị trí có phải hậu duệ của vị trí khác không

Sự phân biệt này là lựa chọn thiết kế, không phải sự thật siêu hình. Hãy ưu tiên tập nguyên thủy nhỏ giúp phát biểu định luật và các cách diễn giải khác dễ dàng.

## Một phép thử hữu ích {#a-useful-test}

Trước khi đưa vào giao diện lập trình, hãy hoàn thành các câu sau:

*   Các giá trị của lớp trừu tượng này có ý nghĩa là ...
*   Các quan sát nguyên thủy là ...
*   Các phép hợp thành có ý nghĩa là ...
*   Hai giá trị tương đương khi ...
*   Mọi cách triển khai phải bảo toàn ...
*   Lớp trừu tượng này chủ ý lược bỏ ...

Nếu không thể hoàn thành các câu này, thêm cơ chế triển khai sẽ không bù đắp được ý nghĩa còn thiếu.
