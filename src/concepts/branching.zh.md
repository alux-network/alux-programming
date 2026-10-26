<!-- reader: {"title":"分支与合流","sourceHash":"sha256:5f5f2bd836aff683d4aeb745963ca7b9e19c5f2a9ed3cdd1f2b1038bacda97fa"} -->

# 分支与合流 {#branching-and-confluence}

```admonish tip title="相关内容"
语义视角：[指称与组合性](../denotational-design/denotations.md)、[定律与解释](../denotational-design/laws-and-interpretations.md)  
Rust 中的语义驱动设计：[定律、场景与证据](../rust-dd/laws.md)  
概念：[操作语义](operational_semantics.md)
```

分支、确定性、合流、轨迹等价与双模拟都涉及计算中的多种可能，但它们并非同一种性质。

```admonish note title="语义定位"
控制流分支属于操作结构。合流性是归约关系的性质。轨迹等价与双模拟用于比较行为。指称等价则比较所选语义域中的含义。健全的设计应明确说明所需的等价关系，而不是非正式地在这些概念之间切换。
```

## 行为等价 {#behavioral-equivalence}

并发与交互式程序很少只有一个最终结果。一个常见的起点是**标记迁移系统**：

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

其中$S$是状态集合，$A_{\tau}$是可观察动作标签与一个内部动作$\tau$的集合，$\to\;\subseteq S \times A_{\tau} \times S$是转换关系。我们将$p \xrightarrow{a} p'$记作：状态$p$可以执行动作$a$并变为$p'$。

行为等价会说明有意忽略这些系统之间的哪些差异：

*   **线性时间观察**沿着已完成或部分执行记录发生的事件
*   **分支时间观察**还会保留何时出现了哪些选择，以及选择何时确定

因此，两个系统可能有相同轨迹，却具有不同分支结构。一个系统可能在交互前就在两个动作间选择，另一个系统则推迟到交互之后才选择。动作序列相同，但后续可能性不同。

