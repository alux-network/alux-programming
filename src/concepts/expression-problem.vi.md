<!-- reader: {"title":"Bài toán biểu thức"} -->

# Bài toán biểu thức {#expression-problem}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](../denotational-design/design.md), [Ngữ nghĩa và tính hợp thành](../denotational-design/denotations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Các đại số năng lực](../rust-dd/capability-algebras.md), [Ý nghĩa suy ra và phép hợp thành](../rust-dd/derived-meaning.md)  
Nhận định: [Bài toán biểu thức trở lại](../insights/expression-problem.md)
```

```admonish note title="Vị trí ngữ nghĩa"
Bài toán biểu thức liên quan đến việc mở rộng mô-đun các cách biểu diễn và phép toán. Thiết kế theo ngữ nghĩa đặt ra sớm hơn một câu hỏi: ngay từ đầu, từ vựng ngữ nghĩa và những cách diễn giải nào đáng được biểu diễn?
```

Bài toán biểu thức của Phil Wadler nói về việc mở rộng **đồng thời** một ngôn ngữ theo hai chiều mà không chỉnh sửa mã hiện có:

*   **Thêm biến thể dữ liệu** (dạng biểu thức mới, còn gọi là “cú pháp”).
*   **Thêm phép toán mới** (cách diễn giải mới, còn gọi là “ngữ nghĩa”).

Mâu thuẫn cốt lõi:

*   Theo phong cách **hàm/ADT**, thêm phép toán mới thì dễ, nhưng thêm biến thể mới lại xâm lấn.
*   Theo phong cách **hướng đối tượng**, thêm biến thể mới thì dễ, nhưng thêm phép toán mới lại xâm lấn.

Phần này minh họa cả hai phía bằng các ví dụ Haskell và Java nhỏ.

## Haskell (hàm / ADT) {#haskell-functional--adt}

Ta bắt đầu với một ADT kinh điển cho biểu thức và hai phép toán.

```haskell
data Expr
  = Lit Int
  | Add Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
```

Giờ đây, **thêm phép toán mới** thật dễ dàng:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

Nhưng **thêm biến thể mới** (ví dụ `Mul`) buộc phải sửa mọi hàm:

```haskell
data Expr
  = Lit Int
  | Add Expr Expr
  | Mul Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b
eval (Mul a b)   = eval a * eval b  -- ✏️ UPDATE: new case

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
pretty (Mul a b) = "(" ++ pretty a ++ " * " ++ pretty b ++ ")"  -- ✏️ UPDATE: new case

size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
size (Mul a b) = 1 + size a + size b  -- ✏️ UPDATE: new case
```

Theo cách diễn đạt của Wadler, trong hướng ADT, **mở rộng dữ liệu không có tính mô-đun**.

## Java (hướng đối tượng) {#java-object-oriented}

Ta bắt đầu với một giao diện và các lớp cụ thể cho từng biến thể.

```java
// Expression variants
interface Expr {
    int eval();
    String pretty();
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) {
        this.n = n;
    }

    public int eval() {
        return n;
    }

    public String pretty() {
        return Integer.toString(n);
    }
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() + b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " + " + b.pretty() + ")";
    }
}
```

Giờ đây, **thêm biến thể mới** thật dễ dàng:

```java
final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() * b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " * " + b.pretty() + ")";
    }
}
```

Nhưng **thêm phép toán mới** (ví dụ `size`) lại xâm lấn. Bạn phải sửa giao diện và mọi lớp:

```java
interface Expr {
    int eval();
    String pretty();
    int size(); // ✏️ UPDATE: new operation added here
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) { this.n = n; }

    public int eval() { return n; }
    public String pretty() { return Integer.toString(n); }
    public int size() { return 1; } // ✏️ UPDATE: new method in every class
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() + b.eval(); }
    public String pretty() { return "(" + a.pretty() + " + " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}

final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() * b.eval(); }
    public String pretty() { return "(" + a.pretty() + " * " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}
