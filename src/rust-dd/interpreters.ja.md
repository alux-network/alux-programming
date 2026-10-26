<!-- reader: {"title":"インタープリターと副作用","sourceHash":"sha256:4ca52b24121e8361c8cc8983e3807794110bade03c63105c1609e60eb9554b93"} -->

# インタープリターと副作用 {#interpreters-and-effects}

```admonish tip title="関連項目"
意味論的な見方：[法則と解釈](../denotational-design/laws-and-interpretations.md)  
Rustで意味から設計する：[ケイパビリティ代数](capability-algebras.md)、[法則、シナリオ、証拠](laws.md)  
概念：[自由モナド](../concepts/free_monad.md)  
洞察：[EVM代数](../insights/evm-alg.md)
```

```admonish note title="概要"
インタープリターは、ケイパビリティに対する表現または副作用を選びます。領域の振る舞いを再定義せずに基本操作を実現するため、その上にある導出の法則はすべてのインタープリターで成り立ちます。
```

インタープリターは、意味論的ケイパビリティを具体的な表現または副作用によって実現します。領域の振る舞いを再定義せずに仕組みを選ぶべきです。

## 薄いインタープリター {#a-thin-interpreter}

分岐をビット経路で表現する例：

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

実装は基本的な事実を格納して観測します。`branch_left`、`branch_right`、`branch_is_ancestor`は引き続き共有拡張に置きます。

## インタープリターは境界によって変わる {#interpreters-are-boundary-relative}

同じ型が、ある境界ではインタープリターになり、別の境界では意味論上の入力になることがあります。

| 境界 | 利用するもの | 解釈するもの |
| --- | --- | --- |
| ファイルシステムアダプター | ファイルシステムへのアクセス | ソース検索 |
| 正規化環境 | 基本的なケイパビリティとしてのソース検索 | 正規化された言語の構築 |
| コンパイラーパイプライン | 正規化された項 | 実行可能な形式の構築 |

万能な「実装層」はありません。意味論上の境界が入れ子になっています。

## 境界で副作用を扱う {#effects-at-the-edge}

具体的なインタープリターは、次のような選択を担います。

*   データベースのレイアウト
*   非同期ランタイム
*   タスクの所有関係
*   再試行戦略
*   HTTPまたはRPCフレームワークの型
*   シリアライズ
*   ロックとチャネル
*   キャッシュ

呼び出し側が観測する必要のない限り、これらの選択を意味論的なトレイトに含めないでください。

たとえば、意味論上のソースケイパビリティは、ソース値とエラーを返せます。本番インタープリターはファイルをキャッシュし、非同期に読み込むかもしれません。テスト用インタープリターは不変マップを使うかもしれません。導出された正規化ロジックは両方で動作するべきです。

## ランタイムの所有関係 {#runtime-ownership}

フレームワークのコールバックでは、状態の所有、複製可能性、スレッド安全性が要求されることがよくあります。それはインタープリター上の制約であり、必ずしも領域上の制約ではありません。

````admonish warning title="基本操作にフレームワークの担体を混ぜない"
基本操作をフレームワークの担体で汚染しないでください。

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

意味論的なアプリケーション処理を優先する

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

Webインタープリターは`Arc<Context>`を選び、リクエストの入力を取り出し、`status`を呼び出して結果を変換できます。領域の利用側は、Webサーバーの存在を知る必要がありません。

## 中立的なインタープリター {#neutral-interpreters}

すべてのインタープリターが副作用を実行する必要はありません。

APIプログラム用のテキストインタープリターは、次を記録できます。

| メソッド | パス | 入力 | 出力 |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

メタデータインタープリターはドキュメントを構築できます。テスト用インタープリターは操作名を集められます。本番インタープリターはサーバールートを構築できます。

中立的なインタープリターを使うと、プログラムが一つのランタイムに依存せず意味を持つことを示せます。

## 委譲によるインタープリターの合成 {#composing-interpreters-by-delegation}

意味が小さなケイパビリティトレイトに置かれているため、インタープリターは通常、*部品を組み立てて*作り、各部を個別に記述しません。担体は、すでにケイパビリティを提供するものへ委譲することで、そのケイパビリティを得ます。転送コードは手書きせず生成します。ほぼすべてのケースを二つの形式で扱えます。

**フィールドへケイパビリティを転送する。** ambassadorの`#[derive(Delegate)]`はトレイト全体を内部値へ転送します。複数のコンポーネントを保持する担体では、各ケイパビリティをそれを所有するフィールドへ委譲し、転送用の本体を一切書かずに済みます。

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

<strong>getterを介してケイパビリティを与える。</strong>型にgetterを一つ持たせると、そのgetterを持つすべての型に包括実装でケイパビリティ全体を与えられます。

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

その結果、多くの構造体が不要になります。関連型と十数個のメソッドを持つ大きなトレイト一つと、その唯一の具体実装からなる一枚岩のコンテキストオブジェクトは、小さなケイパビリティトレイト群と、提供元のフィールドまたはgetterへ個別に委譲する薄い担体に置き換えられます。期限を過ぎたか調べるなどの導出操作は、担体ごとに再実装せず、基本操作を使う拡張として一度だけ記述します。

```admonish warning title="委譲は操作を転送するもので、意味を転送するのではない"
委譲を生成すれば定型コードをなくせますが、意味論的に代用可能であるとは限りません。ambassadorの`derive`のような`#[derive(Delegate)]`マクロが証明するのは、実装がコンパイルされることだけであり、その担体が同じインタープリターを表すことではありません。`Shared<T>(Arc<T>)`が`T`の代わりになるなら、担体上で法則を検査します。共有や同一性を変えるラッパー（`Arc`、プーリング、キャッシュ）は、すべてのメソッドを正しく転送していても、新鮮さや一意性に関する法則に違反することがあります。担体が無関係なサービスの一つとして`T`を格納するだけなら、委譲より射影のほうが実態に即しています。
```

## エラーは境界に属する {#errors-belong-to-a-boundary}

エラーは、それを処理する境界で失敗の意味を伝えるべきです。

| エラー | 境界での変換 |
| --- | --- |
| 領域エラー | 通信インタープリターがプロトコル応答に変換する |
| 解析エラー | コンパイラーのフロントエンドが診断に変換する |
| 格納エラー | ソースインタープリターが意味論上のソース取得失敗に変換する |

HTTPステータスコード、RPCエラーオブジェクト、データベースエラーを基本領域トレイトに押し込まないでください。インタープリターの境界で変換します。

## 観測されない限り、性能は解釈上の課題 {#performance-is-an-interpretation-concern-until-observed}

バッチ処理、並列化、キャッシュ、データレイアウトは通常、インタープリターに属します。仕様が順序、時間、リソース使用、公平性、失敗の振る舞いを観測可能な形で保証する場合に限り、意味論上の要件になります。

この分離により、意味を変えずに最適化できます。

*   同じ法則
*   同じ宣言済みの観測
*   異なる操作戦略

## レビュー時の確認 {#review-checks}

*   インタープリターは導出を重複させず基本操作を実装しているか。
*   ランタイムとフレームワークの制約を、利用する境界に限定しているか。
*   中立的なインタープリターやテスト用インタープリターで、同じケイパビリティを実装できるか。
*   通信と格納のエラーを境界で変換しているか。
*   委譲は意味論上も正確か。
*   述べられた表示のもとで、性能差は観測できないものか。
