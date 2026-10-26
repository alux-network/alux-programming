<!-- reader: {"title":"重新审视引用透明性"} -->

# 重新审视引用透明性 {#referential-transparency-reloaded}

```admonish tip title="相关内容"
语义视角：[指称与组合性](../denotational-design/denotations.md)、[定律与解释](../denotational-design/laws-and-interpretations.md)  
Rust 中的语义驱动设计：[能力代数](../rust-dd/capability-algebras.md)、[派生含义与组合](../rust-dd/derived-meaning.md)  
概念：[引用透明性](../concepts/referential_transparency.md)
```

本页介绍*引用透明性*的指称设计解读。 概念页讨论其历史与主流语言中的用法。 本页重点说明 RT 作为设计约束时的含义。

在指称设计中，RT 并非纯性标签。 它是关于指称的一条定律：替换必须保留指定含义。

## 以指称设计重新表述 RT {#denotational-design-restatement-of-rt}

指称设计将 RT 重新表述为规范要求，而非实现风格。 规范必须先定义可组合含义；之后才选择执行策略。

因此，应在语义边界检查 RT：

*   相同输入
*   相同的已声明上下文
*   相同指称

若这些条件成立，替换就是有效的，并且可以进行等式推理。 即使具体解释器执行 I/O、并发、重试或状态转换，这一点仍然成立，因为这些细节都委托给规范能力边界之后的实现。

换言之，指称设计不会问“这个实现是否纯？”。 它会问“指称等式是否明确？解释器是否保留了这些等式？”

## 纯性与 RT {#purity-and-rt}

RT 与纯性相关，但并不相同。

*   **RT**是关于含义的一条替换定律。
*   **纯性**是一项操作约束：不存在隐藏的可观察效应。

纯性是表达式级代码实现 RT 的常见方式。 但 RT 仍是语义标准：替换必须保留指定指称。

因此，指称设计不会把 RT 变成“只能写纯代码”这样的风格标签。 它要求指称等式明确，并将效应隔离在能力边界之后。

一种最简语义解读是：

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

对于相同的`a`和相同的`io`输入，`f`会得出相同的`(result, io')`。 这是指称设计中按上下文索引的替换推理形式。

## RT 为何因此更清晰 {#why-this-clarifies-rt}

许多关于 RT 的争论混淆了一项有用区别：

*   语义透明性
*   操作性副作用

指称设计将这些层次分开：

*   语义核心陈述含义
*   解释器实现执行策略

这种区分既允许实际效应存在，也不会失去基于定律的推理。

## 表示优先设计的失误模式 {#representation-first-failure-mode}

如果过早确定具体表示，关于 RT 的讨论就会偏离到风格争论：

*   “这种风格是纯的”
*   “那种风格不纯”
*   “用 IO 包装器就能解决”

这些大多只是编码方式之争。 指称设计提出了一个更简单的问题： 你的规范中哪些等式有效？

## 指称设计的实用模式 {#practical-dd-pattern}

定义小型能力 trait，并将程序行为写成其上的扩展。 随后提供轻量级具体解释器。

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]`是来自[`extend`crate 的宏](https://docs.rs/extend/latest/extend/)，用于从`impl`块中生成扩展方法以减少样板代码；它不是新的 Rust 语言特性。

在 Scala 函数式编程中，RT 常通过`F[A]`类型的值来介绍（例如`IO[A]`或`F[Either[E, A]]`）。 这里的 RT 被表达在更高一层：作为受能力约束的程序含义。 因此，这种 Rust 方法并非以与`F[A]`相同的编码方式实现的 RT 值容器；它是在明确能力之上规范 RT 行为，并将具体效应委托给实现。

扩展依据能力陈述语义行为。 具体实现负责决定执行策略，例如批处理、重试、传输、并行与存储细节。

## 最终洞见 {#final-insight}

在指称设计中，RT 是语义规范的性质。 只要保留已陈述的指称定律，实现选择就是次要的。

保留定律。 不要困在标签之争里。
