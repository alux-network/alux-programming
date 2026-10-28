<!-- reader: {"title":"Bài toán biểu thức trở lại","sourceHash":"sha256:c0c35ab091b01a221419f7a315cdd37146fc4858d3335fa406996ecadc3148e8"} -->

# Bài toán biểu thức trở lại {#expression-problem-reloaded}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](../denotational-design/design.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md), [Ý nghĩa suy ra và phép hợp thành](../rust-dd/derived-meaning.md), [Bộ diễn giải và hiệu ứng](../rust-dd/interpreters.md)  
Khái niệm: [Bài toán biểu thức](../concepts/expression-problem.md)
```

Trang này trình bày giải pháp thực tiễn dựa trên đặc trưng cho *Bài toán biểu thức*: làm sao thêm dạng biểu thức và phép toán mới mà không phải liên tục viết lại mã hiện có. Thiết kế của giải pháp theo phong cách **Conal**, còn cách mã hóa thuộc kiểu **tagless-final/đại số đối tượng**. Cụ thể, trước hết ta đặc tả ý nghĩa hợp thành (các giao diện năng lực nhỏ và đặc tả chương trình ở cấp phần mở rộng), rồi mới cung cấp các bộ diễn giải cụ thể. Cách mã hóa cụ thể thuộc cùng họ với phong cách **tagless-final** của Oleg Kiselyov và **đại số đối tượng**: giao diện cấu trúc (`LitAlg`, `AddAlg`, `MulAlg`) định nghĩa chữ ký ngôn ngữ, chương trình được viết đa hình dựa trên các giao diện đó, còn các cách triển khai cụ thể như `Eval` hoặc `Pretty` cung cấp cách diễn giải. Nhờ vậy, không cần cam kết với một AST đóng duy nhất mà vẫn giữ được kiểu tĩnh và khả năng mở rộng theo cả hai chiều.

Cách tiếp cận của Oleg tường minh mang tính ngữ nghĩa chỉ định: trước hết gán ý nghĩa hợp thành, rồi hiện thực hóa hiệu ứng/bộ diễn giải thành các lớp ngữ nghĩa mô-đun. Với Bài toán biểu thức, vì vậy sự tương hợp với Thiết kế theo ngữ nghĩa là có chủ ý chứ không phải ngẫu nhiên. Cách trình bày Thiết kế theo ngữ nghĩa của Conal nêu trực tiếp cùng ưu tiên: trước hết đặc tả ý nghĩa theo tính hợp thành, còn chiến lược thực thi cụ thể là thứ yếu và có thể thay thế.

Với ví dụ ngôn ngữ biểu thức, cách mã hóa này có nghĩa:

*   **Từ vựng cấu trúc tạo** được mô hình hóa thành các đặc trưng đại số nhỏ, độc lập.
*   **Các cách diễn giải** là những cách triển khai các đặc trưng đó.
*   Cú pháp mới bổ sung đặc trưng mới mà không đụng đến mã cũ.
*   Ngữ nghĩa mới bổ sung kiểu bộ diễn giải mới mà không đụng đến mã cũ.

`lit` và `add` là các phép toán ngữ nghĩa, không phải cấu trúc tạo của một AST được ưu tiên. AST chỉ là một cách diễn giải trong số nhiều cách.

```admonish example title="Đại số đối tượng trong C#"
Cách mã hóa này không riêng cho Rust. [`object-algebras`](https://github.com/tgrospic/object-algebras) phát triển mẫu này trong C# và vượt qua đối tượng mang cố định dùng ở đây. Trên trang này, mỗi bộ diễn giải chọn một `Self::Expr` cụ thể, tức kiểu thông thường. Thay vào đó, đại số C# trừu tượng hóa trên *bộ dựng* kiểu `F` — `FunctorAlg<F>`, `MonadAlg<F>`, `BankingDsl<F>` — mang kết quả dưới dạng `App<F, a>` thay cho `F<a>` bất hợp lệ.

C# không có kiểu bậc cao hạng nhất, vì vậy `App<F, a>` thay mặt cho phép áp dụng `F(a)`, được khôi phục qua các lớp bọc inject/project. Mẹo `App` này chính là [phi chức năng hóa](../concepts/defunctionalization.md): phép trừu tượng mà ngôn ngữ không thể biểu đạt được chuyển thành dữ liệu bậc nhất để áp dụng khi cần. Rust cũng chạm cùng giới hạn — ngôn ngữ này cũng thiếu kiểu bậc cao hạng nhất.
```

## Đặc tả các năng lực cú pháp nhỏ {#specify-tiny-syntax-capabilities}

Mỗi cấu trúc tạo trở thành một đặc trưng nhỏ. Đây là **đặc tả**.

```rust,noplayground
trait LitAlg {
    type Expr;

    fn lit(&self, n: i64) -> Self::Expr;
}

trait AddAlg {
    type Expr;

    fn add(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}
```

Chương trình được viết dưới dạng **phần mở rộng** trên các đặc trưng đại số; phần mở rộng này cũng là một phần của đặc tả và kết hợp các đặc tả nhỏ thành đặc tả chương trình có thể tái sử dụng:

```rust,noplayground
#[ext(name = ExprPrograms)]
impl<This> This
where
    This: LitAlg + AddAlg,
{
    fn expr_basic(&self) -> This::Expr {
        self.add(self.lit(2), self.lit(3))
    }
}
```

`#[ext(...)]` là macro từ crate [`extend`](https://docs.rs/extend/latest/extend/), dùng để giảm mã khuôn mẫu bằng cách tạo phương thức mở rộng từ khối `impl`; đây không phải tính năng mới của ngôn ngữ Rust.

## Thêm cách diễn giải mới {#add-new-interpretation}

Bộ diễn giải triển khai đặc tả. Không cần thay đổi cú pháp.

```rust,noplayground
struct Eval;

impl LitAlg for Eval {
    type Expr = i64;

    fn lit(&self, n: i64) -> i64 { n }
}

impl AddAlg for Eval {
    type Expr = i64;

    fn add(&self, a: i64, b: i64) -> i64 { a + b }
}

struct Pretty;

impl LitAlg for Pretty {
    type Expr = String;

    fn lit(&self, n: i64) -> String { n.to_string() }
}

impl AddAlg for Pretty {
    type Expr = String;

    fn add(&self, a: String, b: String) -> String {
        format!("({a} + {b})")
    }
}
```

Giờ cùng biểu thức có thể được diễn giải theo cách khác:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## Thêm cú pháp mới (đặc trưng năng lực mới) {#add-new-syntax-new-capability-trait}

Để thêm `Mul`, hãy định nghĩa đặc trưng mới. Mã hiện có vẫn nguyên vẹn.

```rust,noplayground
trait MulAlg {
    type Expr;

    fn mul(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}

#[ext(name = ExprProgramsMul)]
impl<This> This
where
    This: LitAlg + AddAlg + MulAlg,
{
    fn expr_with_mul(&self) -> This::Expr {
        self.mul(self.add(self.lit(2), self.lit(3)), self.lit(4))
    }
}
```

Các bộ diễn giải hiện có vẫn hoạt động với biểu thức cũ.  
Nếu muốn hỗ trợ cú pháp mới, chúng triển khai đặc trưng mới:

```rust,noplayground
impl MulAlg for Eval {
    type Expr = i64;

    fn mul(&self, a: i64, b: i64) -> i64 { a * b }
}

impl MulAlg for Pretty {
    type Expr = String;

    fn mul(&self, a: String, b: String) -> String {
        format!("({a} * {b})")
    }
}
```

## Vì sao cách này giải quyết Bài toán biểu thức {#why-this-solves-the-expression-problem}

Bài toán biểu thức truyền thống có hai trục trên một cách biểu diễn:

*   thêm biến thể mới (trường hợp)
*   thêm phép toán mới

Thiết kế theo ngữ nghĩa diễn đạt lại hai trục:

*   **Mở rộng từ vựng ngữ nghĩa**: định nghĩa đặc trưng năng lực mới (`MulAlg`).
*   **Thêm cách diễn giải mới** cho từ vựng đó: định nghĩa kiểu bộ diễn giải mới (`Eval`, `Pretty`, bộ dựng AST hoặc bộ sinh mã).

Hai trục hợp thành độc lập:

*   Chương trình hiện có không thay đổi trừ khi chúng cần năng lực mới. `expr_basic` vẫn chỉ yêu cầu `LitAlg + AddAlg`.
*   Bộ diễn giải hiện có không thay đổi trừ khi chúng chọn diễn giải năng lực mới. `Eval` không có `impl MulAlg` vẫn chạy mọi chương trình không dùng đến `mul`.

Cách này không loại bỏ ma trận triển khai. Nếu `Eval` và `Pretty` đều cần diễn giải `mul` thì cả hai đều cần `impl MulAlg`. Điều thay đổi là cách tổ chức ma trận: mỗi ô là *phép toán ngữ nghĩa × cách diễn giải*, không ô nào xoay quanh cách biểu diễn được ưu tiên, và mỗi chương trình chỉ phụ thuộc vào các năng lực nó sử dụng.

## Định luật thuộc về đặc tả {#laws-belong-to-the-specification}

Đại số ngữ nghĩa gồm đối tượng mang, phép toán và định luật. Đối tượng mang (`type Expr`) do cách diễn giải chọn; phép toán và định luật thuộc về đặc tả. Chẳng hạn, ý nghĩa số học của `LitAlg + AddAlg` phát biểu:

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval` thỏa mãn định luật này. `Pretty` thì không: `"(2 + 3)"` không bằng `"5"`. Cả hai đều là bộ diễn giải hợp lệ cho chữ ký cú pháp, nhưng chỉ `Eval` là mô hình của đặc tả số học. Định luật được phát biểu một lần dựa trên các đặc trưng và quyết định bộ diễn giải nào đạt yêu cầu. Không bộ diễn giải nào sở hữu nó.

## Nhận định cuối: Featherweight Go và Thiết kế theo ngữ nghĩa {#final-insight-featherweight-go-vs-denotational-design}

Wadler chẩn đoán Bài toán biểu thức ở cấp cơ chế ngôn ngữ: hàng và cột dưới ràng buộc kiểu tĩnh và khả năng mở rộng mô-đun. [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020) đưa ra giải pháp cụ thể: `Plus(type a Any)` giữ biểu diễn đệ quy ở dạng tổng quát, còn từng phép toán đặt ràng buộc riêng lên `a` (`Plus(type a Evaler)` cho `Eval`, `Plus(type a Stringer)` cho `String`). Cách biểu diễn không bị gắn với một giao diện biểu thức đóng, nên cả hai trục vẫn mở.

Các giải pháp truyền thống bắt đầu từ cách biểu diễn rồi hỏi làm sao mở cả hai trục mở rộng. Featherweight Go đẩy ý tưởng này đi khá xa khi làm cho biểu diễn đệ quy tổng quát và có thể mở rộng theo cấu trúc. Thiết kế theo ngữ nghĩa đẩy ranh giới sớm hơn một bước: biểu diễn không phải mô hình. Mô hình là đại số và các định luật của nó; biểu diễn là một cách diễn giải khả dĩ.

**Featherweight Go giúp mở rộng cách biểu diễn. Thiết kế theo ngữ nghĩa khiến biểu diễn trở thành tùy chọn.**

|  | Featherweight Go | Thiết kế theo ngữ nghĩa |
| --- | --- | --- |
| Trung tâm ngữ nghĩa | biểu diễn có thể mở rộng | đại số và định luật |
| `Num`/`Plus`, `lit`/`add` | cấu trúc (dạng biểu diễn) | phép toán ngữ nghĩa |
| `Eval`, `String`/`Pretty` | phương thức và giao diện | cách diễn giải |
| Cấu trúc đệ quy | biểu diễn tổng quát, mở (`Plus(a)`) | không bắt buộc |
| Đối tượng mang | kiểu biểu thức được biểu diễn | do bộ diễn giải chọn (`type Expr`) |
| AST | biểu diễn vẫn là trung tâm | tùy chọn, là một trong nhiều cách diễn giải |
| Ô ma trận | trường hợp × phép toán → phương thức | phép toán ngữ nghĩa × cách diễn giải → `impl` |
| Hành vi mới | thêm phương thức và giao diện | thêm hoặc hợp thành năng lực |
| Cách triển khai mới | các hiện thực hóa cấu trúc mới | bộ diễn giải mới |

Wadler hỏi cách mở rộng cả hai trục của một cách biểu diễn. Thiết kế theo ngữ nghĩa hỏi vì sao cách biểu diễn phải sở hữu trục nào trong hai trục.

Trước hết định nghĩa ý nghĩa hợp thành, rồi chọn cách mã hóa. Bài toán biểu thức trở thành lựa chọn kỹ thuật giữa các cách mã hóa, chứ không còn là bế tắc khái niệm.

**Ý nghĩa của ngôn ngữ cần độc lập với khái niệm máy móc.**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Ý nghĩa của ngôn ngữ cần độc lập với máy móc</figcaption></figure>

## Tài liệu tham khảo {#references}

*   Elliott, C. *Denotational design with type class morphisms*.  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *Compiling to categories*.  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *Tagless-final style* (tổng quan, hướng dẫn và bài viết về mã hóa final và bộ diễn giải có kiểu mở rộng).  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *Having an Effect* (cách trình bày hiệu ứng theo hướng định nghĩa/ngữ nghĩa chỉ định và bộ diễn giải mở rộng).  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. và Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Mục 2.3 trình bày giải pháp cấu trúc tổng quát được so sánh ở trên.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S. và Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
