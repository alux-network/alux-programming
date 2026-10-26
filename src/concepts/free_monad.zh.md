<!-- reader: {"title":"自由单子"} -->

# 自由单子 {#free-monad}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[一阶程序](../rust-dd/first-order-programs.md)、[解释器与效应](../rust-dd/interpreters.md)  
概念：[延续传递风格](cps.md)、[去函数化](defunctionalization.md)  
洞见：[EVM 代数](../insights/evm-alg.md)
```

```admonish note title="语义定位"
自由单子是一种表示指令语法与自由生成的顺序组合的方式。指令函子已经选定了词汇；随后，解释器会将该语法映射到某个语义域。它是一种强大的编码方式，但并非指称设计的定义。
```

## 什么是自由单子（Rust 版本） {#what-is-a-free-monad-rust-version}

**自由单子**可以让你：

*   **描述**程序时使用*数据*，而非立即运行程序。
*   稍后以一种或多种方式**解释**该程序。

可以将它想成：

> 一个效应操作 AST + 用于串接步骤的`bind`/`flat_map`。

将以下两者分开：

*   **语法** → 指令枚举。
*   **解释** → 映射到所选语义域并保留结构。

“自由”意味着单子结构由函子`F`自由生成，除了单子定律之外不添加其他等式。选择`F`本身就决定了指令语法；对结果程序作出解释，则会赋予其特定指称。

## Rust 实现 {#rust-implementation}

```admonish warning title="示意性编码"
Rust 不支持直接的高阶类型参数，因此生产级自由单子编码需要额外的类型机制，或专用指令函子。以下代码展示预期结构，并非可直接使用的泛型实现。
```

### 自由单子类型 {#free-monad-type}

```rust,noplayground
#[derive(Clone)]
enum Free<F, A> {
    Pure(A),
    Suspend(F),
    FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>),
}

impl<F: Clone + 'static, A: 'static> Free<F, A> {
    fn pure(a: A) -> Self {
        Free::Pure(a)
    }

    fn flat_map<B: 'static, G>(self, f: G) -> Free<F, B>
    where
        G: Fn(A) -> Free<F, B> + 'static,
        F: 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            Free::Suspend(op) => {
                Free::FlatMap(Box::new(Free::Suspend(op)), Box::new(f))
            }
            Free::FlatMap(inner, g) => {
                Free::FlatMap(inner, Box::new(move |x| g(x).flat_map(f.clone())))
            }
        }
    }
}
```

### 领域特定语言：控制台操作 {#dsl-console-operations}

```rust,noplayground
#[derive(Clone)]
enum Console<A> {
    Print(String, A),
    ReadLine(fn(String) -> A),
}

// Smart constructors
fn print_line(s: &str) -> Free<Console<()>, ()> {
    Free::Suspend(Console::Print(s.to_string(), ()))
}

fn read_line() -> Free<Console<String>, String> {
    Free::Suspend(Console::ReadLine(|input| Free::Pure(input)))
}
```

### 解释器 {#interpreter}

```rust,noplayground
fn run_console<A>(mut prog: Free<Console<A>, A>) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(Console::Print(s, next)) => {
                println!("{}", s);
                prog = Free::Pure(next);
            }
            Free::Suspend(Console::ReadLine(f)) => {
                let mut buf = String::new();
                std::io::stdin().read_line(&mut buf).unwrap();
                prog = f(buf.trim().to_string());
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op), // minimal handling
                _ => unimplemented!(),
            },
        }
    }
}
```

### 用法 {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## 要点 {#takeaway}

*   **语法** = `enum Console`（可能的指令）
*   **程序** = `Free<Console, A>`（描述步骤的数据）
*   **具体解释** = `run_console`
*   优势：同一个程序可以编写多种解释器，例如在真正的 IO 中运行、将日志写入文件，或编译为另一种语言。

## 与延续及 CPS 的关联 {#correlation-to-continuations-and-cps}

<strong>延续传递风格（CPS）</strong>是一种编程方式：函数不直接返回值，而是将结果传给另一个函数（即*延续*），由它表示“程序接下来的部分”。

**自由单子**本质上是**由一系列步骤组成的程序**，每一步都会说：

> “执行此操作，然后继续处理剩余部分。”

这个“程序剩余部分”正是一个**延续**——从当前结果映射到下一步的函数。

*   在我们的 Rust 自由单子中：
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>`**就是延续**。
    
