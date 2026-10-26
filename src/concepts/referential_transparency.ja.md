<!-- reader: {"title":"参照透過性"} -->

# 参照透過性 {#referential-transparency}

```admonish tip title="関連項目"
意味論的な見方：[表示と合成性](../denotational-design/denotations.md)、[法則と解釈](../denotational-design/laws-and-interpretations.md)  
洞察：[参照透過性再考](../insights/referential-transparency.md)
```

```admonish note title="意味論上の位置付け"
参照透過性は、選択した表示と等値性に依存します。式を置き換えても、意味論上の境界の内側で実装上の振る舞いが異なることはありますが、仕様で定めた意味が保たれるなら置換を認めます。
```

参照透過性（RT）とは、式の置換に関する性質です。式をその表示に置き換えても、プログラムの意味は変わりません。

今日の実践では、RTは等式による推論、安全なリファクタリング、法則に基づくAPI設計の基礎として使われています。

## 中核となる意味 {#core-meaning}

RTは次のように述べます。

*   `e`が`v`を表すなら、
*   `v`を`e`の代わりに使っても意味は保たれる。

これは意味論上の主張であり、コーディングスタイルの標語ではありません。

### 純粋性 {#purity}

純粋関数は、同じ入力に対して同じ出力を返し、観測可能な副作用を持ちません。RTは式に関する置換法則です。式をその表示に置き換えても意味が保たれなければなりません。そのため純粋性は、実践上RTを得る一般的な方法の一つであり、RTはより広い意味論上の基準です。DDにおける純粋性とRTの区別については、[参照透過性再考](../insights/referential-transparency.md)を参照してください。

## 歴史的背景 {#historical-context}

プログラミング言語の意味論では、RTはChristopher Stracheyの定式化と強く結び付いています。彼の考察では、値についての推論と更新を伴う振る舞いを分けています。

*   **R値**：式の値。
*   **L値**：代入できる場所。

要点は、値についての推論を保てば、式レベルの置換は安定しているということです。代入によって場所の更新が導入され、単純な置換による推論が難しくなったり、無効になったりします。

## ここでの代入と副作用の意味 {#what-assignment-and-side-effects-mean-here}

この文脈では：

*   **代入**とは場所を更新することです（例：`x := x + 1`）。
*   **副作用**とは、値を返すこと以外にある観測可能な変化です。

代入は特定の種類の副作用です。

これが多くの命令型環境でRTが成り立たない理由です。評価は、式の明示的な値のインターフェース外にある観測可能なコンテキストに依存したり、それを変更したりすることがあります。

## 現代の言語でRTをどう扱うか {#how-modern-languages-present-rt}

### Haskell {#haskell}

RTは純粋な式についての標準的な推論方法として教えられています。副作用は型付き構成（`IO`、状態の受け渡し、関連する抽象化など）で明示するため、日常的な利用で置換法則が中心的な役割を果たします。

### Scala（Cats／Cats Effect） {#scala-cats--cats-effect}

Scalaの関数型プログラミングでは、Cats Effectが一般的なRTの説明を提供します。

*   `IO[A]`は、副作用のある処理を純粋に記述する
*   `IO`値の合成にはRTが成り立つ
*   ランタイム境界（`unsafeRun*`）で実行を明示する

Cats Effectは即時の`Future`評価とも対比されます。そのため、ScalaでのRTの議論では遅延性と実行の先送りが強調されます。

## 今日のRT {#rt-today}

現代のエコシステム全体で、RTは置換しても安全な振る舞いを指す略称として使われています。 複数のパラダイムを組み合わせるシステムでは、コード全体に一律に適用せず、特定のモジュール、API、副作用を型で扱う領域にRTの主張を適用するのが一般的です。

RTをDenotational Designの観点から解釈する場合は、[参照透過性再考](../insights/referential-transparency.md)を参照してください。

## 参考文献 {#references}

*   Strachey, C. *Fundamental Concepts in Programming Languages*（Oxford PRG講義ノート、1967）。  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Cats Effectドキュメント：`IO`データ型とRT／遅延評価について。  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Typelevelブログ：*An IO monad for cats*（Scalaの不純性とRTをめぐる動機）。  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
