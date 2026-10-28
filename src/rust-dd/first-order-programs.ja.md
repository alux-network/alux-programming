<!-- reader: {"title":"一階プログラム","sourceHash":"sha256:963dfa4d3aafbcfe83acf16b8c79baeceaab0bf4e0106b971e32a212ecb279af"} -->

# 一階プログラム {#first-order-programs}

```admonish tip title="関連項目"
Rustで意味から設計する：[導出される意味と合成](derived-meaning.md)、[言語とコンパイラーパイプライン](compiler-pipelines.md)  
概念：[継続渡し形式](../concepts/cps.md)、[関数のデファンクショナライズ](../concepts/defunctionalization.md)、[自由モナド](../concepts/free_monad.md)  
洞察：[Expression Problem再考](../insights/expression-problem.md)
```

```admonish note title="アプリケーションを再構化するとき"
通常の関数と拡張ですでに導出された振る舞いを表現できます。実行前に別のインタープリターがプログラムを検査、合成、シリアライズ、コンパイルする必要がある場合に限り、アプリケーションを一階データに変換します。
```

通常の関数と拡張メソッドは、導出された振る舞いを表現するのに最適な方法です。プログラムを適用する前に、別のインタープリターがその構造を検査、結合、文書化、シリアライズ、コンパイルしなければならない場合もあります。そのときはアプリケーション自体を一階データにする必要があります。

## 実行すると構造が消える {#execution-erases-structure}

次を考えてください。

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

このメソッドを呼び出すと状態が返ります。呼び出しが始まると、外部のインタープリターは一般に次の情報を復元できません。

*   意味論的なコンテキスト型
*   順序付きの引数
*   ソース上の引数名
*   結果の型
*   操作の識別情報

その情報はソースレベルの関数型に含まれていましたが、通常の実行によって消費されます。

## アプリケーションをデファンクショナライズする {#defunctionalizing-application}

デファンクショナライズでは、既知の関数族の要素を一階のタグと共有の適用操作に置き換えます。

最小限の操作語彙は次のとおりです。

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

サイズゼロの`CurrentStatusOperation<App>`は、元の拡張メソッドの適用を表せます。メソッド本体を二重に持つのではなく、そのメソッドを呼び出すべきです。

1.  拡張メソッドから始める。
2.  それを操作型として再構化する。
3.  コンテキスト、引数の積、引数名、出力を保持する。
4.  `ApplyAlg`を通じて解釈する。

通常の呼び出しでは、引き続き使いやすいメソッドを使えます。一階の構造を必要とする場面では、操作値を使います。

## 利用側がないなら再構化しない {#do-not-reify-without-a-consumer}

一階プログラムを使うと型の仕組みが増えます。次のように、実際に二つ目の解釈が可能になる場合に使います。

*   ランタイム登録
*   ドキュメントまたはスキーマ生成
*   静的検査
*   実行前のプログラム合成
*   シリアライズ
*   コンパイル

コードが関数を呼び出すだけなら、その関数のままにします。

## 移植可能なインターフェースプログラム {#portable-interface-programs}

HTTPの表面に次が含まれるとします。

| メソッド | パス | 入力 | 操作 | 出力 |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | 本文：`f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | ストリーミングファイル |

移植可能なプログラムは次を保持しなければなりません。

*   メソッドとパスの選択子
*   パス、クエリ、本文、ヘッダー、認証などの入力の役割
*   操作値
*   JSONやファイルなどの出力の役割
*   ルートの結合とネスト

特定のフレームワークのリクエスト、ルーター、レスポンス型は保持しないでください。

たとえば、次のような流れる記法を使えます。

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

流れるように連ねた呼び出しは、型付きプログラムを構築します。サーバールートをただちに登録する必要はありません。

## 一つのプログラムを複数のfoldで解釈する {#one-program-several-folds}

同じ一階プログラムで複数の解釈を実現できます。

| プログラム | 解釈 |
| --- | --- |
| 型付きHTTPプログラム | テキスト形式のドキュメント、実行可能なルート、OpenAPIメタデータ、クライアントバインディング、適合性テスト |
| 型付きJSON-RPCプログラム | メソッド登録、スキーマ、クライアント、テストハーネス |

実行とドキュメントで別々のルート一覧やメソッド一覧を管理しないでください。仕様が競合します。

## 入力と出力の役割 {#input-and-output-roles}

操作はすでに引数型と結果型を認識しています。通信方式の宣言では、通信方式の意味だけを追加します。

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`、`query`、`json`は役割を示します。`ApplyAlg`によってすでに決まっている出力型を、記述者に重ねて書かせるべきではありません。

出力変換は通信インタープリターに属します。サーバーは結果の一つをJSONに、別の結果をストリーミング添付ファイルに変換できます。意味論的な操作は、いずれの表現も意識しません。

## 合成もプログラムの意味 {#composition-is-program-meaning}

プログラムでは汎用的な合成を保持するべきです。

*   空のプログラム
*   プログラムを結合する
*   プログラムを接頭辞の下にネストする
*   エンドポイントをプログラムへ持ち上げる

これらは一つのフレームワークのルーターメソッドより基礎的な操作です。`get`、`post`、`merge`、`nest`のような馴染みのある流れる形式の名前も、中立的な代数の別名にできます。

独立した仕様から、小さなプログラムを公開できます。

| 入力プログラム | 合成 | 結果 |
| --- | --- | --- |
| 状態取得とダウンロードのプログラム | 結合 | サービスプログラム |
| カタログプログラム | ネスト | サービスプログラム |

アプリケーションが、結果の合成を選択して解釈します。

## マクロは公開された意味へ展開する {#macros-must-lower-to-public-meaning}

Rustのマクロを使うと、一階宣言を簡潔に記述できます。

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

マクロが公開された手動構築可能な一階プログラムに展開される場合にのみ、適切に機能します。生成されたコールバックがインターフェースの唯一の定義になってはいけません。

望ましい流れ：

1.  簡潔な構文
2.  公開された操作値とプログラム値
3.  ジェネリックなfold
4.  具体的なフレームワーク

表現先行の流れ：

1.  フレームワークの注釈
2.  不透明な生成済みコールバック
3.  リバースエンジニアリングによるドキュメント

## 既存概念との関係 {#relation-to-existing-concepts}

一階インターフェースプログラムは、ほかの章の技法を土台にしています。デファンクショナライズは一般的な変換であり、拡張可能な構文と解釈はExpression Problemに関わり、自由モナドは逐次合成を備えた構文表現の一種です。各項目はページ上部の関連リンクから参照できます。

これらの技法とDDそのものを同一視しないでください。DDが重要な構造を定め、通常の呼び出しでは消えてしまう場合に、一階表現がその構造を保持します。

## レビュー時の確認 {#review-checks}

*   実際に二つ目のインタープリターが必要であり、そのために再構化するのか。
*   操作は記述されたメソッドを重複実装せず呼び出しているか。
*   引数と出力は操作から推論されるか。
*   通信方式の構文は、通信方式上の役割だけを追加するか。
*   便利なマクロがなくてもプログラムを構築できるか。
*   ランタイムとメタデータは同じプログラムを解釈しているか。
