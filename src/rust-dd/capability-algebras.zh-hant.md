<!-- reader: {"title":"能力代數"} -->

# 能力代數 {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](../assets/design-by-meaning-rust.png)

```admonish tip title="相關內容"
語義視角：[指稱設計](../denotational-design/design.md)、[指稱與組合性](../denotational-design/denotations.md)  
Rust 中的語義驅動設計：[Rust 中的語義型別](semantic-types.md)、[派生含義與組合](derived-meaning.md)  
概念：[表示式問題](../concepts/expression-problem.md)、[分支與合流](../concepts/branching.md)
```

```admonish note title="導讀"
能力 trait 是一種小型代數：它為某種含義所需的基本觀察與變換命名，並將表示留給直譯器決定。應根據含義設計詞彙，而非根據首個實作恰好包含哪些欄位。
```

Rust 沒有名為“指稱設計”的內建構造。我們用普通語言特性來編碼語義詞彙。小型能力 trait 是一種實用的編碼方式。

本書中的字尾`Alg`表示**代數**：一組作用於由直譯器選擇的載體之上的連貫基本操作。

## 從含義出發 {#start-from-meaning}

前一部分中的分支位置含義可以表示為：

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

該 trait 陳述了三種基本含義：

*   構造根位置
*   沿一個方向延伸分支
*   在路徑存在時觀察相對路徑

它不會暴露分支儲存在哪裡，也不會暴露路徑如何編碼。

## 能力不等於欄位投影 {#capabilities-are-not-field-projections}

````admonish warning title="欄位投影不是語義能力"
比較：

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

這個 trait 用方法隱藏了結構體，卻仍然暴露其表示。任何派生邏輯都會與向量、布林值、所有權和修改策略耦合。
````

語義能力暴露的是下游含義所需的觀察或變換。請思考：

```admonish question title="審視每種能力"
如果實作改用資料庫、符號項、緊湊整數或遠端服務，這個操作是否仍然說得通？
```

如果答案是肯定的，該操作就可能屬於此能力。如果呼叫者必須依賴當前欄位佈局，那它很可能不該屬於此處。

## 每個 trait 表達一種基本含義 {#one-primitive-meaning-per-trait}

小型 trait 能讓依賴一目瞭然：

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

需要時間與截止時間的派生操作可以同時要求這兩種 trait。它不需要一個`ApplicationContext`囊括日誌、儲存、網路、配置和排程的上下文。

“小”不等於機械地只包含一個方法。當操作構成不可分割的語義結構時，應將它們放在一起；當它們表達彼此獨立的含義或允許獨立直譯器時，應將它們拆開。

## 關聯型別選擇載體 {#associated-types-select-carriers}

當表示由直譯器選擇時，使用關聯型別：

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

除非`String`、`std::io::Error`或具體語法樹在此邊界上屬於穩定的語義詞彙，否則不要要求它們。

反過來，具體語義值也完全可以使用：

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

規則不是“讓所有型別都抽象”，而是“不要混淆直譯器機制與語義詞彙”。

## 在使用處新增約束 {#put-bounds-where-they-are-used}

讓基本操作不受它用不到的約束：

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="不要預先新增約束"
不要僅僅因為某個未來演算法可能需要某項能力，就限制關聯型別：

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

對候選項排序的操作可以要求`Ord`；將它們放入雜湊集合的操作則可以要求`Hash`。
````

在使用處新增約束，能讓基本含義便於複用，也能揭示派生行為真正的契約。

## 效應可以是基本含義 {#effects-can-be-primitive-meaning}

能力 trait 並不意味著純執行：

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

釋出是一種效應。它仍然可以是當前邊界上的基本語義操作。具體直譯器可以使用 HTTP、佇列、檔案或測試緩衝區。

除非重試、套接字所有權、任務生成或連線池屬於預期含義，否則語義層不應規定這些內容。

## 為邊界命名 {#naming-the-boundary}

應從使用者的語義視角描述能力：

| 面向含義 | 面向表示 |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

命名本身就是設計。機械式名稱容易引入機械式耦合。

## 審查要點 {#review-checks}

*   這個 trait 是否表達一種連貫的基本含義？
*   獨立直譯器能否在不復制首個表示的情況下實作它？
*   是否只在直譯器確實能選擇時才使用抽象關聯型別？
*   具體型別是否屬於穩定的語義詞彙？
*   是否等到某個操作確實用到約束時才新增？
*   這個 trait 是否避免返回管理器、上下文物件和原始儲存？
