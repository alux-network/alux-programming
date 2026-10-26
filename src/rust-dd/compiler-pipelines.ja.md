<!-- reader: {"title":"言語とコンパイラーパイプライン"} -->

# 言語とコンパイラーパイプライン {#language-and-compiler-pipelines}

```admonish tip title="関連項目"
Rustで意味から設計する：[一階プログラム](first-order-programs.md)、[インタープリターと副作用](interpreters.md)  
概念：[操作的意味論](../concepts/operational_semantics.md)、[関数のデファンクショナライズ](../concepts/defunctionalization.md)  
洞察：[EVM代数](../insights/evm-alg.md)
```

```admonish note title="意味はパイプラインではない"
言語の意味をパーサー木、パス、バイトコード、機械ループと同一視しないほうが、コンパイラーは明確になります。正しさは、一つの可換法則で表せます。コンパイル済みプログラムを実行した結果が、そのプログラムの表示に一致することです。
```

言語の意味をパーサー木、コンパイラーパス、バイトコード、仮想マシンループと同一視しないほうが、コンパイラーを推論しやすくなります。

この章では、Tolangに似せた簡略化した並行言語を使い、意味論的なアーキテクチャに焦点を当てます。

## 四つの異なる層 {#four-distinct-layers}

これらの層を分けてください。

1.  ソース構文
2.  正規化された言語
3.  実行可能な表現
4.  機械での実行

典型的なパイプライン：

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

利便性のための操作は合成です。

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

合成されたヘルパーが各段階の意味論的な定義になるわけではありません。

## 構文はまだ意味ではない {#syntax-is-not-yet-meaning}

パーサーの出力は文法上の選択を反映します。

*   句読点
*   糖衣構文
*   優先順位
*   ソース位置
*   生成されたパーサー表現

これらは診断やツールにとって重要ですが、中核言語を定義する必要はありません。

正規化では、偶発的な構文上の違いを取り除き、意味を担うより小さな形式を導入します。たとえば、表層での複数の束縛形式を一つの中核的な制約操作に正規化できます。

**多数のソース形式** → **正規化後の一つの構成子**

こうすることで、後続するコンパイラーとランタイムの法則を述べる場所が一つに定まります。

## 表示上の意味とコンパイル後の意味 {#denotational-and-compiled-meaning}

次のように置きます。

$$ \llbracket - \rrbracket : Core \to D $$

意味論的領域`D`で意味を割り当てる。

コンパイルで実行可能な値を生成する。

$$ compile : Core \to Executable $$

実行時にそれらを観測する。

$$ run : Executable \to D $$

中心となる正しさの責務は可換図式です。

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

非決定的または並行システムでは、等値性に通常の値の一致ではなく、観測的等価性、結果集合、トレース等価性、双模倣性を使う場合があります。どれを使うかは意味論モデルで選びます。

## 並行プロセスの意味 {#concurrent-process-meaning}

基本となる反射計算には、次のような考え方が含まれます。

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolangは基本計算を合成的に拡張します。その拡張の一つは、次の表層形式を追加します。

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

