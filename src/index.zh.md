<!-- reader: {"title":"ALUX 编程","parts":{"Welcome":"欢迎","The Semantic View":"语义视角","Design by Meaning in Rust":"Rust 中的语义驱动设计","Concepts":"概念","Insights":"洞见","Contributing":"参与贡献"},"sourceHash":"sha256:801d6c5e7d3e5862395c094158caadb1df71cec65054c97d146882cf39bd00dc"} -->

```admonish warning title="ALUX 项目"
ALUX 代码库仍在积极开发中，尚未公开。
```

# <img src="/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX 编程指南 {#alux-programming-guidelines}

```admonish note title="注"
本书将介绍理解并参与 ALUX 语义优先代码库所需的基础，从[指称设计](denotational-design/design.md)的一项核心原则讲起：先定义程序的含义，再决定程序如何运行。

沿袭 Conal Elliott 的思路，本书将计算视为清晰的数学对象，而不是不透明的步骤序列。

规范以简单、可组合的[能力 trait](rust-dd/capability-algebras.md)表达，用来描述程序*意味着什么*。[解释器](rust-dd/interpreters.md)提供可互换的方式来*实现*这些含义。

这样一来，软件的组合规则、实现义务和[有效等式](denotational-design/laws-and-interpretations.md)都更容易理解和测试。
```

```admonish quote title="机制与含义"
[概念](concepts/index.md)与[洞见](insights/index.md)用于说明实用的编程机制。[指称设计](denotational-design/design.md)则说明如何判断这些机制应当保留什么。
```

## 如何阅读本书 {#how-to-read-this-book}

本书分三个层次阅读：

*   [**语义视角**](denotational-design/semantic-view.md)介绍[指称与组合性](denotational-design/denotations.md)、[定律与解释](denotational-design/laws-and-interpretations.md)，以及含义与表示之间的关系。
*   [**Rust 中的语义驱动设计**](rust-dd/capability-algebras.md)将这一视角落实为[小型能力](rust-dd/capability-algebras.md)、[派生扩展](rust-dd/derived-meaning.md)、[一阶程序](rust-dd/first-order-programs.md)和[轻量级解释器](rust-dd/interpreters.md)。
*   [**概念**](concepts/index.md)与[**洞见**](insights/index.md)介绍重要的执行模型、编码、变换与联系。

语义原则不依赖特定语言。Rust 是主要实现语言；一条[并发语言处理流水线](rust-dd/compiler-pipelines.md)将这些原则与 Tolang 联系起来。

## 本书适合谁 {#who-this-book-is-for}

*   希望复杂软件在不断演进时仍能保持**模块化、可组合、可测试且易于维护**的程序员。
*   希望**连接范畴论、类型系统与程序设计**的开发者。
*   熟悉表示与操作技术的读者——例如[**自由单子**](concepts/free_monad.md)、[**延续传递风格（CPS）**](concepts/cps.md)和[**去函数化**](concepts/defunctionalization.md)——希望理解这些机制如何服务于语义优先设计，而非定义它。
*   熟悉[**依赖类型**](denotational-design/dependent-types.md)与证明导向编程，并希望在编写高性能 Rust 时运用这套思维方式的读者。
*   需要阅读[语义优先的 Rust 规范](rust-dd/capability-algebras.md)，并理解如何[编译并发语言](rust-dd/compiler-pipelines.md)，而不以编译器本身作为语言定义依据的贡献者。
