<!-- reader: {"title":"派生含义与组合","sourceHash":"sha256:c7473063df63eb2d15fda98f9a500fae54294e9185911fd432265986a9f87f56"} -->

# 派生含义与组合 {#derived-meaning-and-composition}

```admonish tip title="相关内容"
语义视角：[指称设计](../denotational-design/design.md)  
Rust 中的语义驱动设计：[能力代数](capability-algebras.md)、[解释器与效应](interpreters.md)  
概念：[表达式问题](../concepts/expression-problem.md)
```

```admonish note title="导读"
派生行为应归属于它所使用的能力，并在扩展中基于这些约束定义一次，供所有解释器共享；它不应属于某个碰巧实现这些能力的具体类型。`where`子句诚实地说明了该推导依赖什么。
```

基本能力提供词汇。大多数应用行为都应从这些词汇派生一次，并由所有解释器共享。

## 扩展拥有派生定义 {#extensions-own-derivations}

使用[`extend`](https://docs.rs/extend/latest/extend/) crate，可以独立于表示派生分支操作：

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

`where`子句完整声明了语义依赖：`BranchAlg`，除此之外别无其他。没有任何具体分支类型拥有这些定义。

宏只是省去了 trait 与 impl 的样板代码。普通扩展 trait 也能表达相同设计。指称设计体现在语义边界与派生定义中，而不在属性宏里。

## 为什么不把它放进结构体？ {#why-not-put-it-on-the-struct}

````admonish warning title="不要把派生含义焊死在结构体上"
这属于表示优先设计。如果引入数值分支载体，就必须复制或重新实现派生逻辑，首个具体类型也会意外变成规范本身。

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

扩展反转了归属关系：

| 层 | 职责 |
| --- | --- |
| 语义能力 | 拥有派生含义 |
| 具体类型 | 解释基本含义 |

## 基于约束组合 {#compose-with-bounds}

当一个接收者解释多种能力时，使用直接约束：

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

````admonish warning title="不要捆绑能力"
不要仅仅为了缩短约束就创建超 trait：

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

能力捆绑会掩盖哪个操作使用了哪些能力，还会额外创建一种所有解释器都必须满足的接口。
````

## 五种不同的组合含义 {#five-different-composition-meanings}

选择能够如实描述这种关系的形式。

| 情形 | Rust 结构 |
| --- | --- |
| 一个接收者解释多种能力 | 直接约束 |
| 由单独的值选择行为 | 显式策略参数 |
| 独立策略静态组合 | 乘积类型或普通结构体 |
| 环境承载另一个解释器 | 小型`HasX`投影 |
| 包装器替代内部解释器 | 委托 |

### 显式策略 {#explicit-policy}

如果某种策略独立选择，就将它显式传入扩展：

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

扩展拥有共享的派生定义，而策略仍是独立选择的输入。它不会隐藏在环境中，也不会由`Default`选择。

### 策略乘积 {#product-of-policies}

无需发明继承机制，也能组合独立策略：

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### 投影 {#projection}

一个`HasClock` trait 仅表明环境可以投影出一个独立的时钟值：

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

读取时间的操作会在自己的`This::Clock: ClockAlg`能力`where`子句中添加该能力。投影只说明包含关系；使用时间的操作则说明自己需要哪种能力。只有在这种分离确实存在时才采用该模式。不要仅仅为了整理字段就引入`HasX`。

### 委托 {#delegation}

委托意味着包装器本身可以替代内部解释器。这适用于透明新类型、共享指针，以及完整保留能力契约的适配器。

投影表示“拥有”。委托表示“就是”。二者不能互换。

## 默认值也是语义决策 {#defaults-are-semantic-decisions-too}

机械的空状态可以实现`Default`。领域策略通常应当显式给出。

有用的情形往往可以用代数解释：默认值是该类型自然组合运算的单位元。追加空缓冲区、与空映射合并，或累积零条诊断信息，都不会带来额外贡献。若这种组合满足结合律，该类型与操作便构成幺半群；此时`Default`可以命名其中的中性元，而非替使用者选择策略。

合适的默认值：

*   空缓冲区
*   空映射
*   累积的诊断数量为零

值得怀疑的默认值：

*   法定人数阈值
*   领导者策略
*   重试语义
*   确认深度
*   输出格式

关键区别在于：中性元不会引入决策，而法定人数、领导者策略或重试规则会选择领域行为。如果更改默认值会改变领域含义，就应显式组合该策略。

## 派生含义应保持封闭 {#derived-meaning-should-stay-closed}

扩展只能使用已声明的能力与显式输入。直接访问字段、全局状态和具体类型向下转型都会使`where`子句变得不诚实。

审查函数体时，应把它看作对依赖声明的证明：

```admonish question title="逐项检查推导"
函数体中的每个操作，是否都能由这些约束证明合理？
```

如果不能，要么约束不完整，要么代码属于其他层。

## 审查要点 {#review-checks}

*   派生行为是否只在能力之上定义一次？
*   扩展是否避免依赖具体字段与上下文类型？
*   单个解释器是否使用直接约束？
*   独立选择的策略是否以显式值传入？
*   投影与委托所表达的关系是否准确？
*   领域默认值是否在组合中清晰可见？
