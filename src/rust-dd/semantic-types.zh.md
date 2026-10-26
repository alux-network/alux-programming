<!-- reader: {"title":"Rust 中的语义类型","sourceHash":"sha256:f260bada57ff228ad424bf6ea7f98dc225853e8a47e5611be37891f06f97e8af"} -->

# Rust 中的语义类型 {#semantic-types-in-rust}

```admonish tip title="相关内容"
语义视角：[依赖类型与证明](../denotational-design/dependent-types.md)、[指称设计](../denotational-design/design.md)  
Rust 中的语义驱动设计：[能力代数](capability-algebras.md)、[一阶程序](first-order-programs.md)、[定律、场景与证据](laws.md)  
概念：[引用透明性](../concepts/referential_transparency.md)
```

```admonish note title="导读"
依义设计优先的 Rust 使用类型来显露语义结构。关联类型为载体族命名，约束陈述它们之间的关系，扩展则从明确前提推导出新操作。定律仍然决定每种解释都必须保留什么。
```

在 Rust 中，`type`一词可以指代多种不同角色。将它们区分开，能避免含义坍缩为表示。

| 角色 | 示例 | 表达的内容 |
| --- | --- | --- |
| 语义类型 | `Direction` | 哪些领域区别很重要 |
| 由解释器选择的载体 | `BranchAlg::Branch` | 解释器选择哪种表示 |
| 派生操作 | `BranchExt::branch_child` | 根据已声明能力可以推出什么 |
| 阶段类型 | `Syntax`, `CoreProgram`, `Executable` | 某个值经过了哪种变换 |
| 表示类型 | `BitBranch` | 某个解释器如何存储分支含义 |
| 证据程序 | 场景或可复用的定律扩展 | 兼容解释器必须满足哪些观察 |

## 表示之前先确定语义类型 {#semantic-types-before-representation}

假设某个分支领域区分两个方向：

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction`直接表达了这一区别。一种解释器可以紧凑地编码路径：

```rust,noplayground
struct BitBranch(Vec<bool>);
```

布尔值属于这种表示。它们并非左右方向的定义，其他解释器也不必使用它们。

```admonish warning title="紧凑编码不等于语义类型"
不要根据位位置、字节偏移或机器分支来定义领域行为。这些产物应编码语义区别，而不是拥有这些区别的定义权。
```

这种区分让存储与执行布局可以改变，而不悄然改变领域本身。

## 关联类型选择载体 {#associated-types-choose-carriers}

能力代数可以把载体留给各个解释器选择：

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```

`Self::Branch`不是隐藏的字段类型，而是对分支含义作出解释时所选的载体。位路径、数值树位置、符号项或其他表示都可以满足同一个代数。

对于解释器`T`而言，记法`T::Branch`可以理解为一个载体族$\mathsf{Branch}(T)$。切换解释器可能改变载体，但每种操作仍会根据同一选择保持一致索引。

## 扩展用于推导结论 {#extensions-derive-consequences}

扩展可以根据它恰好需要的前提构造新操作：

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

`where`子句是前提：`This`对分支代数作出解释。方法则是结论：对于该解释器的载体，分支与方向决定一个子分支。

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

推导过程没有选择具体的分支表示。结果仍然属于解释器所选的载体族。

## 相等约束用于陈述兼容性 {#equality-bounds-state-compatibility}

两种能力有时需要对载体达成一致。关联类型相等约束可以陈述这一要求，而无须选择具体表示：

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

可以把这个约束读作一个局部命题：`Left`和`Right`在同一载体上解释分支操作。应将这一相等要求放在需要达成一致的操作上，而不是全局强加给任一代数。

与仅仅因为某个具体上下文碰巧同时包含两种实现就接受它相比，这种约束更强，也更精确。

## 阶段类型让编译器契约一目了然 {#stage-types-make-compiler-contracts-visible}

编译器流水线不应让一个无法区分阶段的语法树贯穿所有环节。不同阶段类型可以说明已经发生了哪种变换：

| 阶段 | 输入 | 输出 | 契约 |
| --- | --- | --- | --- |
| 解析 | 源文本 | `Syntax` | 识别表层语法 |
| 规范化 | `Syntax` | `CoreProgram` | 生成所选的核心含义 |
| 代码生成 | `CoreProgram` | `Executable` | 以可执行形式保留程序观察 |
| 运行时 | `Executable` | 可观察行为 | 依据语言模型一致地解释可执行程序 |

这些类型可防止意外混淆阶段，但仅凭名称无法证明保留性。仍需陈述变换定律、设计代表性场景，并提供跨解释器证据。

## 阅读契约 {#read-the-contract}

类型层面的结构可以作如下逻辑解读：

| Rust 形式 | 解读 |
| --- | --- |
| `This: BranchAlg` | `This`提供了对分支含义的解释 |
| `This::Branch` | 分支载体由`This`选择 |
| `Right: BranchAlg<Branch = Left::Branch>` | 两种解释在载体上保持一致 |
| `-> This::Branch` | 结果仍属于所选载体族 |

这种解读鼓励 API 显露决定类型的因素、组合所需的等式，以及这些前提能推出的结论。只要底层区别确实存在，关联类型、泛型关联类型、const 泛型、类型状态与零大小见证都可以表达此类契约的一部分。

不要仅仅为了让实现看起来更形式化，就凭空制造类型层面的机制。类型应当显露含义或保留必要关系，而不是装饰一种表示。

## 类型不能替代定律 {#types-do-not-replace-laws}

类型签名约束哪些程序能够构造，定律则约束这些程序的操作之间如何关联。二者缺一不可。

例如，`BranchAlg::Branch`说明每个解释器都会选择一种分支载体，但它本身并不能确立以下性质：

*   从某个分支到其自身的路径为空
*   重放根路径可以重构出该分支
*   相反方向的子节点彼此不同

这些是兼容解释器共同遵循的语义定律。特定于表示的主张（例如未使用的位必须为零）则属于选择该表示的解释器。

```admonish quote title="将类型视为主张"
询问每种类型主张什么、由什么决定、需要哪些定律补全，以及由哪个解释器实现。
```

## 审查要点 {#review-checks}

*   领域区别是否先于紧凑的机器编码出现？
*   关联类型是否是由解释器选择的载体，而非伪装的具体状态？
*   相等约束是否只陈述该使用位置所需的兼容性？
*   不同编译器阶段是否采用不同类型并具有明确契约？
*   语义命题是否与表示不变量分开？
*   Rust 无法表达的主张是否有可复用定律或场景作为依据？
