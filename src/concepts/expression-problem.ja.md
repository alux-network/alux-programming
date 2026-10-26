<!-- reader: {"title":"式問題"} -->

# 式問題 {#expression-problem}

```admonish tip title="関連項目"
意味論的な見方：[Denotational Design](../denotational-design/design.md)、[表示と合成性](../denotational-design/denotations.md)  
Rustで意味から設計する：[ケイパビリティ代数](../rust-dd/capability-algebras.md)、[導出される意味と合成](../rust-dd/derived-meaning.md)  
洞察：[Expression Problem再考](../insights/expression-problem.md)
```

```admonish note title="意味論上の位置付け"
Expression Problemは、表現と操作をモジュール式に拡張する問題です。Denotational Designは一つ手前の問いを立てます。そもそも、どの意味論上の語彙と解釈に表現する価値があるでしょうか。
```

Phil Wadlerのexpression problemは、既存コードを変更せずに言語を二つの軸で**同時に**拡張することを扱います。

*   **新しいデータのバリアント**（新しい式形式、すなわち「構文」）を追加する。
*   **新しい操作**（新しい解釈、すなわち「意味論」）を追加する。

中核となる緊張関係：

*   **関数型／ADT**のスタイルでは、新しい操作を追加しやすい一方、新しいバリアントを追加すると広範な変更が必要です。
*   **オブジェクト指向**のスタイルでは、新しいバリアントを追加しやすい一方、新しい操作を追加すると広範な変更が必要です。

この節では、HaskellとJavaの短い例で両面を示します。

## Haskell（関数型／ADT） {#haskell-functional--adt}

式と二つの操作を定義する、典型的なADTから始めます。

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

ここでは、**新しい操作を追加する**のは簡単です。

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

しかし、**新しいバリアント**（例：`Mul`）を追加すると、すべての関数を変更する必要があります。

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

Wadlerの言葉では、ADT方式では**データの拡張がモジュール式ではない**のです。

## Java（オブジェクト指向） {#java-object-oriented}

各バリアントのインターフェースと具体クラスから始めます。

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

ここでは、**新しいバリアントを追加する**のは簡単です。

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

しかし、**新しい操作**（例：`size`）の追加には広範な変更が必要です。インターフェースとすべてのクラスを変更しなければなりません。

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

Wadlerの言葉では、OO方式では**操作の拡張がモジュール式ではない**のです。

## まとめ（Wadlerの指摘） {#summary-wadlers-point}

*   関数型／ADT方式は、**新しい操作**を追加しやすい一方、**新しいバリアント**を追加しにくい。
*   OO方式は、**新しいバリアント**を追加しやすい一方、**新しい操作**を追加しにくい。
*   expression problemが求めるのは、既存コードを変更せずに**両方**の軸を拡張できる設計です。

## Wadlerによる説明と解決策の概要（1998） {#wadlers-explanation-and-solution-landscape-1998}

Wadlerはこの問題を、データ型の**ケースの追加**（新しいバリアント）と、そのデータ型を処理する**関数の拡張**（新しい操作）を、*既存コードを再コンパイルせず*、**静的な型安全性**（キャストなし）を保ちながら行うことと定義しています。

「表」のたとえを使います。

*   **行**＝ケース（バリアント／コンストラクター）
*   **列**＝関数（操作／解釈）

**関数型／ADT**の環境では、行が固定され、列を簡単に追加できます。  
**OO**の環境では、列が固定され、行を簡単に追加できます。  
課題は、**両方向**を拡張可能にすることです。

## Wadlerの提案した解決策（GJ＋virtual types） {#wadlers-proposed-solution-gj--virtual-types}

WadlerはGeneric Java（GJ）を使う解決策を提示しています。そこでは次のものを使います。

*   `This`境界付きパラメーター（`This extends LangF<This>`）によって**ThisType**を模倣する。
*   **内部クラスとインターフェース**は、`This`（virtual types）で添字付けされます。
*   A visitor-based structure that allows:
    *   「言語ファミリー」をサブクラス化して新しいケース（例：`Plus`）を追加する。
    *   新しいビジターを追加して新しい操作（例：`Show`）を加える。

