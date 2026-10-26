<!-- reader: {"title":"延续传递风格"} -->

# 延续传递风格（CPS） {#continuation-passing-style-cps}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[一阶程序](../rust-dd/first-order-programs.md)、[语言与编译器流水线](../rust-dd/compiler-pipelines.md)  
概念：[自由单子](free_monad.md)、[去函数化](defunctionalization.md)  
洞见：[EVM 代数](../insights/evm-alg.md)
```

```admonish note title="语义定位"
CPS 是一种表示与程序变换，它会将控制流显式化。它是否保留含义，取决于是否明确了源语义、目标语义及二者之间的对应关系。
```

## 定义 {#definition}

延续传递风格（CPS）是一种编程方式：函数不直接返回值，而是将结果传给另一个称为*延续*的函数；延续表示程序接下来的部分。

## 动机 {#motivation}

*   使控制流显式且可编程。
*   支持非阻塞 IO、提前退出、协程、回溯与并发调度等高级变换。
*   用于编译器中间表示，以简化优化与分析。

## 基本形式 {#basic-form}

直接风格：

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

CPS 风格：

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

这里，`k`是延续。我们不再返回`x + 1`，而是调用`k(x + 1)`。

## 关键性质 {#key-properties}

*   所有函数调用都是对延续的*尾调用*。
*   当前计算永远不会“返回”到调用者，而是跳入延续。
*   程序中的控制流变得显式。

## 与高阶函数的关系 {#relation-to-higher-order-functions}

*   在 CPS 中，延续就是高阶函数。
*   计算的每个步骤都会接收一个延续，用来表示下一步要做什么。

## 与去函数化的关系 {#relation-to-defunctionalization}

*   在 CPS 中，延续是实际的函数值。
*   去函数化会把延续函数替换为表示可能后续步骤的数据结构（枚举），并提供一个`apply`函数来解释这些步骤。

## 与自由单子的关系 {#relation-to-free-monads}

*   自由单子中的`FlatMap`构造器恰好存储了一个延续。
*   解释自由单子类似于执行 CPS 代码，只不过延续成为程序数据的一部分。
*   适当的自由单子编码可以与 CPS 以及去函数化的延续表示建立联系。

## 优点 {#advantages}

*   控制流表示灵活。
*   更容易推理求值顺序。
*   适用于实现解释器、调试器、优化器与异步运行时。

## 缺点 {#disadvantages}

*   比直接风格冗长。
*   对人来说可能更难阅读。
*   在不提供原生支持的语言中，需要尾调用优化才能获得较高效率。
