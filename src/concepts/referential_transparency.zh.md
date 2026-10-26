<!-- reader: {"title":"引用透明性","sourceHash":"sha256:cf7ad00c5e2f7e6e1da3d3f18d03b6ec9ec16d836e412d29a99f0fa801064234"} -->

# 引用透明性 {#referential-transparency}

```admonish tip title="相关内容"
语义视角：[指称与组合性](../denotational-design/denotations.md)、[定律与解释](../denotational-design/laws-and-interpretations.md)  
洞见：[重新审视引用透明性](../insights/referential-transparency.md)
```

```admonish note title="语义定位"
引用透明性取决于所选指称与等价关系。当替换表达式不会改变指定含义时，它允许进行替换，即使语义边界背后的实现操作有所不同。
```

引用透明性（RT）是表达式的替换性质：可以用一个表达式的指称替换该表达式，而不改变程序含义。

如今，实践中通常将 RT 作为等式推理、安全重构与定律驱动 API 设计的基础。

## 核心含义 {#core-meaning}

RT 表示：

*   如果`e`指称`v`
*   那么，以`v`代替`e`会保留含义

这是语义主张，而非编码风格口号。

### 纯性 {#purity}

纯函数对相同输入总是返回相同输出，并且没有可观察的副作用。RT 是表达式的替换定律：用其指称替换表达式必须保留含义。因此，纯函数是实践中实现 RT 的一种常见方式，而 RT 是更广泛的语义标准。关于指称设计中纯性与 RT 的区别，请参阅[《重新审视引用透明性》](../insights/referential-transparency.md)。

## 历史背景 {#historical-context}

在编程语言语义中，RT 与 Christopher Strachey 的表述密切相关。他的论述将值推理与以更新为主的行为区分开来：

*   **R 值**：表达式的值。
*   **L 值**：可以赋值的位置。

关键在于：当我们进行值层面的推理时，表达式级别的替换是稳定的。赋值会引入位置更新，使替换推理变得困难，甚至不再以朴素形式成立。

## 这里的赋值与副作用意味着什么 {#what-assignment-and-side-effects-mean-here}

在此上下文中：

*   **赋值**是对某个位置进行更新（例如`x := x + 1`）
*   **副作用**是返回值之外任何可观察的变化

赋值是一种特定的副作用。

这就是 RT 在许多命令式环境中失效的原因：求值可能依赖或改变表达式显式值接口以外的可观察上下文。

## 现代语言如何呈现 RT {#how-modern-languages-present-rt}

### Haskell {#haskell}

纯表达式通常被当作默认推理对象来教授 RT。效应通过类型化构造显式表达（例如`IO`、状态传递及相关抽象），所以替换定律在日常使用中居于核心地位。

### Scala（Cats / Cats Effect） {#scala-cats--cats-effect}

在 Scala 函数式编程实践中，Cats Effect 提供了最常见的 RT 解释方式：

*   `IO[A]`是对带效应工作的纯描述
*   组合`IO`值满足 RT
*   在运行时边界显式执行（`unsafeRun*`）

Cats Effect 也将其与急切求值`Future`作对比，这也是 Scala 中讨论 RT 时强调惰性与延迟执行的原因之一。

## 当代的 RT {#rt-today}

在现代生态系统中，RT 常被用作“行为可安全替换”的简称。 在多范式系统中，团队通常会将 RT 主张应用于特定模块、API 或带效应类型的区域，而不是全局套用于所有代码。

关于 RT 在指称设计中的解读，请参阅[《重新审视引用透明性》](../insights/referential-transparency.md)。

## 参考文献 {#references}

*   Strachey, C. *《编程语言的基本概念》*（牛津 PRG 讲义，1967）。  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Cats Effect 文档：`IO`数据类型及 RT/惰性求值说明。  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Typelevel 博客：*《Cats 的 IO 单子》*（讨论 Scala 的副作用与 RT 动机）。  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
