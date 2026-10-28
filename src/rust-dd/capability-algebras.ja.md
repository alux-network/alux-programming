<!-- reader: {"title":"ケイパビリティ代数","sourceHash":"sha256:707e5f96df94e673ccee892af8ce5f089dc44abc2d5361d5888348db72d22664"} -->

# ケイパビリティ代数 {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="関連項目"
意味論的な見方：[Denotational Design](../denotational-design/design.md)、[表示と合成性](../denotational-design/denotations.md)  
Rustで意味から設計する：[Rustの意味論的型](semantic-types.md)、[導出される意味と合成](derived-meaning.md)  
概念：[Expression Problem](../concepts/expression-problem.md)、[分岐と合流性](../concepts/branching.md)
```

```admonish note title="概要"
ケイパビリティのトレイトは小さな代数です。必要な意味を表す基本的な観測と変換に名前を付け、表現の選択をインタープリターに委ねます。最初の実装がたまたま持つフィールドではなく、意味から語彙を設計します。
```

Rustには「Denotational Design」という組み込み構文はありません。通常の言語機能で意味論上の語彙を符号化します。小さなケイパビリティのトレイトは、その有用な符号化の一つです。

本書で接尾辞`Alg`は**代数**を意味します。すなわち、インタープリターが選ぶ担体に対する、一貫した基本操作の集合です。

## 意味から始める {#start-from-meaning}

前のパートで扱った分岐位置の意味は、次のように表現できます。

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Left,
    Right,
}

pub trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>>;
}
```

このトレイトは三つの基本的な意味を述べます。

*   根を構成する
*   一つの方向へ分岐を伸ばす
*   経路が存在する場合に相対経路を観測する

分岐をどこに格納するかや経路をどう符号化するかは明かしません。

## ケイパビリティはフィールド参照ではない {#capabilities-are-not-field-projections}

````admonish warning title="フィールド参照は意味論的ケイパビリティではない"
次を比べてください。

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

このトレイトは構造体をメソッドの背後に隠していますが、表現を公開したままです。導出ロジックはベクトル、真偽値、所有権、変更方式に結び付いてしまいます。
````

意味論的ケイパビリティは、下流の意味が必要とする観測や変換を公開します。次を考えてください。

```admonish question title="各ケイパビリティについて問う"
実装がデータベース、記号項、コンパクトな整数、リモートサービスのどれを使っていても、この操作には意味があるか。
```

あるなら、その操作はケイパビリティに含められるかもしれません。呼び出し側が現在のフィールド配置を必要とするなら、含めないほうがよいでしょう。

## 一つのトレイトにつき基本的な意味を一つ {#one-primitive-meaning-per-trait}

小さなトレイトは依存関係を見えるようにします。

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

時間と期限を必要とする導出操作は、両方のトレイトを要求できます。ログ、格納、ネットワーク、設定、スケジューリングを含む`ApplicationContext`を必要としません。

「小さい」とは機械的にメソッドを一つだけにすることではありません。操作が分かちがたい一つの意味論的構造を成す場合はまとめます。独立した意味を表す場合や、別々に解釈できる場合は分けます。

## 関連型で担体を選ぶ {#associated-types-select-carriers}

インタープリターが表現を選ぶときは関連型を使います。

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

この境界で`String`、`std::io::Error`、具体的な構文木が安定した意味論的語彙でない限り、それらを要求しないでください。

一方、具体的な意味論的値を使うのは問題ありません。

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

規則は「すべての型を抽象化する」ことではありません。「インタープリターの仕組みと意味論的語彙を混同しない」ことです。

## 境界は使う場所に置く {#put-bounds-where-they-are-used}

基本操作には、必要のない制約を加えないでください。

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="先回りして境界を追加しない"
将来のあるアルゴリズムが必要とするかもしれないというだけで、関連型に制約を加えないでください。

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

候補を並べ替える操作では`Ord`が必要で、ハッシュ集合に入れる操作では`Hash`が必要になります。
````

使用箇所に境界を置けば、基本的な意味を再利用しやすくなり、導出された振る舞いの実際の契約も明確になります。

## 副作用も基本的な意味になり得る {#effects-can-be-primitive-meaning}

ケイパビリティのトレイトは純粋な実行を意味しません。

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

公開処理は副作用です。それでも現在の境界では、基本的な意味論上の操作になり得ます。具体的なインタープリターはHTTP、キュー、ファイル、テスト用バッファーを使うかもしれません。

意図された意味に含まれない限り、意味論的な層で再試行、ソケットの所有、タスクの起動、接続プールを規定すべきではありません。

## 境界に名前を付ける {#naming-the-boundary}

ケイパビリティは、利用側の意味論的な視点から表現します。

| 意味を中心にした名前 | 表現を中心にした名前 |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

命名も設計の一部です。機械的な名前は、機械的な結合を招きます。

## レビュー時の確認 {#review-checks}

*   このトレイトは一貫した基本的な意味を一つ公開しているか。
*   独立したインタープリターが、最初の表現を複製せずに実装できるか。
*   インタープリターが実際に選ぶ場合に限って、関連型を抽象化しているか。
*   具体型は安定した意味論的語彙か。
*   操作が使うまで境界を加えていないか。
*   マネージャー、コンテキスト、生の格納領域を返していないか。
