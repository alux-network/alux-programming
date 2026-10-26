<!-- reader: {"title":"表示式問題"} -->

# 表示式問題 {#expression-problem}

```admonish tip title="相關內容"
語義視角：[指稱設計](../denotational-design/design.md)、[指稱與組合性](../denotational-design/denotations.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)、[派生含義與組合](../rust-dd/derived-meaning.md)  
洞見：[重新審視表示式問題](../insights/expression-problem.md)
```

```admonish note title="語義定位"
表示式問題關注表示與操作的模組化擴充。指稱設計則更早地提出一個問題：哪些語義詞彙與解釋值得表示？
```

Phil Wadler 提出的表示式問題關注如何在兩個維度上**同時**擴充語言，而無須修改現有程式碼：

*   **新增新的資料變體**（新的表示式形式，也稱“語法”）。
*   **新增新的操作**（新的解釋，也稱“語義”）。

核心矛盾：

*   採用**函式式/代數資料型別**風格時，新增新操作很容易，但新增新變體會造成侵入式修改。
*   採用**物件導向**風格時，新增新變體很容易，但新增新操作會造成侵入式修改。

本節用簡短的 Haskell 與 Java 示例展示兩面。

## Haskell（函式式/代數資料型別） {#haskell-functional--adt}

先從一個經典的表示式代數資料型別及兩種操作開始。

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

現在，**新增新操作**很容易：

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

但**新增新變體**（例如`Mul`）就要求修改每個函式：

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

用 Wadler 的說法，在代數資料型別方法中，**資料擴充不具備模組化特性**。

## Java（物件導向） {#java-object-oriented}

先從一個介面以及每種變體對應的具體類開始。

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

現在，**新增新變體**很容易：

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

但**新增新操作**（例如`size`）則具有侵入性。你必須修改介面與每個類：

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

用 Wadler 的說法，在物件導向方法中，**操作擴充不具備模組化特性**。

## 總結（Wadler 的觀點） {#summary-wadlers-point}

*   函式式/代數資料型別風格傾向於**新增新操作**，但不利於**新增新變體**。
*   物件導向風格傾向於**新增新變體**，但不利於**新增新操作**。
*   表示式問題要求找到一種設計，使**兩個**維度都能擴充，而不必修改現有程式碼。

## Wadler 的解釋與解決方案概覽（1998） {#wadlers-explanation-and-solution-landscape-1998}

Wadler 將問題表述為：擴充資料型別**的分支**（新變體），並擴充**該資料型別上的函式**（新操作），同時*不重新編譯現有程式碼*，且保留**靜態型別安全**（無需型別轉換）。

他用“表格”作比喻：

*   **行** = 分支（變體/構造器）
*   **列** = 函式（操作/解釋）

在**函式式/代數資料型別**環境中，行固定而列易於新增。  
在**物件導向**環境中，列固定而行易於新增。  
挑戰在於讓**兩個方向**都可擴充。

## Wadler 提出的解決方案（GJ + 虛擬型別） {#wadlers-proposed-solution-gj--virtual-types}

Wadler 使用 GJ（泛型 Java）提出一種方案，其中包括：

*   使用`This`有界引數（`This extends LangF<This>`）模擬**ThisType**。
*   **內部類與介面**按`This`索引（虛擬型別）。
*   A visitor-based structure that allows:
    *   透過繼承“語言族”來新增新分支（例如`Plus`）
    *   透過新增新存取者來增加操作（例如`Show`）

訣竅在於引用`This.Exp`與`This.Visitor`，使每個擴充階段都保持型別安全且可以獨立編譯。

### 注意事項（Java 內部介面） {#caveat-java-inner-interfaces}

Wadler 指出，Java 會將內部介面視為**靜態的**，因此破壞了索引技巧。  
他認為放寬這一限制就能使方案可行；但現代 Java 仍未改變這一點（巢狀介面依舊隱式為靜態）。

## 提及的其他解決方向 {#other-solution-directions-mentioned}

1.  Corky Cartwright 的方法 要求**逆變擴充**：允許基礎表示式型別替代擴充型別。 這解釋了為何要使用不動點：擴充語言族*不是*原型別的子型別。
    
2.  Kim Bruce 的方法 要求使用**高階型別構造器**（將型別構造器作為引數的型別引數化方式）。 GJ 不直接支援這一特性，但 Wadler 認為可以用虛擬型別模擬。
    
3.  Krishnamurthi 等人（擴充存取者模式） 透過擴充存取者設計實現。 在他們的 Pizza 環境中**缺少靜態型別**，因此需要動態型別轉換。
    
4.  專用語言擴充 Wadler 提到了兩種依賴於專為該問題設計的語言特性的方案。 它們不如虛擬型別方案通用。
    

## Wadler 的兩點總結 {#wadlers-two-points}

Wadler 的郵件清楚地說明了兩點：

1.  表示式問題是資料擴充與操作擴充之間的**結構性矛盾**。
2.  Solutions are possible, but they tend to require either:
    *   可模擬**虛擬型別**的型別系統特性，或
    *   專用語言擴充，或
    *   對靜態型別安全或獨立編譯作出妥協。

## 輕量級 Go 方案（2020） {#featherweight-go-solution-2020}

Wadler 於 1998 年提出並命名了這一問題。之後，輕量級 Go（FG）及其泛型擴充 FGG（輕量級泛型 Go）在一種類似 Go、採用結構化介面與泛型的語言中，給出了具體且完全靜態的解決方案。

論文中的方案（圖 8，簡化版）包含兩個結構`Num`與`Plus`，以及兩個操作`Eval`與`String`：

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

其機制如下：

*   <strong>泛型遞迴表示。</strong>`Plus`的子項具有一個型別引數`a`，其唯一約束為`Any`。該結構不繫結到列出所有操作的封閉介面，因此後續仍可新增操作。
*   <strong>針對操作的約束。</strong>每個方法宣告都會獨立約束`a`：`Plus(type a Evaler)`用於`Eval`，`Plus(type a Stringer)`用於`String`。這依賴於 FGG 的*協變接收者*：方法接收者的約束可以比型別宣告中的約束更強。
*   <strong>結構化介面。</strong>結構只要具有介面的方法就算實作了該介面，因此可以在不修改`Expr`和`Num`的情況下，於之後引入`Plus`。只有在構造值時，才需要確定完整的操作集合（`Plus(Expr){...}`）。

新分支只需增加新結構；新操作只需增加新介面與方法。二者都不需要修改或重新編譯現有宣告，也無需型別斷言。

## 參考文獻 {#references}

*   Wadler, P.（1998）。*《表示式問題》*。Java-Genericity 郵件列表說明。提出並命名了該問題。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. 與 Yoshida, N.（2020）。*《輕量級 Go》*。ACM Program. Lang. 4（OOPSLA）。後續的具體語言方案，見第 2.3 節。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