```

Theo cách diễn đạt của Wadler, trong hướng OO, **mở rộng phép toán không có tính mô-đun**.

## Tóm tắt (ý của Wadler) {#summary-wadlers-point}

*   Phong cách hàm/ADT thuận lợi cho **phép toán mới** nhưng không thuận lợi cho **biến thể mới**.
*   Phong cách OO thuận lợi cho **biến thể mới** nhưng không thuận lợi cho **phép toán mới**.
*   Bài toán biểu thức tìm kiếm thiết kế cho phép mở rộng **cả hai** chiều mà không chỉnh sửa mã hiện có.

## Cách giải thích của Wadler và bức tranh các giải pháp (1998) {#wadlers-explanation-and-solution-landscape-1998}

Wadler mô tả bài toán là: mở rộng một kiểu dữ liệu **bằng các trường hợp** (biến thể mới) và mở rộng **các hàm trên kiểu dữ liệu đó** (phép toán mới), *mà không biên dịch lại mã hiện có*, đồng thời giữ được **tính an toàn kiểu tĩnh** (không ép kiểu).

Ông dùng phép ẩn dụ “bảng”:

*   **Hàng** = các trường hợp (biến thể / cấu trúc tạo)
*   **Cột** = hàm (phép toán / cách diễn giải)

Trong bối cảnh **hàm/ADT**, các hàng cố định còn dễ thêm cột.  
Trong bối cảnh **OO**, các cột cố định còn dễ thêm hàng.  
Thách thức là làm cho **cả hai hướng** đều mở rộng được.

## Giải pháp Wadler đề xuất (GJ + kiểu ảo) {#wadlers-proposed-solution-gj--virtual-types}

Wadler trình bày giải pháp trong GJ (Generic Java), sử dụng:

*   Tham số có cận `This` (`This extends LangF<This>`) để mô phỏng **ThisType**.
*   **Các lớp và giao diện bên trong** được đánh chỉ mục theo `This` (kiểu ảo).
*   A visitor-based structure that allows:
    *   Các trường hợp mới (ví dụ `Plus`) bằng cách phân lớp “họ ngôn ngữ”
    *   Các phép toán mới (ví dụ `Show`) bằng cách thêm visitor mới

Mẹo là tham chiếu đến `This.Exp` và `This.Visitor` sao cho mỗi giai đoạn mở rộng vẫn an toàn kiểu và có thể biên dịch độc lập.

### Lưu ý (giao diện bên trong của Java) {#caveat-java-inner-interfaces}

Wadler lưu ý rằng Java xem giao diện bên trong là **tĩnh**, làm hỏng thủ thuật đánh chỉ mục.  
Ông đề xuất nới lỏng hạn chế này để giải pháp khả thi; điều đó vẫn chưa thay đổi trong Java hiện đại (giao diện lồng nhau vẫn mặc định là tĩnh).

## Các hướng giải pháp khác được nhắc đến {#other-solution-directions-mentioned}

1.  Cách tiếp cận của Corky Cartwright Cần **mở rộng phản biến**: cho phép kiểu biểu thức cơ sở thay thế kiểu đã mở rộng. Điều này giải thích vì sao dùng điểm bất động: họ ngôn ngữ mở rộng *không phải* kiểu con của họ gốc.
    
2.  Cách tiếp cận của Kim Bruce Cần **bộ dựng kiểu bậc cao** (tham số hóa một kiểu theo bộ dựng kiểu). GJ không hỗ trợ trực tiếp điều này, nhưng Wadler lập luận kiểu ảo có thể mô phỏng nó.
    
3.  Krishnamurthi và cộng sự (mẫu Extended Visitor) Hoạt động nhờ thiết kế visitor mở rộng. **Không có kiểu tĩnh** trong ngữ cảnh của họ (Pizza), nên cần ép kiểu động.
    
4.  Phần mở rộng ngôn ngữ chuyên biệt Wadler dẫn hai giải pháp dựa vào tính năng ngôn ngữ được thiết kế riêng cho bài toán. Chúng kém tổng quát hơn cách tiếp cận kiểu ảo.
    

## Hai luận điểm của Wadler {#wadlers-two-points}

Email của Wadler làm rõ hai điểm:

1.  Bài toán biểu thức là **mâu thuẫn cấu trúc** giữa việc mở rộng dữ liệu và mở rộng phép toán.
2.  Solutions are possible, but they tend to require either:
    *   Các tính năng hệ kiểu mô phỏng **kiểu ảo**, hoặc
    *   Các phần mở rộng ngôn ngữ chuyên dụng, hoặc
    *   Sự thỏa hiệp về tính an toàn kiểu tĩnh hoặc biên dịch độc lập.

## Giải pháp Featherweight Go (2020) {#featherweight-go-solution-2020}

Wadler đưa ra và đặt tên cho bài toán vào năm 1998. Về sau, Featherweight Go (FG) và phần mở rộng tổng quát FGG (Featherweight Generic Go) đưa ra giải pháp cụ thể hoàn toàn tĩnh trong một ngôn ngữ kiểu Go với giao diện cấu trúc và generic.

Giải pháp trong bài báo (Hình 8, dạng giản lược) có hai cấu trúc, `Num` và `Plus`, cùng hai phép toán, `Eval` và `String`:

```go
type Evaler interface { Eval() int }
type Stringer interface { String() string }

type Num struct { value int }
type Plus(type a Any) struct { left a; right a }

func (e Num) Eval() int { return e.value }
func (e Plus(type a Evaler)) Eval() int { return e.left.Eval() + e.right.Eval() }

func (e Num) String() string { return fmt.Sprintf("%d", e.value) }
func (e Plus(type a Stringer)) String() string {
    return fmt.Sprintf("(%s+%s)", e.left.String(), e.right.String())
}

type Expr interface { Evaler; Stringer }

var e Expr = Plus(Expr){Num{1}, Num{2}}
```

Cơ chế:

*   **Biểu diễn đệ quy tổng quát.** Các nút con của `Plus` có tham số kiểu `a` chỉ bị giới hạn bởi `Any`. Cấu trúc không bị gắn với một giao diện đóng liệt kê mọi phép toán, nên vẫn có thể thêm phép toán về sau.
*   **Ràng buộc riêng cho từng phép toán.** Mỗi khai báo phương thức đặt cận độc lập cho `a`: `Plus(type a Evaler)` cho `Eval`, `Plus(type a Stringer)` cho `String`. Điều này dựa vào *bộ nhận hiệp biến* của FGG: cận bộ nhận của phương thức có thể mạnh hơn cận trong khai báo kiểu.
*   **Giao diện cấu trúc.** Một cấu trúc triển khai giao diện chỉ cần có các phương thức của giao diện, nên có thể khai báo `Expr` sau `Num` và `Plus` mà không đụng đến chúng. Tập phép toán đầy đủ chỉ được cố định tại nơi tạo giá trị (`Plus(Expr){...}`).

Các trường hợp mới là cấu trúc mới; các phép toán mới là giao diện và phương thức mới. Không điều nào đòi hỏi thay đổi hoặc biên dịch lại khai báo hiện có, và cũng không cần khẳng định kiểu.

## Tài liệu tham khảo {#references}

*   Wadler, P. (1998). *The Expression Problem*. Ghi chú trên danh sách thư Java-Genericity. Nêu công thức và đặt tên cho bài toán.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. và Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Một giải pháp ngôn ngữ cụ thể về sau, Mục 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
