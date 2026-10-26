<!-- reader: {"title":"表达式问题","sourceHash":"sha256:095010cccfe7dcb155f2ad304d334ffd7d3d56212b3b67168e4f5b04da397ee6"} -->

# 表达式问题 {#expression-problem}

```admonish tip title="相关内容"
语义视角：[指称设计](../denotational-design/design.md)、[指称与组合性](../denotational-design/denotations.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)、[派生含义与组合](../rust-dd/derived-meaning.md)  
洞见：[重新审视表达式问题](../insights/expression-problem.md)
```

```admonish note title="语义定位"
表达式问题关注表示与操作的模块化扩展。指称设计则更早地提出一个问题：哪些语义词汇与解释值得表示？
```

Phil Wadler 提出的表达式问题关注如何在两个维度上**同时**扩展语言，而无须修改现有代码：

*   **添加新的数据变体**（新的表达式形式，也称“语法”）。
*   **添加新的操作**（新的解释，也称“语义”）。

核心矛盾：

*   采用**函数式/代数数据类型**风格时，添加新操作很容易，但添加新变体会造成侵入式修改。
*   采用**面向对象**风格时，添加新变体很容易，但添加新操作会造成侵入式修改。

本节用简短的 Haskell 与 Java 示例展示两面。

## Haskell（函数式/代数数据类型） {#haskell-functional--adt}

先从一个经典的表达式代数数据类型及两种操作开始。

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

现在，**添加新操作**很容易：

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

但**添加新变体**（例如`Mul`）就要求修改每个函数：

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

用 Wadler 的说法，在代数数据类型方法中，**数据扩展不具备模块化特性**。

## Java（面向对象） {#java-object-oriented}

先从一个接口以及每种变体对应的具体类开始。

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

现在，**添加新变体**很容易：

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

但**添加新操作**（例如`size`）则具有侵入性。你必须修改接口与每个类：

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

用 Wadler 的说法，在面向对象方法中，**操作扩展不具备模块化特性**。

## 总结（Wadler 的观点） {#summary-wadlers-point}

*   函数式/代数数据类型风格倾向于**添加新操作**，但不利于**添加新变体**。
*   面向对象风格倾向于**添加新变体**，但不利于**添加新操作**。
*   表达式问题要求找到一种设计，使**两个**维度都能扩展，而不必修改现有代码。

## Wadler 的解释与解决方案概览（1998） {#wadlers-explanation-and-solution-landscape-1998}

Wadler 将问题表述为：扩展数据类型**的分支**（新变体），并扩展**该数据类型上的函数**（新操作），同时*不重新编译现有代码*，且保留**静态类型安全**（无需类型转换）。

他用“表格”作比喻：

*   **行** = 分支（变体/构造器）
*   **列** = 函数（操作/解释）

在**函数式/代数数据类型**环境中，行固定而列易于添加。  
在**面向对象**环境中，列固定而行易于添加。  
挑战在于让**两个方向**都可扩展。

## Wadler 提出的解决方案（GJ + 虚拟类型） {#wadlers-proposed-solution-gj--virtual-types}

Wadler 使用 GJ（泛型 Java）提出一种方案，其中包括：

*   使用`This`有界参数（`This extends LangF<This>`）模拟**ThisType**。
*   **内部类与接口**按`This`索引（虚拟类型）。
*   A visitor-based structure that allows:
    *   通过继承“语言族”来添加新分支（例如`Plus`）
    *   通过添加新访问者来增加操作（例如`Show`）

诀窍在于引用`This.Exp`与`This.Visitor`，使每个扩展阶段都保持类型安全且可以独立编译。

### 注意事项（Java 内部接口） {#caveat-java-inner-interfaces}

Wadler 指出，Java 会将内部接口视为**静态的**，因此破坏了索引技巧。  
他认为放宽这一限制就能使方案可行；但现代 Java 仍未改变这一点（嵌套接口依旧隐式为静态）。

## 提及的其他解决方向 {#other-solution-directions-mentioned}

1.  Corky Cartwright 的方法 要求**逆变扩展**：允许基础表达式类型替代扩展类型。 这解释了为何要使用不动点：扩展语言族*不是*原类型的子类型。
    
2.  Kim Bruce 的方法 要求使用**高阶类型构造器**（将类型构造器作为参数的类型参数化方式）。 GJ 不直接支持这一特性，但 Wadler 认为可以用虚拟类型模拟。
    
3.  Krishnamurthi 等人（扩展访问者模式） 通过扩展访问者设计实现。 在他们的 Pizza 环境中**缺少静态类型**，因此需要动态类型转换。
    
4.  专用语言扩展 Wadler 提到了两种依赖于专为该问题设计的语言特性的方案。 它们不如虚拟类型方案通用。
    

## Wadler 的两点总结 {#wadlers-two-points}

Wadler 的邮件清楚地说明了两点：

1.  表达式问题是数据扩展与操作扩展之间的**结构性矛盾**。
2.  Solutions are possible, but they tend to require either:
    *   可模拟**虚拟类型**的类型系统特性，或
    *   专用语言扩展，或
    *   对静态类型安全或独立编译作出妥协。

## 轻量级 Go 方案（2020） {#featherweight-go-solution-2020}

Wadler 于 1998 年提出并命名了这一问题。之后，轻量级 Go（FG）及其泛型扩展 FGG（轻量级泛型 Go）在一种类似 Go、采用结构化接口与泛型的语言中，给出了具体且完全静态的解决方案。

论文中的方案（图 8，简化版）包含两个结构`Num`与`Plus`，以及两个操作`Eval`与`String`：

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

其机制如下：

*   <strong>泛型递归表示。</strong>`Plus`的子项具有一个类型参数`a`，其唯一约束为`Any`。该结构不绑定到列出所有操作的封闭接口，因此后续仍可添加操作。
*   <strong>针对操作的约束。</strong>每个方法声明都会独立约束`a`：`Plus(type a Evaler)`用于`Eval`，`Plus(type a Stringer)`用于`String`。这依赖于 FGG 的*协变接收者*：方法接收者的约束可以比类型声明中的约束更强。
*   <strong>结构化接口。</strong>结构只要具有接口的方法就算实现了该接口，因此可以在不修改`Expr`和`Num`的情况下，于之后引入`Plus`。只有在构造值时，才需要确定完整的操作集合（`Plus(Expr){...}`）。

新分支只需增加新结构；新操作只需增加新接口与方法。二者都不需要修改或重新编译现有声明，也无需类型断言。

## 参考文献 {#references}

*   Wadler, P.（1998）。*《表达式问题》*。Java-Genericity 邮件列表说明。提出并命名了该问题。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. 与 Yoshida, N.（2020）。*《轻量级 Go》*。ACM Program. Lang. 4（OOPSLA）。后续的具体语言方案，见第 2.3 节。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
