<!-- reader: {"title":"Denotational Design","sourceHash":"sha256:bac0e12637b9f63a8fa1002e44ca58f04237a81e1bc18da343cf22e360a85e8e"} -->

# Denotational Design {#denotational-design}

```admonish tip title="関連項目"
意味論的な見方：[表示と合成性](denotations.md)、[法則と解釈](laws-and-interpretations.md)  
Rustで意味から設計する：[ケイパビリティ代数](../rust-dd/capability-algebras.md)、[導出される意味と合成](../rust-dd/derived-meaning.md)
```

```admonish note title="中心となる考え方"
Denotational Designでは、単純で合成可能かつ実装に依存しない意味からプログラミングインターフェースを導きます。後付けでインターフェースを説明するのではなく、意味論を設計の指針とします。
```

Denotational Designとは、単純で合成可能かつ実装に依存しない意味から、プログラミングインターフェースを導く実践です。

この方法論は[Conal Elliott](http://conal.net/)が開発し、命名しました。中心となるのは、既存の言語やAPIに意味論を割り当てることだけではありません。意味論をAPIそのものの設計指針にすることです。

## 設計の反復手順 {#the-design-loop}

次の順序で進めます。

1.  意味論的領域を選ぶ。
2.  その領域で重要な構造を特定する。
3.  基本操作の小さな語彙を選ぶ。
4.  有用な操作を合成的に導出する。
5.  それらの操作が従う法則を述べる。
6.  一つまたは複数の表現を選ぶ。
7.  構造を保持する解釈を実装する。
8.  法則、モデル、シナリオを使って妥当性を確認する。

表現先行の設計では、一般に手順6から始め、後から手順1〜5を再構成しようとします。

## 分岐代数を設計する {#designing-a-branch-algebra}

分岐位置に戻りましょう。求める意味は、二分岐構造における有限経路です。

基本代数の一例は次のとおりです。

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

部分関数$\rightharpoonup$は、最初の分岐が二つ目の祖先である場合にのみ、経路の観測が存在することを表します。

ここから有用な操作を導けます。

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

この代数は、ベクトル、整数、分数、データベースキー、バイト列に言及しません。そうした選択は後で行います。

## 利便性より先に構造を定める {#structure-before-convenience}

基本語彙によって、下流のコードが依存する構造を明らかにします。一つの実装で利用できる便利なメソッドをすべて集めるのではありません。

````admonish warning title="表現先行の基本操作を避ける"
このトレイトは、格納方法、設定の場所、ビット表現、複合ワークフローをひとまとめにしています。分岐の意味を切り分けていません。

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

選択した領域に副作用が含まれるなら、意味論的APIにも副作用を含められます。「すべて純粋でなければならない」という規則ではありません。「基本操作はそれぞれ一貫した意味を述べなければならない」という規則です。

## 符号化は方法論ではない {#encoding-is-not-methodology}

Denotational Designが次のものを必須とするわけではありません。

*   Haskell
*   tagless-final符号化
*   オブジェクト代数
*   自由モナド
*   一つのAST
*   純粋関数のみ
*   すべてのAPIに圏論の用語を使うこと

これらは有用な符号化や説明手段になり得ますが、どれも方法論を定義するものではありません。

```admonish note title="Rustでの符号化"
Rustでは、小さなトレイト、関連型、拡張メソッド、ジェネリック関数、一階のプログラム値が実用的な符号化手段になります。その価値は、明確な意味論的設計を保てるかどうかで決まります。
```

## 型クラスの準同型 {#type-class-morphisms}

この方法を、構造を保つ写像として理解する方法があります。

インターフェースが意味論的代数を記述するとします。実装は、その抽象値と操作を具体的な表現へ写像します。有効な実装は、関係する操作と法則を保持しなければなりません。

`encode`が抽象的な分岐を具体的な担体へ写像するとき、拡張を保持する性質は次のように表せます。

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

実装は、名前の一致するメソッドを集めただけのものではありません。代数構造を尊重する準同型として意図されています。

## 優れた抽象化とは何か {#what-counts-as-a-good-abstraction}

優れたDenotational Designの抽象化には、次のような性質があります。

*   値が単純で意図の明確な意味を持つ。
*   基本操作が意味論的な観測または構築を表す。
*   より大きな振る舞いが基本操作から導出される。
*   法則が特定の表現に依存しない。
*   独立した実装がそれを解釈できる。
*   操作上の詳細は関係する場面でのみ現れる。

小さいだけでは不十分です。`get_manager()`を公開する小さなトレイトでも、表現先行のままです。より大きな代数でも、各操作が一貫した意味論的構造を成すなら正当化できます。

## 意味論的な値と抽象的な担体 {#semantic-values-and-abstract-carriers}

仕様に具体型を一切含めてはならないわけではありません。

インタープリターに担体を選ばせる場合は、関連型を使います。

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

安定した意味論上の語彙なら、具体型を使います。

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

違いは「抽象が善で、具体が悪」ということではありません。意味論上の語彙か、偶然の機械表現かという違いです。

## 仕様とは表示であり、実行可能である必要はない {#the-specification-is-the-denotation-and-it-need-not-execute}

仕様とは表示、つまり各構成要素に割り当てられた数学的な意味です。その強みは、効率性や実行可能性にさえ縛られないことにあります。

```admonish quote title="Conal Elliott"
表示を定義するほうが実装よりはるかに簡単で、理解も深まることがよくあります。効率性や実行可能性に伴う制約や雑音がないからです。

— [Denotational Design：意味からプログラムへ（LambdaJam 2015）](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

典型例はFRP（関数型リアクティブプログラミング）です。`Behavior a`は連続時間の関数として定義されます。

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

そのモデルは正確ですが、実行できません。実数を列挙できないからです。同様に、プログラムが結果の集合を表す場合もあります。どちらのモデルも実行しませんが、それこそが要点です。計算方法ではなく、単純さと正確さを基準に意味を選びます。

実行可能性と効率性は、意味に立ち返って正しさを保つ準同型の法則（型クラスの準同型）で制約された別個の成果物、*実装*に全面的に委ねられます。意味関数は、構文上の各合成を対応する意味論上の合成へ写さなければなりません。Conalの言葉を借りれば、表示によって「実装すべき*もの*を曖昧さなく定義しつつ、実装*方法*には大きな創意工夫の余地を残せます」。

Rustでは、この仕様の一部を複数の成果物で表現でき、その中には実行可能なものもあります。実行可能であることは付随的な性質であり、仕様である理由ではありません。

*   文章は意図された意味を述べる
*   トレイトは利用可能な基本操作を述べる
*   拡張は導出方法を述べる
*   法則は要求される等式を述べる
*   インタープリターは実現可能性を示す
*   テストは有限の証拠を提供する

具体的な仕組みよりも、意味と法則に権限を持たせて、これらを併せて読みます。

## さらに読む {#further-reading}

*   [Denotational Design：プログラムから意味へ（BayHac 2014）](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [型クラスの準同型によるDenotational Design](http://conal.net/papers/type-class-morphisms/)
*   [Conal Elliottの著作と講演](http://conal.net/)
