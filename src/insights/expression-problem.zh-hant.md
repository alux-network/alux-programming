<!-- reader: {"title":"重新審視表示式問題","sourceHash":"sha256:c0c35ab091b01a221419f7a315cdd37146fc4858d3335fa406996ecadc3148e8"} -->

# 重新審視表示式問題 {#expression-problem-reloaded}

```admonish tip title="相關內容"
語義視角：[指稱設計](../denotational-design/design.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)、[派生含義與組合](../rust-dd/derived-meaning.md)、[直譯器與效應](../rust-dd/interpreters.md)  
概念：[表示式問題](../concepts/expression-problem.md)
```

本頁介紹一種基於 trait 的實用解法來處理*表示式問題*：如何新增新的表示式形式與操作，而不必反覆重寫現有程式碼。 該解法的設計**遵循 Conal 風格**，編碼方式則採用**無標籤最終編碼/物件代數**。具體而言，我們先規定可組合含義（小型能力介面與擴充層面的程式規範），再提供具體直譯器。這種編碼與 Oleg Kiselyov 的**無標籤最終**風格及**物件代數**屬於同一型別：構造器介面（`LitAlg`、`AddAlg`、`MulAlg`）定義語言簽名，程式以多型方式針對這些介面編寫，具體實作（例如`Eval`或`Pretty`）則提供解釋。這樣既避免繫結到某個封閉 AST，又保留了兩個維度上的靜態型別與可擴充性。

Oleg 的方法明確採用指稱式設計：先賦予可組合含義，再將效應與直譯器實現為模組化語義層。對於表示式問題而言，這正是它與指稱設計契合的原因，而非偶然。Conal 對指稱設計的表述也明確提出相同優先順序：先以組合方式規定含義，再將具體執行策略視為次要且可替換的部分。

對於表示式語言示例，這種編碼意味著：

*   **構造器詞彙**由小型、獨立的代數 trait 建模。
*   **解釋**是這些 trait 的實作。
*   新語法會新增新 trait，而不觸碰舊程式碼。
*   新語義會新增新的直譯器型別，而不觸碰舊程式碼。

`lit`與`add`是語義操作，而非特權 AST 的構造器。AST 只是多種解釋中的一種。

```admonish example title="C# 中的物件代數"
這種編碼並非 Rust 特有。[`object-algebras`](https://github.com/tgrospic/object-algebras)在 C# 中發展了這一模式，並突破了本頁採用的固定載體。在本頁中，每個直譯器會選擇一個具體的`Self::Expr`普通型別。而 C# 代數會抽象出一個型別*構造器*`F`——`FunctorAlg<F>`、`MonadAlg<F>`、`BankingDsl<F>`——並將結果作為`App<F, a>`承載，而不是採用不合法的`F<a>`。

C# 沒有一等高階型別，因此以`App<F, a>`代替應用`F(a)`，並透過注入/投影包裝器還原。這種`App`技巧正是[去函式化](../concepts/defunctionalization.md)：語言無法表達的抽象被轉為一階資料，並在需要時應用。Rust 也遇到了同樣的限制——它同樣缺少一等高階型別。
```

## 規定小型語法能力 {#specify-tiny-syntax-capabilities}

每種構造器都會成為一個小型 trait。這就是**規範**。

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

程式以代數 trait 之上的**擴充**形式編寫。這些擴充也屬於規範，並可將較小規範組合為可複用的程式級規範：

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