この束縛は新しいチャネルを作成し、その名前の有効範囲を$P$内に定めます。プロセス計算の文献では、この操作を*制約*と呼びます。反射的な中核には基本的な制約演算子はありません。MeredithとRadestockの[*A Reflective Higher-order Calculus*](https://doi.org/10.1016/j.entcs.2005.05.016)を参照してください。

操作機械では、タプル空間、キュー、照合用インデックス、継続レコード、並行タスクなどで実装できます。そうした仕組みが言語の定義になるわけではありません。

意味論層では、観測可能なプロセスの振る舞いと構造法則を特定します。中核となる並列合成には、次の法則が候補となります。

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

新規束縛の拡張に関する法則は別途扱います。標準的な候補スキーマとして、α変換、異なる束縛の交換、有効範囲の押し出しがあります。

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

ここで$y \mathrel{\#} P$は$P$に対して$y$が新鮮であること、$P\{y/x\}$は変数捕獲を避ける置換、$\operatorname{FN}(P)$は$P$に含まれる自由なチャネル名の集合を表します。これらのスキーマが法則になるのは、選択した観測的等価性で妥当と認められる場合だけです。表層構文から自動的に前提したり、一つのバイトコードレイアウトから推論したりしてはいけません。

## 意味を保持する写像としての正規化 {#normalization-as-a-meaning-preserving-map}

二つのソースプログラム`s₁`と`s₂`が、認められた糖衣構文だけで異なるなら、正規化によって共通の意味を明示できるべきです。

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

ほかにも、次の責務が有用です。

*   α変換で正規化後の意味が保持される
*   字句スコープで意図した束縛子が解決される
*   診断に必要な場合にソース位置が保持される
*   コンパイル時定数が実行時の振る舞いなしに消去される
*   不正な構文について、段階の契約に従って診断が蓄積される

正規化後の値に正準形を求めるプロジェクトもあれば、意味論的等価性だけを求めるプロジェクトもあります。どちらかを明示します。

## 段階のケイパビリティ {#stage-capabilities}

```admonish warning title="万能なコンパイラーオブジェクトを作らない"
巨大なコンパイラーオブジェクトを、唯一の段階インターフェースにしてはいけません。
```

正規化器には、次のようなケイパビリティが必要かもしれません。

*   束縛スコープの読み取りと拡張
*   ソース名の解決
*   診断の蓄積
*   正規化された項の構築

コード生成器には、次のものが必要かもしれません。

*   実行可能参照の割り当て
*   命令の出力
*   正規化された変数の解決
*   実行可能構造の確定

各段階の入り口をケイパビリティ上の拡張として表します。具体的な環境はマップ、アリーナ、カウンター、診断を保持しますが、段階の意味を所有しません。

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

正確なケイパビリティ名はコンパイラーごとに異なります。重要なのは、依存関係が明示され、段階間の対応が安定していることです。

## パーサーとランタイムは操作的な設計のままでよい {#parser-and-runtime-can-remain-operational}

すべてのサブシステムに同じ符号化を無理に適用する必要はありません。

パーサーは生成文法の仕組みが中心になることがあります。仮想マシンは効率的な変更とスケジューリングが中心になることがあります。十分に定義された境界を実装する限り、操作的な形のままで構いません。

| 段階 | 契約 |
| --- | --- |
| パーサー | `Syntax`を生成する |
| 正規化器 | 意味を担う`Core`を生成する |
| コード生成器 | 実行可能形式で意味を保持する |
| ランタイム | 言語モデルと一貫した観測を生成する |

Denotational Designは機械を取り除くのではなく、機械が言語の意味論を暗黙に定めるのを防ぎます。

## コンパイラーの法則とテスト {#compiler-laws-and-tests}

強い証拠は複数の方向から得られます。

*   同等なソース形式に対する正規化法則
*   意図する場合の構文解析と整形表示の往復
*   直接的な意味評価とコンパイル後の実行の比較
*   正準出力を保証する場合のバイトコード等価性
*   ランタイム適合性シナリオ
*   インタープリター間の差分テスト

```admonish warning title="バイトの一致は意味の一致ではない"
バイト単位の一致と意味論的等価性を混同しないでください。正準コンパイルが仕様に含まれる場合に限り、バイト一致は有用な、より強い性質です。
```

## この内容が読者に与える準備 {#how-this-prepares-the-reader}

意味を第一に考える言語実装を読むときは、次の点に注目します。

*   意味論的構文またはケイパビリティトレイト
*   導出される正規化操作
*   明示的な段階契約
*   一階の中核プログラム
*   置換、スコープ、合成に関する法則
*   段階のケイパビリティを解釈する薄い環境
*   端に置かれた操作的なパーサー、コンパイラー、VMの仕組み

この見方を使うと、一般的なDenotational DesignとTolangを結び付け、意味論上の境界が言語設計、コンパイル、ランタイム解釈をどう導くかを理解できます。
