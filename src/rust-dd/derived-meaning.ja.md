<!-- reader: {"title":"導出される意味と合成"} -->

# 導出される意味と合成 {#derived-meaning-and-composition}

```admonish tip title="関連項目"
意味論的な見方：[Denotational Design](../denotational-design/design.md)  
Rustで意味から設計する：[ケイパビリティ代数](capability-algebras.md)、[インタープリターと副作用](interpreters.md)  
概念：[Expression Problem](../concepts/expression-problem.md)
```

```admonish note title="概要"
導出された振る舞いは、それが使うケイパビリティに属します。境界を満たす拡張として一度だけ記述し、たまたまそれらを実装する具体型に持たせません。`where`節は、導出が依存するものを正確に表します。
```

基本ケイパビリティは語彙を提供します。アプリケーションの振る舞いの大半は、その語彙から導出して、すべてのインタープリターで共有するべきです。

## 導出は拡張に持たせる {#extensions-own-derivations}

[`extend`](https://docs.rs/extend/latest/extend/)クレートを使うと、表現に依存せず分岐操作を導出できます。

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

`where`節は意味論的な依存関係をすべて宣言します。`BranchAlg`だけで、それ以上はありません。これらの定義を所有する具体的な分岐型はありません。

マクロが取り除くのは、トレイトや実装の定型コードだけです。通常の拡張トレイトでも同じ設計を表現できます。Denotational Designの要点は属性ではなく、意味論上の境界と導出にあります。

## なぜ構造体に持たせないのか。 {#why-not-put-it-on-the-struct}

````admonish warning title="導出された意味を構造体に固定しない"
これは表現先行の設計です。数値による分岐の担体を導入すると、導出をコピーするか再実装することになり、最初の具体型が意図せず仕様になってしまいます。

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

拡張では所有関係を逆転させます。

| 層 | 責務 |
| --- | --- |
| 意味論的ケイパビリティ | 導出される意味を所有する |
| 具体型 | 基本的な意味を解釈する |

## 境界で合成する {#compose-with-bounds}

一つのレシーバーが複数のケイパビリティを解釈するなら、直接境界を使います。

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="ケイパビリティをひとまとめにしない"
境界を短く書くためだけにスーパー トレイトを作らないでください。

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

ひとまとめにすると、どの操作がどのケイパビリティを使うかが見えなくなり、すべてのインタープリターが満たすべき別のインターフェースを生み出します。
````

## 五種類の異なる合成上の意味 {#five-different-composition-meanings}

関係を正確に表す形式を選びます。

| 状況 | Rustでの形 |
| --- | --- |
| 一つのレシーバーが複数のケイパビリティを解釈する | 直接境界 |
| 別の値が振る舞いを選択する | 明示的なポリシー引数 |
| 独立したポリシーを静的に合成する | プロダクト型または通常の構造体 |
| 環境が別のインタープリターを保持する | 小さな`HasX`射影 |
| ラッパーが内部のインタープリターを代用する | 委譲 |

### 明示的なポリシー {#explicit-policy}

戦略を個別に選ぶなら、拡張に明示的に渡します。

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

拡張が共通の導出を所有し、ポリシーは個別に選択する入力として残ります。環境内に隠すものでも、`Default`が選ぶものでもありません。

### ポリシーの積 {#product-of-policies}

継承を作り出さずに、独立したポリシーを合成できます。

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### 射影 {#projection}

`HasClock`トレイトは、環境から独立した時計の値を射影できることだけを示します。

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

時間を読む操作は、それ自身の`This::Clock: ClockAlg`節に`where`を追加します。射影が表すのは包含関係であり、利用側の操作は必要なケイパビリティを明示します。この分離が実際に存在する場合に限り、このパターンを使います。フィールドを整理するためだけに`HasX`を導入してはいけません。

### 委譲 {#delegation}

委譲とは、ラッパー自身が内部のインタープリターの代わりになれることです。透明なnewtype、共有ポインター、ケイパビリティの契約全体を保持するアダプターに適しています。

射影は「持つ」を表し、委譲は「である」を表します。互いに置き換えられません。

## デフォルトも意味論上の判断 {#defaults-are-semantic-decisions-too}

機械的な空状態には`Default`を実装できます。領域上のポリシーは、通常は明示します。

有用なケースの多くは代数的に説明できます。デフォルトは、その型に自然な合成における単位元です。空バッファーの追加、空マップとの結合、診断のゼロ件の累積は、何も付け加えません。その合成が結合的なら、型と操作はモノイドを成し、`Default`はポリシーを選ぶのではなく中立元を表せます。

適切なデフォルト：

*   空バッファー
*   空マップ
*   累積された診断のゼロ件

注意を要するデフォルト：

*   クォーラムの閾値
*   リーダーのポリシー
*   再試行の意味
*   確認の深さ
*   出力形式

重要なのは、中立元は判断を持ち込まない一方、クォーラム、リーダー戦略、再試行規則は領域の振る舞いを選ぶという違いです。デフォルトを変えると領域の意味が変わる場合は、ポリシーを明示的に合成してください。

## 導出される意味は閉じたままにする {#derived-meaning-should-stay-closed}

拡張は宣言されたケイパビリティと明示的な入力だけを使わなければなりません。フィールドへの直接アクセス、グローバル状態、具体型へのダウンキャストがあると、`where`節が実態を表さなくなります。

依存関係の宣言を証明するつもりで、本体を見直します。

```admonish question title="各導出を確認する"
この本体の各操作を、これらの境界から正当化できるか。
```

できない場合は、境界が不足しているか、コードを別の層に置く必要があります。

## レビュー時の確認 {#review-checks}

*   導出された振る舞いは、ケイパビリティに基づき一度だけ定義されているか。
*   拡張は具体的なフィールドやコンテキスト型を避けているか。
*   一つのインタープリターには直接境界を使っているか。
*   個別に選ぶポリシーを、明示的な値として渡しているか。
*   射影と委譲は正確な関係を主張しているか。
*   領域のデフォルトを合成の中で見えるようにしているか。
