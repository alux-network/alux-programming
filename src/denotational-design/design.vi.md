<!-- reader: {"title":"Thiết kế theo ngữ nghĩa","sourceHash":"sha256:bac0e12637b9f63a8fa1002e44ca58f04237a81e1bc18da343cf22e360a85e8e"} -->

# Thiết kế theo ngữ nghĩa {#denotational-design}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Ngữ nghĩa và tính hợp thành](denotations.md), [Định luật và cách diễn giải](laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md), [Ý nghĩa suy ra và phép hợp thành](../rust-dd/derived-meaning.md)
```

```admonish note title="Ý tưởng cốt lõi"
Thiết kế theo ngữ nghĩa suy ra giao diện lập trình từ các ý nghĩa đơn giản, có thể hợp thành và độc lập với triển khai, để ngữ nghĩa dẫn dắt thiết kế thay vì chỉ mô tả giao diện sau khi đã tạo ra.
```

Thiết kế theo ngữ nghĩa là phương pháp suy ra giao diện lập trình từ các ý nghĩa đơn giản, có thể hợp thành và độc lập với cách triển khai.

Phương pháp này do [Conal Elliott](http://conal.net/) phát triển và đặt tên. Bước cốt lõi không chỉ là gán ngữ nghĩa cho một ngôn ngữ hay API có sẵn, mà là để ngữ nghĩa dẫn dắt chính việc thiết kế API.

## Vòng lặp thiết kế {#the-design-loop}

Thực hiện theo thứ tự này:

1.  Chọn miền ngữ nghĩa.
2.  Xác định cấu trúc quan trọng trong miền đó.
3.  Chọn tập từ vựng nhỏ gồm các phép toán nguyên thủy.
4.  Suy ra các phép toán hữu ích bằng tính hợp thành.
5.  Phát biểu các định luật mà những phép toán đó tuân theo.
6.  Chọn một hoặc nhiều cách biểu diễn.
7.  Triển khai các cách diễn giải bảo toàn cấu trúc.
8.  Thẩm định chúng bằng định luật, mô hình và tình huống.

Thiết kế ưu tiên biểu diễn thường bắt đầu ở bước 6 rồi cố khôi phục các bước 1–5 sau đó.

## Thiết kế đại số nhánh {#designing-a-branch-algebra}

Hãy quay lại các vị trí nhánh. Ý nghĩa mong muốn là một đường đi hữu hạn trong cấu trúc phân nhánh nhị phân.

Một đại số nguyên thủy có thể là:

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

Ánh xạ từng phần $\rightharpoonup$ có nghĩa là chỉ tồn tại phép quan sát đường đi khi nhánh thứ nhất là tổ tiên của nhánh thứ hai.

Từ đó có các phép toán hữu ích:

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

Đại số này không nhắc đến vectơ, số nguyên, phân số, khóa cơ sở dữ liệu hay byte. Những lựa chọn đó được quyết định sau.

## Cấu trúc trước sự tiện lợi {#structure-before-convenience}

Tập từ vựng nguyên thủy cần làm lộ rõ cấu trúc mà mã phía sau phụ thuộc vào. Nó không nên là tập hợp mọi phương thức tiện lợi có trong một cách triển khai.

````admonish warning title="Loại bỏ các phép toán nguyên thủy ưu tiên biểu diễn"
Đặc trưng này gộp cách sắp xếp lưu trữ, vị trí cấu hình, biểu diễn bit và quy trình công việc kết hợp. Nó không tách riêng ý nghĩa của nhánh:

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

API ngữ nghĩa vẫn có thể bao gồm hiệu ứng nếu hiệu ứng thuộc miền được chọn. Quy tắc không phải là “mọi thứ đều phải thuần”. Quy tắc là “mọi phép toán nguyên thủy phải nêu một ý nghĩa mạch lạc”.

## Mã hóa không phải phương pháp {#encoding-is-not-methodology}

Thiết kế theo ngữ nghĩa không đòi hỏi:

*   Haskell
*   mã hóa tagless-final
*   đại số đối tượng
*   monad tự do
*   một AST duy nhất
*   chỉ dùng hàm thuần
*   thuật ngữ lý thuyết phạm trù trong mọi API

Những thứ này có thể là cách mã hóa hoặc công cụ giải thích hữu ích. Không thứ nào định nghĩa phương pháp.

```admonish note title="Các cách mã hóa trong Rust"
Trong Rust, đặc trưng nhỏ, kiểu liên kết, phương thức mở rộng, hàm tổng quát và giá trị chương trình bậc nhất là các cách mã hóa thực tiễn. Giá trị của chúng tùy thuộc vào việc chúng có bảo toàn thiết kế ngữ nghĩa rõ ràng hay không.
```

## Ánh xạ đồng cấu của lớp kiểu {#type-class-morphisms}

Một cách hiểu phương pháp này là qua các ánh xạ bảo toàn cấu trúc.

Giả sử một giao diện mô tả đại số ngữ nghĩa. Cách triển khai ánh xạ các giá trị và phép toán trừu tượng vào một cách biểu diễn cụ thể. Cách triển khai hợp lệ phải bảo toàn các phép toán và định luật liên quan.

Nếu `encode` ánh xạ các nhánh trừu tượng vào một đối tượng mang cụ thể, thì tính bảo toàn phép mở rộng có dạng:

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

Cách triển khai không chỉ là tập hợp phương thức có tên tương ứng. Nó được kỳ vọng là một đồng cấu tôn trọng cấu trúc đại số.

## Thế nào là một trừu tượng hóa tốt {#what-counts-as-a-good-abstraction}

Một phép trừu tượng hóa DD tốt có một số đặc tính:

*   Các giá trị có ý nghĩa dự định đơn giản.
*   Các phép toán nguyên thủy bộc lộ những quan sát hoặc kiến tạo ngữ nghĩa.
*   Hành vi phức tạp hơn được suy ra từ các phép toán nguyên thủy đó.
*   Các định luật không phụ thuộc vào một cách biểu diễn duy nhất.
*   Các cách triển khai độc lập có thể diễn giải nó.
*   Chi tiết vận hành chỉ xuất hiện khi chúng trở nên liên quan.

Chỉ nhỏ gọn thôi thì chưa đủ. Một đặc trưng bé xíu chỉ phơi bày `get_manager()` vẫn ưu tiên biểu diễn. Một đại số lớn hơn có thể hợp lý khi các phép toán của nó tạo thành một cấu trúc ngữ nghĩa nhất quán.

## Giá trị ngữ nghĩa và đối tượng mang trừu tượng {#semantic-values-and-abstract-carriers}

Không phải mọi kiểu cụ thể đều bị cấm trong đặc tả.

Dùng kiểu liên kết khi bộ diễn giải cần chọn đối tượng mang:

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

Dùng kiểu cụ thể khi nó là từ vựng ngữ nghĩa ổn định:

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

Sự phân biệt không phải “trừu tượng tốt, cụ thể xấu”, mà là giữa từ vựng ngữ nghĩa và cách biểu diễn máy tình cờ được chọn.

## Đặc tả chính là ngữ nghĩa chỉ định, và không nhất thiết phải thực thi {#the-specification-is-the-denotation-and-it-need-not-execute}

Đặc tả chính là ngữ nghĩa chỉ định: ý nghĩa toán học được gán cho từng cấu trúc. Sức mạnh của nó đến từ việc không bị ràng buộc bởi hiệu năng, thậm chí bởi khả năng thực thi.

```admonish quote title="Conal Elliott"
Việc định nghĩa ngữ nghĩa chỉ định thường dễ dàng và khai sáng hơn nhiều so với việc triển khai, vì nó không bị ràng buộc hay phân tâm bởi hiệu năng, thậm chí bởi khả năng thực thi.

