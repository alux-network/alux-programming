<!-- reader: {"title":"Expression Problem再考"} -->

# Expression Problem再考 {#expression-problem-reloaded}

```admonish tip title="関連項目"
意味論的な見方：[Denotational Design](../denotational-design/design.md)  
Rustで意味から設計する：[ケイパビリティ代数](../rust-dd/capability-algebras.md)、[導出される意味と合成](../rust-dd/derived-meaning.md)、[インタープリターと副作用](../rust-dd/interpreters.md)  
概念：[Expression Problem](../concepts/expression-problem.md)
```

このページでは、既存コードを何度も書き直さずに、新しい式形式と新しい操作を追加する方法である*Expression Problem*に対し、トレイトを使った実践的な解決策を示します。設計は**Conal流**、符号化は**tagless-final／オブジェクト代数方式**です。具体的には、まず合成可能な意味（小さなケイパビリティインターフェースと拡張レベルのプログラム仕様）を定め、その後に具体的なインタープリターを提供します。具体的な符号化は、Oleg Kiselyovの**tagless-final**形式や**オブジェクト代数**と同じ系統です。コンストラクターインターフェース（`LitAlg`、`AddAlg`、`MulAlg`）が言語のシグネチャを定め、プログラムをこれらのインターフェースに対して多相的に記述し、具体実装（`Eval`や`Pretty`など）が解釈を与えます。これにより、閉じた一つのASTに決め打ちせず、静的型付けと二つの軸の拡張性を保てます。

Olegの方法は明示的に表示に基づいています。まず合成可能な意味を割り当て、その後に副作用やインタープリターをモジュール式の意味論層として実現します。Expression Problemに対してDenotational Designと歩調が合うのは、偶然ではなく、この理由によるものです。ConalのDenotational Designも、まず合成的に意味を定め、具体的な実行戦略は後から交換可能なものとして扱うという優先順位を明示します。

式言語の例では、次のように符号化します。

*   **コンストラクターの語彙**を小さく独立した代数トレイトで表す。
*   **解釈**を、それらのトレイトの実装で表す。
*   新しい構文を追加すると新しいトレイトが加わり、既存コードは変更しない。
*   新しい意味論を追加すると新しいインタープリター型が加わり、既存コードは変更しない。

`lit`と`add`は意味論的操作であり、特権的なASTのコンストラクターではありません。ASTは複数ある解釈の一つです。

```admonish example title="C#におけるオブジェクト代数"
この符号化はRust固有ではありません。[`object-algebras`](https://github.com/tgrospic/object-algebras)ではC#でこのパターンを発展させ、ここで使う固定担体を越えて抽象化します。このページでは各インタープリターが平易な具体型である`Self::Expr`を選びます。一方C#の代数では、型*コンストラクター*`F`（`FunctorAlg<F>`、`MonadAlg<F>`、`BankingDsl<F>`）を抽象化し、不正な`F<a>`の代わりに結果を`App<F, a>`として持ち運びます。

C#に第一級の高カインド型はないため、`App<F, a>`が適用`F(a)`の代わりとなり、inject／projectラッパーを通じて実現します。この`App`トリックはまさに[デファンクショナライズ](../concepts/defunctionalization.md)です。言語で表現できない抽象化を一階データにし、必要に応じて適用します。Rustにも第一級の高カインド型がないため、同じ制約があります。
```

## 小さな構文ケイパビリティを定める {#specify-tiny-syntax-capabilities}

各コンストラクターを小さなトレイトにします。これが<strong>仕様（spec）</strong>です。

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

プログラムを代数トレイト上の**拡張**として記述します。これらの拡張も仕様の一部であり、小さな仕様を組み合わせて再利用可能なプログラムレベルの仕様にします。

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

