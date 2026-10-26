<!-- reader: {"title":"重新审视表达式问题"} -->

# 重新审视表达式问题 {#expression-problem-reloaded}

```admonish tip title="相关内容"
语义视角：[指称设计](../denotational-design/design.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)、[派生含义与组合](../rust-dd/derived-meaning.md)、[解释器与效应](../rust-dd/interpreters.md)  
概念：[表达式问题](../concepts/expression-problem.md)
```

本页介绍一种基于 trait 的实用解法来处理*表达式问题*：如何添加新的表达式形式与操作，而不必反复重写现有代码。 该解法的设计**遵循 Conal 风格**，编码方式则采用**无标签最终编码/对象代数**。具体而言，我们先规定可组合含义（小型能力接口与扩展层面的程序规范），再提供具体解释器。这种编码与 Oleg Kiselyov 的**无标签最终**风格及**对象代数**属于同一类型：构造器接口（`LitAlg`、`AddAlg`、`MulAlg`）定义语言签名，程序以多态方式针对这些接口编写，具体实现（例如`Eval`或`Pretty`）则提供解释。这样既避免绑定到某个封闭 AST，又保留了两个维度上的静态类型与可扩展性。

Oleg 的方法明确采用指称式设计：先赋予可组合含义，再将效应与解释器实现为模块化语义层。对于表达式问题而言，这正是它与指称设计契合的原因，而非偶然。Conal 对指称设计的表述也明确提出相同优先级：先以组合方式规定含义，再将具体执行策略视为次要且可替换的部分。

对于表达式语言示例，这种编码意味着：

*   **构造器词汇**由小型、独立的代数 trait 建模。
*   **解释**是这些 trait 的实现。
*   新语法会添加新 trait，而不触碰旧代码。
*   新语义会添加新的解释器类型，而不触碰旧代码。

`lit`与`add`是语义操作，而非特权 AST 的构造器。AST 只是多种解释中的一种。

```admonish example title="C# 中的对象代数"
这种编码并非 Rust 特有。[`object-algebras`](https://github.com/tgrospic/object-algebras)在 C# 中发展了这一模式，并突破了本页采用的固定载体。在本页中，每个解释器会选择一个具体的`Self::Expr`普通类型。而 C# 代数会抽象出一个类型*构造器*`F`——`FunctorAlg<F>`、`MonadAlg<F>`、`BankingDsl<F>`——并将结果作为`App<F, a>`承载，而不是采用不合法的`F<a>`。

C# 没有一等高阶类型，因此以`App<F, a>`代替应用`F(a)`，并通过注入/投影包装器还原。这种`App`技巧正是[去函数化](../concepts/defunctionalization.md)：语言无法表达的抽象被转为一阶数据，并在需要时应用。Rust 也遇到了同样的限制——它同样缺少一等高阶类型。
```

## 规定小型语法能力 {#specify-tiny-syntax-capabilities}

每种构造器都会成为一个小型 trait。这就是**规范**。

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

程序以代数 trait 之上的**扩展**形式编写。这些扩展也属于规范，并可将较小规范组合为可复用的程序级规范：

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