— [Denotational Design: from meanings to programs (LambdaJam 2015)](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

Ví dụ kinh điển là FRP (Lập trình phản ứng hàm): một `Behavior a` được định nghĩa như hàm theo thời gian liên tục,

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

Mô hình đó chính xác nhưng không thể thực thi — ta không thể liệt kê các số thực. Tương tự, chương trình có thể biểu thị một tập kết quả; cả hai mô hình đều không chạy được, và đó chính là chủ ý. Ý nghĩa được chọn vì sự đơn giản và chính xác, chứ không phải cách tính toán.

Khả năng thực thi và hiệu năng được đẩy hoàn toàn sang *cách triển khai*, một tạo phẩm riêng được bảo đảm tính đúng đắn bằng các định luật đồng cấu (đồng cấu lớp kiểu) liên hệ nó với ý nghĩa: hàm ý nghĩa phải ánh xạ mỗi phép hợp thành cú pháp sang phép hợp thành ngữ nghĩa tương ứng. Như Conal diễn đạt, ngữ nghĩa chỉ định đưa ra “định nghĩa rõ ràng *về chính xác điều cần triển khai*, đồng thời để lại nhiều không gian sáng tạo về *cách thực hiện*.”

Trong Rust, một số tạo phẩm thể hiện các phần của đặc tả này, và có tạo phẩm tình cờ thực thi được. Khả năng thực thi chỉ là thuộc tính phụ; nó không khiến chúng trở thành đặc tả:

*   văn xuôi nêu ý nghĩa dự định
*   đặc trưng nêu các phép toán nguyên thủy có sẵn
*   phần mở rộng nêu các phép suy ra
*   định luật nêu các đẳng thức bắt buộc
*   bộ diễn giải chứng minh khả năng hiện thực hóa
*   kiểm thử cung cấp bằng chứng hữu hạn

Hãy đọc chúng cùng nhau, đặt ý nghĩa và định luật cao hơn cơ chế cụ thể về mặt thẩm quyền.

## Đọc thêm {#further-reading}

*   [Denotational Design: from programs to meanings (BayHac 2014)](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [Denotational design with type class morphisms](http://conal.net/papers/type-class-morphisms/)
*   [Các bài viết và bài nói chuyện của Conal Elliott](http://conal.net/)