各拡張段階で型安全性と個別コンパイルを保つには、`This.Exp`と`This.Visitor`を参照する方法が要点です。

### 注意点（Javaの内部インターフェース） {#caveat-java-inner-interfaces}

Wadlerは、Javaでは内部インターフェースが**static**として扱われ、添字付けの仕組みが崩れると指摘します。  
この制限を緩めれば解決策は実用可能になると提案していますが、現在のJavaでも変わっていません（ネストしたインターフェースは暗黙にstaticです）。

## 挙げられているほかの解決方針 {#other-solution-directions-mentioned}

1.  Corky Cartwrightの方法 **反変な拡張**が必要です。基底の式型を拡張後の型の代わりに使えるようにします。 拡張された言語ファミリーが元の言語のサブタイプ*ではない*ため、ここで不動点を使う理由を説明できます。
    
2.  Kim Bruceの方法 **高階型コンストラクター**（型コンストラクターを受け取る型パラメーター）が必要です。 GJはこれを直接サポートしませんが、Wadlerはvirtual typesで模倣できると論じています。
    
3.  Krishnamurthiら（拡張ビジターパターン） 拡張ビジター設計によって実現します。 彼らの環境（Pizza）では**静的に型付けされない**ため、動的キャストが必要です。
    
4.  特別目的の言語拡張 Wadlerは、この問題専用に設計された言語機能に依存する二つの解決策を挙げています。 virtual typesによる方法ほど一般的ではありません。
    

## Wadlerの二つの指摘 {#wadlers-two-points}

Wadlerのメールからは、二つの要点が明確に分かります。

1.  Expression Problemは、データの拡張と操作の拡張の間にある**構造的な緊張関係**です。
2.  Solutions are possible, but they tend to require either:
    *   **virtual types**を模倣する型システム機能
    *   特別目的の言語拡張
    *   静的型安全性または個別コンパイルに関する妥協

## Featherweight Goによる解決（2020） {#featherweight-go-solution-2020}

Wadlerは1998年に問題を定式化して命名しました。その後、Featherweight Go（FG）とそのジェネリクス拡張であるFGG（Featherweight Generic Go）が、構造的インターフェースとジェネリクスを持つGo風言語において、具体的かつ完全に静的な解決策を示しました。

論文の解決策（図8、簡略版）には、構造`Num`と`Plus`、操作`Eval`と`String`がそれぞれ二つあります。

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

仕組み：

*   <strong>ジェネリックな再帰表現。</strong>`Plus`の子要素は、`Any`だけを境界とする型パラメーター`a`を持ちます。すべての操作を列挙した一つの閉じたインターフェースに構造を結び付けないため、後から操作を追加できます。
*   <strong>操作ごとの制約。</strong>各メソッド宣言で`a`の境界を個別に定めます。`Eval`では`Plus(type a Evaler)`を、`String`では`Plus(type a Stringer)`を使います。FGGの*共変なレシーバー*に依存しており、型宣言にある境界より強い境界をメソッドのレシーバーに設定できます。
*   <strong>構造的インターフェース。</strong>構造体がインターフェースを実装するには、そのメソッドを備えていればよいため、既存の`Num`と`Plus`に触れずに後から`Expr`を導入できます。値の構築時（`Plus(Expr){...}`）に限って、操作一式が固定されます。

新しいケースは新しい構造体、新しい操作は新しいインターフェースとメソッドで追加できます。既存の宣言を変更したり再コンパイルしたりする必要はなく、型アサーションも不要です。

## 参考文献 {#references}

*   Wadler, P.（1998）。*The Expression Problem*。Java-Genericityメーリングリストへの投稿。問題の定式化と命名。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P., Yoshida, N.（2020）。*Featherweight Go*。Proc. ACM Program. Lang. 4（OOPSLA）。後年の具体的な言語解決策、第2.3節。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
