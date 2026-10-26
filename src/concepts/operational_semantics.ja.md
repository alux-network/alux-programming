<!-- reader: {"title":"操作的意味論"} -->

# 操作的意味論 {#operational-semantics}

```admonish tip title="関連項目"
意味論的な見方：[Denotational Design](../denotational-design/design.md)  
Rustで意味から設計する：[言語とコンパイラーパイプライン](../rust-dd/compiler-pipelines.md)  
概念：[自由モナド](free_monad.md)、[継続渡し形式](cps.md)、[関数のデファンクショナライズ](defunctionalization.md)  
洞察：[意味論から機械へ](../insights/operational_semantics.md)
```

## 定義 {#definition}

**操作的意味論**は、評価判断または**構成**間の遷移によってプログラムの振る舞いを記述します。構成には、プログラム断片と環境、ストア、継続、その他の抽象機械状態を含める場合があります。

この記述は数学的なもので、どの評価や遷移が妥当かを述べます。インタープリターや仮想マシンがその規則を実装することはありますが、特定の実装自体が定義になるわけではありません。

```admonish note title="意味論上の位置付け"
操作的意味論は正確な意味論であり、単なる非形式的な実装詳細ではありません。評価規則または遷移規則によって振る舞いを説明します。[Denotational Design](../denotational-design/design.md)はそれを補う、より先行する設計上の問いを立てます。すなわち、どのような合成可能な意味と等式を、その規則に保持させるかです。
```

## 操作的意味論の形式 {#styles-of-operational-semantics}

### 小ステップ意味論（構造的操作意味論） {#small-step-structural-operational-semantics}

計算を原子的な遷移に分解します。

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

並行性、インターリーブ、部分実行のモデル化に有用です。

### 大ステップ意味論（自然意味論） {#big-step-natural-semantics}

最終結果を使って評価を記述する。

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

停止するプログラムについて推論する際に、明快なことが多い。

## 形式規則 {#formal-rules}

操作的意味論は通常、**推論規則**で表されます。簡単な算術言語なら、次のようになります。

$$ E ::= n \mid E + E $$

左から右への評価には、三つの規則が必要です。

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

最初の二つの規則は、次に簡約できる部分式を選びます。三つ目は、両方のオペランドが値になった後で加算を行います。

評価トレース：

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## なぜ重要か {#why-it-matters}

*   実行について、**機械を厳密に模したモデル**を提供する。
*   インタープリターと仮想マシンの基盤となる。
*   正しさ、リソース使用、安全性に関する推論を支える。

## ほかの概念との関係 {#relation-to-other-concepts}

*   **自由モナド**は命令構文と逐次実行を提供します。その表現で書かれたプログラムの評価は、操作規則で記述できます。
*   **CPS**は、計算の残りを継続として明示します。値がその継続へ渡される様子は、操作規則で記述できます。
*   **デファンクショナライズ**は既知の関数族を一階データに置き換え、`apply`操作を明示します。生成された機械状態は、操作規則で記述できます。

これらは操作的意味論を与えられる対象や変換であり、それ自体が操作的意味論なのではありません。

## 実践での利用 {#in-practice}

操作規則を使うと、インタープリターを導き、照合のための厳密なモデルを提供できます。

*   **EVM**は小ステップの状態遷移系として自然にモデル化できます。一方、停止する実行全体は大ステップの判断でも関連付けられます。
*   小ステップ規則は、Rustインタープリターの`match`アームとよく対応することがあります。

$$ n_1 + n_2 \to n_3 $$

左から右への関係全体は、次のRustコードで表現できます。

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

この関数は遷移を一度だけ実行します。繰り返し適用すると表示されたトレースになり、`None`を返す場合は式がすでに値になっています。

## 操作上の問いと表示上の問い {#operational-and-denotational-questions}

操作規則を使うと、安全性、進行性、リソース境界、実装との対応関係を証明できます。意図された抽象的な意味を決める前に操作機構を選ぶと、実装上の選択が意図しない意味論上の約束になるおそれがあります。

Denotational Designは操作的意味論を否定しません。先に意味論的領域、合成、法則を明示し、その後で操作モデルとの関係を定めます。

| 観点 | 問い |
| --- | --- |
| 表示上 | プログラム全体は何を意味するか。 |
| 操作上 | どのような遷移で評価されるか。 |
| 正しさ | その遷移は意図された意味を保つか。 |

次のクリップでは、操作上の記述だけを洞察のよりどころにする危険性を取り上げます。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作上の記述だけでは意味の全体を捉えられない（1/2）</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作上の記述だけでは意味の全体を捉えられない（2/2）</figcaption></figure>
