<!-- reader: {"title":"语言与编译器流水线","sourceHash":"sha256:6ea1059eeaf723738c4e5ac542c9655cd8810817064c0ae84ef41b42ab894190"} -->

# 语言与编译器流水线 {#language-and-compiler-pipelines}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[一阶程序](first-order-programs.md)、[解释器与效应](interpreters.md)  
概念：[操作语义](../concepts/operational_semantics.md)、[去函数化](../concepts/defunctionalization.md)  
洞见：[EVM 代数](../insights/evm-alg.md)
```

```admonish note title="含义并非流水线本身"
当语言含义不与解析器语法树、编译过程、字节码或机器循环混为一谈时，编译器就更清晰。正确性可由一条交换律表达：运行编译后的程序，应与该程序的指称一致。
```

如果语言含义不等同于解析器语法树、编译器过程、字节码或虚拟机循环，推理编译器就会容易得多。

本章采用一种类似 Tolang 的简化并发语言，重点放在语义架构上。

## 四个不同层次 {#four-distinct-layers}

请将以下层次分开：

1.  源语言语法
2.  规范化语言
3.  可执行表示
4.  机器执行

典型流水线如下：

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

便捷操作就是组合：

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

组合后的辅助函数并非每个阶段的语义定义。

## 语法尚未成为含义 {#syntax-is-not-yet-meaning}

解析器输出会映照语法选择：

*   标点
*   语法糖
*   优先级
*   源代码区间
*   生成的解析器表示

这些信息对诊断与工具很重要，但不必用来定义核心语言。

规范化会移除偶然的语法差异，并引入一种更精简、承载含义的形式。例如，多种表层绑定形式可以规范化为同一个核心限制操作。

**多种源形式** → **一个规范化构造**

这样一来，编译器后续阶段与运行时定律便有了统一的陈述位置。

## 指称含义与编译含义 {#denotational-and-compiled-meaning}

令：

$$ \llbracket - \rrbracket : Core \to D $$

在语义域`D`中赋予含义。

编译会生成可执行值：

$$ compile : Core \to Executable $$

执行时会观察这些值：

$$ run : Executable \to D $$

核心正确性义务是一张交换图：

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

对于非确定性或并发系统，等价关系可能是观察等价、结果集合、轨迹等价或双模拟，而非普通的值相等。必须由语义模型作出选择。

## 并发过程含义 {#concurrent-process-meaning}

基础反射演算包含以下思想：

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang 以组合方式扩展基础演算。其中一种扩展增加了表层形式

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

这个绑定会创建一个新通道，并将其名称的作用域限定在$P$之内；过程演算文献将此操作称为*限制*。反射核心没有基本限制运算符。参见 Meredith 与 Radestock 的论文[*《反射式高阶演算》*](https://doi.org/10.1016/j.entcs.2005.05.016)。

操作机器可以通过元组空间、队列、匹配索引、延续记录与并发任务来实现这些功能。这些机制并非语言定义。

语义层负责确定可观察的过程行为与结构定律。核心并行组合可能遵循以下定律：

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

这种新鲜绑定扩展还具有独立的定律。常见候选模式包括α 重命名、不同绑定的交换，以及作用域外提：

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

这里，$y \mathrel{\#} P$表示$y$对$P$来说是新鲜的；$P\{y/x\}$表示避免变量捕获的重命名；$\operatorname{FN}(P)$表示$P$中的自由通道名称集合。只有在选定的观察等价关系认可这些模式时，它们才成为定律；不能仅凭表层语法或某种字节码布局就作此假设。

## 规范化是一种保持含义的映射 {#normalization-as-a-meaning-preserving-map}

如果源程序`s₁`与`s₂`的区别仅在于所接受的语法糖，规范化就应显式呈现它们共同的含义：

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

其他有用的义务包括：

*   α 重命名保留规范化含义
*   词法作用域应绑定到预期的绑定项
*   诊断所需的源代码位置应予保留
*   编译期常量应被擦除，不产生运行时行为
*   畸形语法应依阶段契约累积诊断信息

有些项目要求规范化值具有规范形式，有些项目只要求语义等价。应明确选择哪一种。

## 阶段能力 {#stage-capabilities}

```admonish warning title="不要使用万能编译器对象"
不要让一个巨型编译器对象成为唯一的阶段接口。
```

规范化器可能需要以下能力：

*   读取并扩展绑定作用域
*   解析源代码名称
*   累积诊断信息
*   构造规范化项

代码生成器可能需要：

*   分配可执行引用
*   生成指令
*   解析规范化变量
*   完成可执行结构

将各阶段入口表达为基于这些能力的扩展。具体环境可以存储映射、区域分配器、计数器与诊断信息，但它们并不拥有阶段含义。

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

各编译器的精确能力名称会有所不同。重要的是依赖明确，阶段映射稳定。

## 解析器与运行时可以保持操作式设计 {#parser-and-runtime-can-remain-operational}

并非每个子系统都必须被强制纳入同一种编码。

解析器可能主要由生成式语法机制主导。虚拟机可能主要依赖高效的状态变更与调度。它们可以保留操作式设计，同时实现定义清晰的边界：

| 阶段 | 契约 |
| --- | --- |
| 解析器 | 生成`Syntax` |
| 规范化器 | 生成承载含义的`Core` |
| 代码生成器 | 以可执行形式保留含义 |
| 运行时 | 生成符合语言模型的观察 |

指称设计不会移除机器，而是防止机器悄然成为语言语义。

## 编译器定律与测试 {#compiler-laws-and-tests}

强有力的证据来自多个方面：

*   针对等价源形式的规范化定律
*   在预期情况下检查解析与漂亮打印的往返性质
*   比较直接语义求值与编译后执行
*   规范承诺规范输出时检查字节码等价
*   运行时符合性场景
*   跨解释器差分测试

```admonish warning title="字节相等不等于语义相等"
不要混淆逐字节相等与语义相等。只有当规范要求编译结果具有规范形式时，字节相等才是一项有用的更强性质。
```

## 这对读者有何帮助 {#how-this-prepares-the-reader}

阅读语义优先的语言实现时，请留意：

*   语义语法或能力 trait
*   派生的规范化操作
*   明确的阶段契约
*   一阶核心程序
*   替换、作用域与组合定律
*   解释阶段能力的轻量环境
*   位于边界处的操作式解析器、编译器与虚拟机机制

这个视角连接了一般的指称设计与 Tolang，展示语义边界如何引导语言设计、编译与运行时解释。