`#[ext(...)]`是來自[`extend`crate 的宏](https://docs.rs/extend/latest/extend/)，用於從`impl`塊中生成擴充方法以減少樣板程式碼；它不是新的 Rust 語言特性。

## 新增新的解釋 {#add-new-interpretation}

直譯器實作規範，無需修改語法。

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

現在，同一個表示式可以有不同的解釋：

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## 新增新語法（新能力 trait） {#add-new-syntax-new-capability-trait}

要新增`Mul`，只需定義一個新 trait。現有程式碼保持不變。

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

現有直譯器仍可處理舊表示式。  
如果它們需要支援新語法，就實作新 trait：

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

## 為什麼這能解決表示式問題 {#why-this-solves-the-expression-problem}

傳統表示式問題包含表示上的兩個維度：

*   新增新的變體（分支）
*   新增新操作

指稱設計重新詮釋了這兩個維度：

*   **擴充語義詞彙**：定義新的能力 trait（`MulAlg`）。
*   **為該詞彙新增新的解釋**：定義新的直譯器型別（`Eval`、`Pretty`、AST 構造器或程式碼生成器）。

這兩個維度可以獨立組合：

*   除非需要新能力，否則現有程式無需修改。`expr_basic`仍然只要求`LitAlg + AddAlg`。
*   除非選擇解釋新能力，否則現有直譯器無需修改。`Eval`即使沒有`impl MulAlg`，仍可執行所有不使用`mul`的程式。

這並沒有消除實作矩陣。如果`Eval`與`Pretty`都需要解釋`mul`，二者都需要`impl MulAlg`。變化在於矩陣的組織方式：每個單元格都是*語義操作 × 解釋*；沒有任何單元格圍繞特權表示組織；每個程式只依賴自己使用的能力。

## 定律屬於規範 {#laws-belong-to-the-specification}

語義代數由載體、操作與定律構成。載體（`type Expr`）由解釋選擇；操作與定律則屬於規範。例如，算術含義`LitAlg + AddAlg`規定：

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval`滿足這條定律。`Pretty`則不滿足：`"(2 + 3)"`並不等於`"5"`。二者都是語法簽名的有效解釋，但只有`Eval`才是算術規範的模型。這條定律只需針對 trait 陳述一次，並由它決定哪些直譯器符合要求。它不屬於任何直譯器。

## 最終洞見：輕量級 Go 與指稱設計 {#final-insight-featherweight-go-vs-denotational-design}

Wadler 在語言機制層面診斷了表示式問題：靜態型別與模組化擴充下的行列問題。[輕量級 Go](../concepts/expression-problem.md#featherweight-go-solution-2020)給出了一種具體解法：`Plus(type a Any)`保持遞迴表示的泛型性，並讓每種操作獨立約束`a`（`Plus(type a Evaler)`對應`Eval`，`Plus(type a Stringer)`對應`String`）。表示不會繫結到某個封閉表示式介面，因此兩個維度都保持開放。

傳統解法從表示出發，思考如何開放兩個擴充維度。輕量級 Go 將這一點推進得出人意料地遠：它讓遞迴表示具有泛型性與結構可擴充性。指稱設計則將邊界提前了一步：表示並非模型。模型是代數及其定律；表示只是可能的解釋之一。

**輕量級 Go 讓表示可以擴充。指稱設計讓表示成為可選項。**

|  | 輕量級 Go | 指稱設計 |
| --- | --- | --- |
| 語義核心 | 可擴充表示 | 代數與定律 |
| `Num`/`Plus`, `lit`/`add` | 結構（表示形式） | 語義操作 |
| `Eval`, `String`/`Pretty` | 方法與介面 | 解釋 |
| 遞迴結構 | 泛型、開放表示（`Plus(a)`） | 無需遞迴表示 |
| 載體 | 所表示的表示式型別 | 由直譯器選擇（`type Expr`） |
| AST | 表示仍居於核心 | 可選，是多種解釋之一 |
| 矩陣單元格 | 分支 × 操作 → 方法 | 語義操作 × 解釋 → `impl` |
| 新行為 | 新增方法與介面 | 新增或組合能力 |
| 新實作 | 新的結構實現 | 新的直譯器 |

Wadler 詢問如何擴充表示的兩個維度。指稱設計則詢問為什麼表示應當掌握這兩個維度。

先定義可組合含義，再選擇編碼。這樣，表示式問題就成為編碼之間的工程選擇，而不再是概念上的死結。

**語言的含義應獨立於機器這一概念。**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>語言的含義應獨立於機器</figcaption></figure>

## 參考文獻 {#references}

*   Elliott, C. *《藉助型別類態射進行指稱設計》*。  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *《編譯到範疇》*。  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *《無標籤最終風格》*（關於最終編碼與可擴充型別直譯器的概覽、教程與論文）。  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *《擁有一種效應》*（對效應與可擴充直譯器的定義式/指稱式闡述）。  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. 與 Yoshida, N.（2020）。*《輕量級 Go》*。ACM Program. Lang. 4（OOPSLA）。第 2.3 節給出了上文比較的泛型結構化解法。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S. 與 Cook, W. R.（2012）。*《面向大眾的可擴充性：借助物件代數實現實用的可擴充設計》*。  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
