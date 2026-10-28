<!-- reader: {"title":"能力代数","sourceHash":"sha256:0c3fefabad08ae4d7f39d28d5855e2983e2c46d3acba947e186a304d1e91139e"} -->

# 能力代数 {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="相关内容"
语义视角：[指称设计](../denotational-design/design.md)、[指称与组合性](../denotational-design/denotations.md)  
Rust 中的语义驱动设计：[Rust 中的语义类型](semantic-types.md)、[派生含义与组合](derived-meaning.md)  
概念：[表达式问题](../concepts/expression-problem.md)、[分支与合流](../concepts/branching.md)
```

```admonish note title="导读"
能力 trait 是一种小型代数：它为某种含义所需的基本观察与变换命名，并将表示留给解释器决定。应根据含义设计词汇，而非根据首个实现恰好包含哪些字段。
```

Rust 没有名为“指称设计”的内置构造。我们用普通语言特性来编码语义词汇。小型能力 trait 是一种实用的编码方式。

本书中的后缀`Alg`表示**代数**：一组作用于由解释器选择的载体之上的连贯基本操作。

## 从含义出发 {#start-from-meaning}

前一部分中的分支位置含义可以表示为：

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

该 trait 陈述了三种基本含义：

*   构造根位置
*   沿一个方向延伸分支
*   在路径存在时观察相对路径

它不会暴露分支存储在哪里，也不会暴露路径如何编码。

## 能力不等于字段投影 {#capabilities-are-not-field-projections}

````admonish warning title="字段投影不是语义能力"
比较：

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

这个 trait 用方法隐藏了结构体，却仍然暴露其表示。任何派生逻辑都会与向量、布尔值、所有权和修改策略耦合。
````

语义能力暴露的是下游含义所需的观察或变换。请思考：

```admonish question title="审视每种能力"
如果实现改用数据库、符号项、紧凑整数或远程服务，这个操作是否仍然说得通？
```

如果答案是肯定的，该操作就可能属于此能力。如果调用者必须依赖当前字段布局，那它很可能不该属于此处。

## 每个 trait 表达一种基本含义 {#one-primitive-meaning-per-trait}

小型 trait 能让依赖一目了然：

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

需要时间与截止时间的派生操作可以同时要求这两种 trait。它不需要一个`ApplicationContext`囊括日志、存储、网络、配置和调度的上下文。

“小”不等于机械地只包含一个方法。当操作构成不可分割的语义结构时，应将它们放在一起；当它们表达彼此独立的含义或允许独立解释器时，应将它们拆开。

## 关联类型选择载体 {#associated-types-select-carriers}

当表示由解释器选择时，使用关联类型：

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

除非`String`、`std::io::Error`或具体语法树在此边界上属于稳定的语义词汇，否则不要要求它们。

反过来，具体语义值也完全可以使用：

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

规则不是“让所有类型都抽象”，而是“不要混淆解释器机制与语义词汇”。

## 在使用处添加约束 {#put-bounds-where-they-are-used}

让基本操作不受它用不到的约束：

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="不要预先添加约束"
不要仅仅因为某个未来算法可能需要某项能力，就限制关联类型：

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

对候选项排序的操作可以要求`Ord`；将它们放入哈希集合的操作则可以要求`Hash`。
````

在使用处添加约束，能让基本含义便于复用，也能揭示派生行为真正的契约。

## 效应可以是基本含义 {#effects-can-be-primitive-meaning}

能力 trait 并不意味着纯执行：

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

发布是一种效应。它仍然可以是当前边界上的基本语义操作。具体解释器可以使用 HTTP、队列、文件或测试缓冲区。

除非重试、套接字所有权、任务生成或连接池属于预期含义，否则语义层不应规定这些内容。

## 为边界命名 {#naming-the-boundary}

应从使用者的语义视角描述能力：

| 面向含义 | 面向表示 |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

命名本身就是设计。机械式名称容易引入机械式耦合。

## 审查要点 {#review-checks}

*   这个 trait 是否表达一种连贯的基本含义？
*   独立解释器能否在不复制首个表示的情况下实现它？
*   是否只在解释器确实能选择时才使用抽象关联类型？
*   具体类型是否属于稳定的语义词汇？
*   是否等到某个操作确实用到约束时才添加？
*   这个 trait 是否避免返回管理器、上下文对象和原始存储？
