<!-- reader: {"title":"去函数化"} -->

# 去函数化 {#defunctionalization}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[一阶程序](../rust-dd/first-order-programs.md)、[语言与编译器流水线](../rust-dd/compiler-pipelines.md)  
概念：[自由单子](free_monad.md)、[延续传递风格](cps.md)  
洞见：[EVM 代数](../insights/evm-alg.md)
```

```admonish note title="语义定位"
去函数化会改变表示，同时力求保留函数应用的行为。在语义优先设计中，当另一个解释器需要在执行前检查或组合操作时，生成的一阶值就很有用。
```

## 定义 {#definition}

去函数化是一种程序变换：它将高阶函数替换为表示可能函数集合的一阶数据结构，并提供一个应用这些函数的解释器函数。

## 动机 {#motivation}

有些语言、编译器或运行时无法高效处理高阶函数，甚至完全不支持。通过去函数化，程序会变成纯一阶形式，因此更容易编译、分析、序列化，或在受限环境中运行。

## 处理过程 {#the-process}

1.  找出所有可能被创建并传递的高阶函数。
2.  为每个函数分配枚举或和类型中的唯一标签，并附上它运行时所需的数据。
3.  用这些标签替换函数值。
4.  定义一个`apply`函数，接收标签与函数参数，然后按标签进行模式匹配并运行相应代码。

## Rust 示例 {#example-in-rust}

之前：使用闭包

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

之后：去函数化形式

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## 性质 {#properties}

*   现在所有函数都由简单数据表示。
*   程序变为纯一阶形式。
*   `apply`函数取代直接的函数调用。

## 应用 {#applications}

*   简化编译器后端：许多编译器会生成 CPS 代码，然后对其去函数化。
*   函数序列化：可以通过网络发送枚举标签，也可以将其存入文件。
*   静态分析：一阶代码更容易推理。
*   推导解释器：去函数化会自然引出解释器模式。

## 与 CPS 的关系 {#relation-to-cps}

在 CPS（延续传递风格）中，延续是高阶函数。对 CPS 代码去函数化，会将这些延续转换为枚举中的有限分支集合，并提供一个应用函数。

## 与自由单子的关系 {#relation-to-free-monads}

适当的自由单子表示可以与 CPS 变换程序中的去函数化延续相关联。这是一种紧密联系，但不意味着两种构造普遍等同。

## 类型层面的应用 {#type-level-application}

去函数化还可以在不原生支持高阶类型的语言中编码类型层面的应用。[C# 对象代数实验](https://github.com/tgrospic/object-algebras)通过`App<F, a>`运用这种轻量级编码，以表达函子、适用函子、单子与效应代数。

## 参考文献 {#references}

*   Reynolds, J. C.（1972）。*《高阶编程语言的定义解释器》*。  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J. 与 White, L.（2014）。*《轻量级高阶类型多态》*（使用去函数化来编码类型层面的应用）。  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