`#[ext(...)]`は[`extend`クレートのマクロ](https://docs.rs/extend/latest/extend/)で、`impl`ブロックから拡張メソッドを生成して定型コードを減らします。Rustの新しい言語機能ではありません。

## 新しい解釈を追加する {#add-new-interpretation}

インタープリターが仕様を実装します。構文を変更する必要はありません。

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

同じ式を別の方法で解釈できます。

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## 新しい構文を追加する（新しいケイパビリティトレイト） {#add-new-syntax-new-capability-trait}

`Mul`を追加するには、新しいトレイトを定義します。既存コードは変更しません。

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

既存のインタープリターは古い式で引き続き動作します。  
新しい構文が必要なら、新しいトレイトを実装します。

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

## Expression Problemをどう解決するか {#why-this-solves-the-expression-problem}

従来のExpression Problemは、表現に関する二つの軸を扱います。

*   新しいバリアント（ケース）を追加する
*   新しい操作を追加する

Denotational Designは、軸を次のように捉え直します。

*   **意味論上の語彙を拡張する**：新しいケイパビリティトレイト（`MulAlg`）を定義する。
*   その語彙に対する**新しい解釈を追加する**：新しいインタープリター型（`Eval`、`Pretty`、ASTビルダー、コード生成器など）を定義する。

二つの軸は独立して合成できます。

*   新しいケイパビリティが必要でない限り、既存プログラムは変更しません。`expr_basic`が必要とするのは`LitAlg + AddAlg`だけです。
*   新しいケイパビリティを解釈する必要がない限り、既存インタープリターは変更しません。`impl MulAlg`を持たない`Eval`でも、`mul`を使わないすべてのプログラムを引き続き実行できます。

実装の組み合わせ表そのものがなくなるわけではありません。`Eval`と`Pretty`の両方で`mul`を解釈する必要があるなら、それぞれに`impl MulAlg`が要ります。変わるのは表の整理の仕方です。各セルは*意味論的操作×解釈*となり、特権的な表現を中心に整理せず、各プログラムは使うケイパビリティだけに依存します。

## 法則は仕様に属する {#laws-belong-to-the-specification}

意味論的代数は、担体、操作、法則で構成されます。担体（`type Expr`）は解釈が選び、操作と法則は仕様に属します。たとえば、`LitAlg + AddAlg`の算術上の意味は次のように述べます。

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval`はこの法則を満たします。`Pretty`は満たしません。`"(2 + 3)"`は`"5"`ではないからです。どちらも構文シグネチャの有効なインタープリターですが、算術仕様のモデルとなるのは`Eval`だけです。法則はトレイトに対して一度だけ述べ、それを満たすインタープリターを選びます。どのインタープリターも法則を所有しません。

## 最後の洞察：Featherweight GoとDenotational Design {#final-insight-featherweight-go-vs-denotational-design}

Wadlerは、静的型付けとモジュール式の拡張のもとで、行と列をどう扱うかという言語機構の水準でExpression Problemを捉えました。[Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020)は具体策を与えます。`Plus(type a Any)`では再帰表現をジェネリックに保ち、各操作が`a`を個別に制約します（`Eval`には`Plus(type a Evaler)`、`String`には`Plus(type a Stringer)`）。表現を一つの閉じた式インターフェースに結び付けないため、両方の軸を開いたままにできます。

従来の解決策では、表現から出発して二つの拡張軸を開いたままにする方法を問います。Featherweight Goは、再帰表現をジェネリックかつ構造的に拡張可能にして、この問題を驚くほどのところまで解決します。Denotational Designは境界を一歩手前へ移します。表現がモデルではありません。モデルは代数とその法則であり、表現は考えられる解釈の一つです。

**Featherweight Goは表現を拡張可能にし、Denotational Designは表現を任意にする。**

|  | Featherweight Go | Denotational Design |
| --- | --- | --- |
| 意味論上の中心 | 拡張可能な表現 | 代数と法則 |
| `Num`/`Plus`, `lit`/`add` | 構造（表現形式） | 意味論的操作 |
| `Eval`, `String`/`Pretty` | メソッドとインターフェース | 解釈 |
| 再帰構造 | ジェネリックで開かれた表現（`Plus(a)`） | 不要 |
| 担体 | 表現される式の型 | インタープリターが選ぶ（`type Expr`） |
| AST | 表現が中心のまま | 任意。複数ある解釈の一つ |
| 表のセル | ケース×操作→メソッド | 意味論的操作×解釈→`impl` |
| 新しい振る舞い | メソッドとインターフェースを追加する | ケイパビリティを追加または合成する |
| 新しい実装 | 新たな構造的実現 | 新しいインタープリター |

Wadlerは、表現の両方の軸をどう拡張するかを問います。Denotational Designは、そもそも表現がいずれかの軸を所有すべきなのかを問います。

まず合成可能な意味を定め、それから符号化を選びます。Expression Problemは、概念的な行き詰まりではなく、符号化の間で行うエンジニアリング上の選択になります。

**言語の意味は機械という考えから独立しているべきである。**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>言語の意味は機械から独立しているべきである</figcaption></figure>

## 参考文献 {#references}

*   Elliott, C. *Denotational design with type class morphisms*。  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *Compiling to categories*。  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *Tagless-final形式*（final形式の符号化と拡張可能な型付きインタープリターに関する概説、チュートリアル、論文）。  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *Having an Effect*（副作用と拡張可能なインタープリターの定義的／表示的な考察）。  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P., Yoshida, N.（2020）。*Featherweight Go*。Proc. ACM Program. Lang. 4（OOPSLA）。第2.3節では、上で比較したジェネリックな構造的解決策を示しています。  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S.、Cook, W. R.（2012）。*Extensibility for the Masses: Practical Extensibility with Object Algebras*。  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