van Glabbeek 提出的[线性时间—分支时间谱](https://ir.cwi.nl/pub/5685/5685.pdf)，系统整理了这些行为等价关系。它并非从弱到强的排序；谱系中的每一点都保留不同的观察。

## Rust 程序中的分支 {#branching-in-rust-programs}

`if`会根据条件选择一个分支：

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

`match`会根据某个值选择一个分支：

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

对于确定性语言中的固定输入，这些构造会选择可预测的控制流路径。这种性质称为**确定性**，而非合流性。

## 合流性的含义 {#what-confluence-means}

如果某个项的两种归约方式最终能够再次汇合，那么该归约关系就是合流的：

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

形式化地说，若：

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

则必然存在某个`d`，使得：

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

合流性允许存在多条归约路径。它表示这些路径能够到达共同后继，因此彼此兼容。

## 确定性与合流性 {#determinism-and-confluence}

确定性归约关系中，每个状态最多只有一个后续步骤。因此它自然满足合流性：没有相互竞争的单步选择需要协调。

反过来则不成立。系统可以允许多种归约顺序，同时仍满足合流性，因为所有顺序最终都会得到相同结果。

普通 Rust 的`if`与`match`表达式展示了确定性选择，但单凭它们无法体现合流性的有趣之处。

## Church–Rosser 性质 {#churchrosser}

Church–Rosser 定理说明了 lambda 演算归约的合流性质。如果一个项沿不同归约路径得到两个结果，那么这两个结果存在共同归约结果。

只要范式存在，合流性就意味着它唯一。这支持等式推理，因为求值顺序不会改变最终范式。

不要将此结果推广到任意命令式程序。副作用、非确定性调度、失败以及对中间状态的观察，都可能使不同归约顺序产生差异。

## 轨迹 {#traces}

**轨迹**记录一系列可观察动作或状态。与只记录结果的语义相比，轨迹语义有意保留更多操作信息。

两个纯函数可以返回同一结果，却经过不同内部步骤。如果结果指称忽略了这些步骤，它们在该指称下相等；但在轨迹语义下，它们未必相等。

存在效应时，调整检查顺序可能改变观察：

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

先检查`is_admin`还是先检查`is_user`，可能返回等价分类，却打印出不同轨迹。

设计问题在于，这些打印信息是否属于所选语义域。

## 轨迹等价 {#trace-equivalence}

如果两个系统在选定的轨迹模型下允许相同的可观察轨迹，它们就是轨迹等价的。

轨迹等价可能忽略分支结构。两个系统可以生成相同轨迹，但一个比另一个更早确定选择。在交互式与并发系统中，这种区别可能很重要。

## 双模拟 {#bisimulation}

双模拟逐步关联两个迁移系统。每当一个系统执行可观察动作，另一个系统就必须能够匹配该动作，而且转换后的状态仍须保持关联。

常见变体包括：

*   **强双模拟**，用于匹配单个状态转换
*   **弱双模拟**，用于抽象选定的内部转换
*   **分支双模拟**，用于抽象内部工作，同时保留重要的选择结构

双模拟通常比轨迹等价提供更强的行为比较，因为它会观察交互过程中各种选择是否仍然可用。

<details>
<summary><strong>起源与形式定义</strong></summary>

Milner 在[*《通信系统演算》*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)中为通信过程发展了观察等价。随后 Park 在[*《无限序列上的并发与自动机》*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)中，以余归纳方式刻画了相应的等价关系，给出了现称为双模拟的最大不动点关系与证明方法。Milner 随后采用并发展了这一方法，将其作为推理过程行为的基础。

<strong>强双模拟。</strong>对于标记迁移系统，若关系$R$满足以下条件，则它是强双模拟：当$p\mathrel{R}q$成立时，对于每个动作$a$：

*   如果$p\xrightarrow{a}p'$成立，则存在某个$q'$，使得$q\xrightarrow{a}q'$与$p'\mathrel{R}q'$成立；并且
*   如果$q\xrightarrow{a}q'$成立，则存在某个$p'$，使得$p\xrightarrow{a}p'$与$p'\mathrel{R}q'$成立。

如果存在某个双模拟关系关联两个状态，那么它们就是双模拟等价的。这一定义是余归纳的：匹配某个状态转换后，后继状态必须再次满足相同的行为义务。

<strong>分支双模拟。</strong>在一种忽略发散的常见表述中，如果对称关系$R$满足以下条件，那么它就是分支双模拟：当$p\mathrel{R}q$与$p\xrightarrow{a}p'$成立时，以下情况至少一种成立：

*   $a = \tau$与$p'\mathrel{R}q$成立；或
    
*   存在状态$q_0$与$q'$，使得
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

这里，$\xRightarrow{\tau}$表示零次或多次内部转换。要求中间状态$q_0$仍与$p$保持关联，正是为了忽略内部工作时仍能保留相关的分支可能性。van Glabbeek 与 Weijland 在[*《双模拟语义中的分支时间与抽象》*](https://ir.cwi.nl/pub/5564/5564D.pdf)中引入并发展了这一等价关系。

</details>

## 指称相等 {#denotational-equality}

指称相等取决于所选语义域：

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

语义域本身可以由轨迹、按双模拟等价取商后的迁移系统、结果集合或其他数学模型构成。指称设计不规定某个通用等价关系，而是要求明确选择等价关系，并以组合方式使用它。

其关系如下：

1.  从操作系统开始。
2.  选定相关观察。
3.  选择语义域与等价关系。

## 作为数据的分支 {#branching-as-data}

分支也会以树的结构出现。二叉路径可以表示为一串左右选择。这种表示适用于前缀树、执行标识符、决策图与内存寻址。

[《为何含义优先》](../denotational-design/semantic-view.md)中的语义分支位置示例，特意将树的含义与一种位向量编码区分开来。

Conal Elliott 曾用完美二叉叶树结构描述内存寻址。重点并不是每台机器都会按字面存储一棵源级树，而是组合式树模型能够揭示扁平数值地址所隐藏的有用结构。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott——将内存寻址视为完美二叉叶树</figcaption></figure>

## 对比 {#comparison}

| 概念 | 研究对象 | 核心问题 |
| --- | --- | --- |
| 控制流分支 | 一次程序执行 | 会选择哪个延续？ |
| 确定性 | 转换关系 | 下一步是否由当前状态唯一决定？ |
| 合流性 | 归约关系 | 不同归约路径能否汇合？ |
| 轨迹等价 | 可观察动作序列 | 系统是否允许相同轨迹？ |
| 双模拟 | 分支转换结构 | 系统能否匹配彼此的动作？ |
| 指称相等 | 所选语义域 | 程序是否具有相同的指定含义？ |

这些概念可以相互支持，但不能彼此互为同义词。

## 延伸阅读 {#further-reading}

*   [*《通信系统演算》*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)——Milner 对 CCS 与观察等价的奠基性论述
*   [*《无限序列上的并发与自动机》*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)——Park 对双模拟的余归纳刻画
*   [*《非确定性与并发的代数定律》*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf)——Hennessy 与 Milner 关于观察同余与代数定律的论述
*   [*《什么是分支时间，为什么要使用它？》*](https://theory.stanford.edu/~rvg/branching/)（[压缩版 PDF](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)）——简明阐述保留分支结构的动机
*   [*《线性时间—分支时间谱》*](https://ir.cwi.nl/pub/5685/5685.pdf)——行为等价的标准分类
*   [*《双模拟语义中的分支时间与抽象》*](https://ir.cwi.nl/pub/5564/5564D.pdf)——分支双模拟的奠基性论述
*   [*《分支双模拟的三种逻辑》*](https://ir.cwi.nl/pub/1370/1370D.pdf)——通过 Hennessy–Milner 风格逻辑与不含下一时刻运算符的 CTL\* 给出逻辑刻画