`#[ext(...)]`是来自[`extend`crate 的宏](https://docs.rs/extend/latest/extend/)，用于从`impl`块中生成扩展方法以减少样板代码；它不是新的 Rust 语言特性。

## 添加新的解释 {#add-new-interpretation}

解释器实现规范，无需修改语法。

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

现在，同一个表达式可以有不同的解释：

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## 添加新语法（新能力 trait） {#add-new-syntax-new-capability-trait}

要添加`Mul`，只需定义一个新 trait。现有代码保持不变。

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

现有解释器仍可处理旧表达式。  
如果它们需要支持新语法，就实现新 trait：

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

## 为什么这能解决表达式问题 {#why-this-solves-the-expression-problem}

传统表达式问题包含表示上的两个维度：

*   添加新的变体（分支）
*   添加新操作

指称设计重新诠释了这两个维度：

*   **扩展语义词汇**：定义新的能力 trait（`MulAlg`）。
*   **为该词汇添加新的解释**：定义新的解释器类型（`Eval`、`Pretty`、AST 构造器或代码生成器）。

这两个维度可以独立组合：

*   除非需要新能力，否则现有程序无需修改。`expr_basic`仍然只要求`LitAlg + AddAlg`。
*   除非选择解释新能力，否则现有解释器无需修改。`Eval`即使没有`impl MulAlg`，仍可运行所有不使用`mul`的程序。

这并没有消除实现矩阵。如果`Eval`与`Pretty`都需要解释`mul`，二者都需要`impl MulAlg`。变化在于矩阵的组织方式：每个单元格都是*语义操作 × 解释*；没有任何单元格围绕特权表示组织；每个程序只依赖自己使用的能力。

## 定律属于规范 {#laws-belong-to-the-specification}

语义代数由载体、操作与定律构成。载体（`type Expr`）由解释选择；操作与定律则属于规范。例如，算术含义`LitAlg + AddAlg`规定：

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval`满足这条定律。`Pretty`则不满足：`"(2 + 3)"`并不等于`"5"`。二者都是语法签名的有效解释，但只有`Eval`才是算术规范的模型。这条定律只需针对 trait 陈述一次，并由它决定哪些解释器符合要求。它不属于任何解释器。

## 最终洞见：轻量级 Go 与指称设计 {#final-insight-featherweight-go-vs-denotational-design}

Wadler 在语言机制层面诊断了表达式问题：静态类型与模块化扩展下的行列问题。[轻量级 Go](../concepts/expression-problem.md#featherweight-go-solution-2020)给出了一种具体解法：`Plus(type a Any)`保持递归表示的泛型性，并让每种操作独立约束`a`（`Plus(type a Evaler)`对应`Eval`，`Plus(type a Stringer)`对应`String`）。表示不会绑定到某个封闭表达式接口，因此两个维度都保持开放。

传统解法从表示出发，思考如何开放两个扩展维度。轻量级 Go 将这一点推进得出人意料地远：它让递归表示具有泛型性与结构可扩展性。指称设计则将边界提前了一步：表示并非模型。模型是代数及其定律；表示只是可能的解释之一。

**轻量级 Go 让表示可以扩展。指称设计让表示成为可选项。**

|  | 轻量级 Go | 指称设计 |
| --- | --- | --- |
| 语义核心 | 可扩展表示 | 代数与定律 |
| `Num`/`Plus`, `lit`/`add` | 结构（表示形式） | 语义操作 |
| `Eval`, `String`/`Pretty` | 方法与接口 | 解释 |
| 递归结构 | 泛型、开放表示（`Plus(a)`） | 无需递归表示 |
| 载体 | 所表示的表达式类型 | 由解释器选择（`type Expr`） |
| AST | 表示仍居于核心 | 可选，是多种解释之一 |
| 矩阵单元格 | 分支 × 操作 → 方法 | 语义操作 × 解释 → `impl` |
| 新行为 | 添加方法与接口 | 添加或组合能力 |
| 新实现 | 新的结构实现 | 新的解释器 |

Wadler 询问如何扩展表示的两个维度。指称设计则询问为什么表示应当掌握这两个维度。

先定义可组合含义，再选择编码。这样，表达式问题就成为编码之间的工程选择，而不再是概念上的死结。

**语言的含义应独立于机器这一概念。**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>语言的含义应独立于机器</figcaption></figure>

## 参考文献 {#references}

*   Elliott, C. *《借助类型类态射进行指称设计》*。  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *《编译到范畴》*。  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *《无标签最终风格》*（关于最终编码与可扩展类型解释器的概览、教程与论文）。  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *《拥有一种效应》*（对效应与可扩展解释器的定义式/指称式阐述）。  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. 与 Yoshida, N.（2020）。*《轻量级 Go》*。ACM Program. Lang. 4（OOPSLA）。第 2.3 节给出了上文比较的泛型结构化解法。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S. 与 Cook, W. R.（2012）。*《面向大众的可扩展性：借助对象代数实现实用的可扩展设计》*。  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
