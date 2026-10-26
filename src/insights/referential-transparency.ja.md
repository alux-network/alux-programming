<!-- reader: {"title":"参照透過性再考","sourceHash":"sha256:3f37fd77a20744f5881d426de372b671f438c12c29fc26e32f79a6cf91e6ab6a"} -->

# 参照透過性再考 {#referential-transparency-reloaded}

```admonish tip title="関連項目"
意味論的な見方：[表示と合成性](../denotational-design/denotations.md)、[法則と解釈](../denotational-design/laws-and-interpretations.md)  
Rustで意味から設計する：[ケイパビリティ代数](../rust-dd/capability-algebras.md)、[導出される意味と合成](../rust-dd/derived-meaning.md)  
概念：[参照透過性](../concepts/referential_transparency.md)
```

このページでは*参照透過性*をDenotational Designの観点から解釈します。 概念の章では歴史と主要な言語での使い方を扱います。 ここでは、設計上の制約としてのRTの意味に焦点を当てます。

DDではRTは純粋性のラベルではありません。 表示に関する法則であり、置換によって指定された意味が保持されなければなりません。

## RTをDenotational Designで捉え直す {#denotational-design-restatement-of-rt}

Denotational Designでは、RTを実装スタイルではなく仕様への要件として捉え直します。 まず仕様で合成可能な意味を定め、その後で実行戦略を選びます。

したがって、RTは意味論上の境界で検査します。

*   同じ入力
*   同じ宣言済みコンテキスト
*   同じ表示

これらが成り立つなら、置換は妥当であり、等式に基づく推論が可能です。具体的なインタープリターがIO、並行性、再試行、状態遷移を行う場合も同様です。それらの詳細は宣言されたケイパビリティの背後に委譲されるためです。

つまりDDで問うのは「この実装は純粋か」ではありません。 DDで問うのは「表示の等式が明示され、インタープリターがそれを保持しているか」です。

## 純粋性とRT {#purity-and-rt}

RTと純粋性は関連しますが、同一ではありません。

*   **RT**は意味に関する置換法則です。
*   **純粋性**は、隠れた観測可能な副作用を認めないという操作上の制約です。

式レベルのコードでRTを得る一般的な方法は純粋性です。しかしRTは意味論上の基準として残ります。置換によって指定された表示が保たれなければなりません。

そのためDDはRTを「純粋なコードだけ」といったスタイル上のラベルに変えません。 必要なのは、明示的な意味論的等式と、ケイパビリティ境界の背後に隔離された副作用です。

最小限の意味論的な読み方は次のとおりです。

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

同じ`a`と同じ`io`入力のもとで、`f`は同じ`(result, io')`を与える。 これはDD形式で、コンテキストを添字にした置換推論です。

## RTを明確にする理由 {#why-this-clarifies-rt}

RTをめぐる議論では、次の有用な区別が曖昧になることがよくあります。

*   意味論的な透明性
*   操作上の副作用

DDではこれらの層を分けます。

*   意味論的な中核が意味を述べる
*   インタープリターが実行戦略を実現する

この分離により、法則に基づく推論を保ったまま実際の副作用を扱えます。

## 表現先行で設計する場合の失敗 {#representation-first-failure-mode}

具体的な表現を早い段階で決めてしまうと、RTの議論がスタイル論にずれることがあります。

*   「このスタイルは純粋だ」
*   「あのスタイルは不純だ」
*   「IOラッパーで解決できる」

こうした議論の多くは符号化に関するものです。 DDでは、より単純な問いを立てます。 仕様で妥当な等式は何か。

## 実践的なDDのパターン {#practical-dd-pattern}

小さなケイパビリティトレイトを定義し、それらに基づく拡張としてプログラムの振る舞いを記述します。 その後に薄い具体インタープリターを用意します。

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]`は[`extend`クレートのマクロ](https://docs.rs/extend/latest/extend/)で、`impl`ブロックから拡張メソッドを生成して定型コードを減らします。Rustの新しい言語機能ではありません。

Scalaの関数型プログラミングでは、RTを`F[A]`型の値（例：`IO[A]`または`F[Either[E, A]]`）で表すことがよくあります。 ここでは一段上のレベルで、ケイパビリティによって境界付けられたプログラムの意味としてRTを表します。 そのため、このRustのメソッドは`F[A]`と同じ符号化の意味でRTの値を格納するコンテナーではありません。明示的なケイパビリティに基づき仕様化されたRTの振る舞いであり、具体的な副作用は実装に委譲されます。

拡張はケイパビリティに対する意味論上の振る舞いを述べます。 具体的な実装が、バッチ処理、再試行、通信方式、並列性、格納の詳細などの実行戦略を決めます。

## 最後の洞察 {#final-insight}

Denotational Designでは、RTは意味論的な仕様の性質です。 述べられた表示上の法則を守る限り、実装上の選択は二次的です。

法則を保つ。 ラベルにとらわれない。
