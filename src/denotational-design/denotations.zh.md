<!-- reader: {"title":"指称与组合性","sourceHash":"sha256:f23d995771d04278d7ee0f0a93000f60dfc435559082912084c4a6f5828256b2"} -->

# 指称与组合性 {#denotations-and-compositionality}

```admonish tip title="相关内容"
语义视角：[为何含义优先](semantic-view.md)、[指称设计](design.md)、[定律与解释](laws-and-interpretations.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)  
概念：[引用透明性](../concepts/referential_transparency.md)、[分支与合流](../concepts/branching.md)
```

```admonish note title="核心思想"
指称是从语法映射到所选语义域的含义函数。当整体的含义由各部分的含义确定时，语义就是组合式的；这使语义等价与安全替换成为可能。
```

**指称**是赋予一段语法或一个编程构造的含义。通常记作：

$$ \llbracket e \rrbracket $$

表示“表达式`e`的含义”。

这些括号并不要求指称必须是一个数字。根据所选语义域，程序可以指称：

*   一个值
*   一个函数
*   一个关系
*   一组可能结果
*   一个状态变换
*   一个概率分布
*   一种过程行为
*   一个部分结果

因此，第一个设计决策不是“用哪个结构体来保存它？”，而是“我们关心的含义属于哪个语义域？”

## 语义域 {#semantic-domains}

对于算术表达式，一个简单的语义域可以是整数：

$$ \llbracket e \rrbracket_{eval} \in \mathbb{Z} $$

对于格式化，同一种表达式语言也可以解释为文本：

$$ \llbracket e \rrbracket_{pretty} \in \mathsf{String} $$

对于带效应的计算，语义域可以是状态变换：

$$ \llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State} $$

对于并发语言，语义域可以描述可观察到的过程行为，而非某一条预先确定的轨迹。

所选语义域决定哪些差异有意义。如果语义域不包含时间，那么两个时序不同的实现仍可能指称同一个程序。如果把资源消耗纳入语义域，这种差异就可能具有语义意义。

## 抽象会有意忽略细节 {#abstraction-forgets-intentionally}

有用的指称会忽略无关的机器细节。

对于分支位置，指称可以保留从根到该位置的路径，同时忽略：

*   字节布局
*   分配策略
*   缓存行为
*   序列化格式

对于 HTTP 程序，可移植的指称可以保留方法、路径、输入角色、操作和输出角色，同时忽略承载它的路由器或执行器。

对于编译器阶段，指称可以保留从规范化源代码到可执行含义的转换，同时忽略临时缓冲区与遍历顺序。

忽略细节不是缺陷。正是如此，不同表示才可能等价。

## 组合性 {#compositionality}

当整体的含义由各部分的含义及其组合方式共同决定时，语义就是**组合式的**。

对于加法：

$$ \llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket $$

对于顺序函数组合：

$$ \llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket $$

对于并行过程运算符，语义域需要相应的并行组合：

$$ \llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket $$

具体运算符$\otimes$取决于所选的过程模型。关键在于，语法组合应系统地映射到语义组合。

组合性支持局部推理。如果两个部分的指称相同，就可以在任意组合上下文中相互替换：

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket \implies \llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket $$

这是安全替换与语义重构的基础。

## 语义等价 {#semantic-equality}

程序不必在文本或操作上完全相同，才能在语义上等价。

考虑分支位置的两种实现：

$$ \lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack $$

以及一种指称相同路径的整数编码。它们的内存值不同，但指称可能相等。

同样，两个编译器过程可以按不同顺序遍历语法，却生成行为符合相同规范的可执行文件。是否要求逐字节相等，是另一个更强的定律。

务必明确指出所声称的等价关系：

*   值相等
*   结构相等
*   规范表示相等
*   轨迹等价
*   双模拟
*   观察等价
*   指称相等

混淆这些等价关系，是错误定律的常见来源。

## 外部性是相对的 {#externality-is-relative}

假设某个计算具有如下含义：

$$ H \times E \to O $$

相对于`H`而言，证据`E`是外部的。如果新的抽象选择`H × E`作为承载对象，那么这些证据对于新的边界来说就变成内部的。

这一观察对效应与上下文都很重要。没有任何事实绝对属于“环境”。关键在于当前语义承载对象是否包含该事实，以及有哪些定律支配它。

```admonish warning title="避免使用通用上下文对象"
不要用一个通用上下文对象来解决这个边界问题。将每种允许的含义明确命名为一种能力或显式值。
```

## 基本含义与派生含义 {#primitive-and-derived-meaning}

基本操作是选作语义域词汇的操作。派生操作则由基本操作定义。

对于分支位置，一组精简的基本词汇可以包括：

*   一个根位置
*   沿某个方向延伸
*   观察一个位置到另一个位置的路径

由此可以派生：

*   向左延伸
*   向右延伸
*   根据路径构造位置
*   测试一个位置是否为另一个位置的祖先
*   测试一个位置是否为另一个位置的后代

这种区分是设计选择，而非形而上学事实。应优先采用精简的基本操作集合，让定律与其他解释更容易表述。

## 一项实用检验 {#a-useful-test}

在引入编程接口之前，先补全以下句子：

*   这个抽象中的值意味着……
*   基本观察包括……
*   有意义的组合包括……
*   当……时，两个值等价
*   每种实现都必须保留……
*   该抽象有意忽略……

如果这些句子无法补全，再多的实现机制也无法补上缺失的含义。