*   解释自由单子时，你其实是在**通过 CPS 运行**：
    
    *   你不会直接返回值，而是将它们传给下一个延续。
    *   最终会进入如下循环： `current_instruction -> feed result into continuation -> next instruction`
*   **CPS 关系**：
    
    *   自由单子*将 CPS 编码进数据结构*。
    *   CPS *则是同一思想的运行时控制流表示*。

**快速对照**：

| 概念 | 在 CPS 中 | 在自由单子 AST 中 |
| --- | --- | --- |
| 步骤结果 | 延续的参数 | `A`在`Fn(A) -> Free`中 |
| 延续 | 函数`(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| 程序 | 嵌套延续 | 嵌套的`FlatMap`变体 |
| 执行 | 调用函数 | 模式匹配并调用 |

## GoF（四人帮）设计模式映射 {#gof-gang-of-four-design-patterns-mapping}

自由单子**并不属于**GoF，因为它来自函数式编程理论，但可以**涵盖**或**模拟**若干模式：

| GoF 模式 | 自由单子与该模式的关系 |
| --- | --- |
| **解释器** | 整个“AST + 运行”就是字面意义上的解释器模式——自由单子直接提供 AST 与组合器。 |
| **命令** | DSL 中的每个`enum`变体都是一个命令对象。自由单子会像宏命令一样串接它们。 |
| **组合** | AST 结构（嵌套指令）是命令的组合体。 |
| **构建器** | `.flat_map`链式调用为程序提供了流畅的构建器。 |
| **访问者** | 解释器本质上是指令集的访问者。 |

## 为什么自由单子优于这些模式 {#why-free-monad--these-patterns}

*   GoF 模式是**手动的面向对象工作**——需要自行定义接口、类并将它们组合起来。
    
*   自由单子是**代数式的**——为指令定义*数据*，为其解释定义*函数*。
    
*   你会自动获得：
    
    *   顺序组合（`flat_map`）
    *   组合
    *   无需触碰核心逻辑即可使用多种解释器

**汇总表**：

| 自由单子（函数式编程概念） | 对应的 GoF/面向对象模式 |
| --- | --- |
| 指令枚举 | 命令 |
| 程序 AST | 组合体 |
| `flat_map`构建器 | 构建器 |
| 解释器函数 | 解释器/访问者 |
| 多种解释器 | 策略 |

## 与去函数化的关系 {#relation-to-defunctionalization}

**去函数化**是一种程序变换：它将高阶函数替换为表示可能函数集合的一阶数据结构，并提供一个用于应用它们的解释器。

在 CPS 中，延续是高阶函数。对 CPS 程序去函数化，会将这些延续替换为延续分支枚举，并提供一个`apply`函数来运行它们。

对于适当的编码，自由单子可以与 CPS 变换程序内部的去函数化延续联系起来：

1.  从程序的 CPS 版本开始。“程序剩余部分”由延续函数承载。
2.  将这些延续函数去函数化为数据类型中的有限分支集合。
3.  所得的一阶数据类型可以具有与自由单子表示相同的指令与延续结构。

**关键相似之处**

*   自由单子与去函数化都会生成计算的数据表示，并且都需要解释器来赋予这些数据含义。
*   自由单子中的`FlatMap`分支持有延续；去函数化则将该闭包替换为数据类型中的一个分支。

**关键区别**

| 方面 | 去函数化 | 自由单子 |
| --- | --- | --- |
| 目的 | 消除高阶函数的机械式编译器技术 | 将语法与语义分离的代数构造 |
| 输入 | 任意高阶程序，通常采用 CPS 形式 | 描述可能指令的函子 F |
| 输出 | 函数分支枚举及应用函数 | `Free<F, A>`AST 与解释器 |
| 是否为单子？ | 不一定 | 根据构造始终是单子 |
| 范围 | 通用变换 | 特定的函数式编程模式 |

**总结** 去函数化是一种变换技术，自由单子是一种代数构造。在某些表示中二者关系密切，但除非附加额外假设，否则通常不能由其中一种构造推出另一种。
