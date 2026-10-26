<!-- reader: {"title":"指称设计"} -->

# 指称设计 {#denotational-design}

```admonish tip title="相关内容"
语义视角：[指称与组合性](denotations.md)、[定律与解释](laws-and-interpretations.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)、[派生含义与组合](../rust-dd/derived-meaning.md)
```

```admonish note title="核心思想"
指称设计从简单、可组合且独立于实现的含义推导出编程接口，让语义来引导设计，而不是事后描述接口。
```

指称设计是一种从简单、可组合且独立于实现的含义推导编程接口的方法。

该方法由[Conal Elliott](http://conal.net/)提出并命名。它的核心做法不仅是为现有语言或 API 赋予语义，而是让语义引导 API 本身的设计。

## 设计循环 {#the-design-loop}

按以下顺序进行：

1.  选择语义域。
2.  确定该语义域中重要的结构。
3.  选择一组精简的基本操作词汇。
4.  以组合方式派生有用操作。
5.  陈述这些操作遵循的定律。
6.  选择一种或多种表示。
7.  实现能够保留该结构的解释。
8.  通过定律、模型与场景进行验证。

表示优先的设计通常从第 6 步开始，然后试图事后补出第 1 至第 5 步。

## 设计分支代数 {#designing-a-branch-algebra}

回到分支位置。预期含义是二叉分支结构中的有限路径。

一种可能的基本代数是：

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

偏箭头$\rightharpoonup$表示路径观察仅在第一个分支是第二个分支的祖先时才存在。

由此可得一些有用操作：

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

这个代数没有提到向量、整数、分数、数据库键或字节。这些选择留待后续。

## 先结构，后便利 {#structure-before-convenience}

基本词汇应揭示下游代码所依赖的结构，而不应变成某种实现上所有便利方法的集合。

````admonish warning title="拒绝表示优先的基本操作"
这个 trait 将存储布局、配置位置、位表示和复合工作流捆绑在一起，并未隔离分支含义：

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

当效应属于所选语义域时，语义 API 仍然可以包含效应。规则并不是“所有东西都必须是纯函数”，而是“每个基本操作都必须表达连贯的含义”。

## 编码方式不是方法论 {#encoding-is-not-methodology}

指称设计不要求使用：

*   Haskell
*   tagless-final 编码
*   对象代数
*   自由单子
*   单一抽象语法树
*   仅使用纯函数
*   每个 API 都采用范畴论术语

这些可以是有用的编码方式或解释工具，但没有一种能够定义该方法。

```admonish note title="Rust 编码方式"
在 Rust 中，小型 trait、关联类型、扩展方法、泛型函数和一阶程序值都是实用的编码方式。它们的价值取决于是否保留了清晰的语义设计。
```

## 类型类态射 {#type-class-morphisms}

理解该方法的一种方式，是把它看作保结构映射。

假设某个接口描述了一个语义代数。实现会将其抽象值与操作映射到具体表示中。有效实现必须保留相关操作与定律。

如果`encode`将抽象分支映射到具体载体，那么保留延伸操作的形式如下：

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

实现不只是一个方法名称相同的集合。它应当是一个尊重代数结构的态射。

## 什么样的抽象才算好 {#what-counts-as-a-good-abstraction}

一个好的指称设计抽象具备以下特征：

*   其中的值具有简单明确的预期含义。
*   基本操作用于揭示语义观察或构造。
*   更大的行为由这些基本操作派生。
*   其定律不依赖某一种表示。
*   可以由彼此独立的实现来解释。
*   只有在相关时才引入操作细节。

仅仅精简还不够。即使一个小型 trait 暴露了`get_manager()`，它仍可能是表示优先的。若某个更大的代数包含的操作构成连贯的语义结构，也可能是合理的。

## 语义值与抽象载体 {#semantic-values-and-abstract-carriers}

并非所有具体类型都不能写入规范。

当解释器应当选择载体时，使用关联类型：

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

当某个类型属于稳定的语义词汇时，使用具体类型：

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

区别并非“抽象好，具体坏”，而是语义词汇与偶然的机器表示之别。

## 规范就是指称，而且不必可执行 {#the-specification-is-the-denotation-and-it-need-not-execute}

规范就是指称：赋予每种构造的数学含义。它的力量在于不受效率约束，甚至不必能够执行。

```admonish quote title="Conal Elliott"
定义指称通常比实现容易得多，也更能带来启发，因为指称不受效率或可执行性的约束，也不会受到它们的干扰。

——[《指称设计：从含义到程序》（LambdaJam 2015）](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

经典示例是 FRP（函数式响应式编程）：`Behavior a`被定义为连续时间上的函数，

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

这个模型很精确，却无法执行——实数无法逐个枚举。程序也可以指称一组结果；这两种模型都无法运行，但这正是其用意所在。选择含义是为了简洁和精确，而不是为了计算方式。

可执行性与效率完全交由*实现*负责；实现是独立产物，借助将其与含义关联起来的同态定律（类型类态射）来保证正确性：含义函数必须把每种语法组合映射为相应的语义组合。正如 Conal 所说，指称给出了对*待实现之事*明确无歧义的定义，同时为*如何*实现留下了很大的创作空间。

在 Rust 中，有几种产物可以表达这份规范的部分内容，其中一些恰好可以执行。可执行性只是偶然属性，不是它们成为规范的原因：

*   说明文字陈述预期含义
*   trait 陈述可用的基本操作
*   扩展陈述派生方式
*   定律陈述必需的等式
*   解释器展示可实现性
*   测试提供有限证据

应结合起来阅读，并让含义与定律在权威性上优先于具体机制。

## 延伸阅读 {#further-reading}

*   [《指称设计：从程序到含义》（BayHac 2014）](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [《借助类型类态射进行指称设计》](http://conal.net/papers/type-class-morphisms/)
*   [Conal Elliott 的文章与演讲](http://conal.net/)
