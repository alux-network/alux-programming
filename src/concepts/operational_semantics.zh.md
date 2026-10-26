<!-- reader: {"title":"操作语义"} -->

# 操作语义 {#operational-semantics}

```admonish tip title="相关内容"
语义视角：[指称设计](../denotational-design/design.md)  
Rust 中的语义驱动设计：[语言与编译器流水线](../rust-dd/compiler-pipelines.md)  
概念：[自由单子](free_monad.md)、[延续传递风格](cps.md)、[去函数化](defunctionalization.md)  
洞见：[从语义到机器](../insights/operational_semantics.md)
```

## 定义 {#definition}

**操作语义**通过求值判断或**配置**之间的状态转换来描述程序行为。配置可能包含程序片段，以及环境、存储、延续或其他抽象机器状态。

这种描述具有数学性质：它陈述哪些求值或状态转换有效。解释器或虚拟机可以实现这些规则，但某个具体实现本身并非定义。

```admonish note title="语义定位"
操作语义是一种精确的语义，不只是非正式的实现细节。它通过求值规则或状态转换规则说明行为。[指称设计](../denotational-design/design.md)提出了一个互补且更早的设计问题：这些规则应保留哪些可组合含义与等式？
```

## 操作语义的形式 {#styles-of-operational-semantics}

### 小步操作语义（结构操作语义） {#small-step-structural-operational-semantics}

计算被拆分为原子转换：

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

适用于建模并发、交错执行与部分执行。

### 大步操作语义（自然语义） {#big-step-natural-semantics}

根据最终结果描述求值：

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

推理终止程序时通常更清晰。

## 形式规则 {#formal-rules}

操作语义通常采用**推理规则**给出。对于简单算术语言：

$$ E ::= n \mid E + E $$

从左到右求值时，需要三条规则：

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

前两条规则确定下一个可归约子表达式。两个操作数都成为值后，第三条规则执行加法。

求值轨迹：

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## 为何重要 {#why-it-matters}

*   提供**精确的类机器模型**来描述执行。
*   为解释器与虚拟机奠定基础。
*   支持对正确性、资源使用与安全性的推理。

## 与其他概念的关系 {#relation-to-other-concepts}

*   **自由单子**提供指令语法与顺序组合。操作规则可以描述该表示中的程序如何求值。
*   **CPS**将计算剩余部分显式表示为延续。操作规则可以描述值如何传递给这些延续。
*   **去函数化**会将已知函数族替换为一阶数据，并提供一个`apply`操作。操作规则可以描述由此产生的显式机器状态。

这些都是可以赋予操作语义的对象与变换，本身并不是操作语义。

## 实践中的应用 {#in-practice}

操作规则可以指导解释器实现，并提供一个用于检查实现的精确模型：

*   **EVM**可以自然地建模为小步状态转换系统；也可以通过大步判断描述完整的终止执行。
*   小步规则通常与 Rust 解释器中的`match`分支非常相似。

$$ n_1 + n_2 \to n_3 $$

上文完整的从左到右求值关系可以表示为 Rust 代码：

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

这个函数执行一次状态转换。重复应用即可得到所示轨迹；返回`None`表示表达式已经是一个值。

## 操作问题与指称问题 {#operational-and-denotational-questions}

操作规则可以证明安全性、进展性质、资源上限以及与实现的对应关系。如果在预期的抽象含义明确之前就选定了操作机制，限制便会显现：实现选择可能意外变成语义承诺。

指称设计并不否定操作语义。它要求先陈述语义域、组合与定律，再将操作模型与其关联起来。

| 视角 | 问题 |
| --- | --- |
| 指称 | 整个程序意味着什么？ |
| 操作 | 通过哪些状态转换求值？ |
| 正确性 | 这些状态转换是否保留了预期含义？ |

以下片段用于说明，将操作描述视为唯一洞见来源的危险。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作描述并非全部含义（1/2）</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作描述并非全部含义（2/2）</figcaption></figure>
