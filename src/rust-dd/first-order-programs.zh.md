<!-- reader: {"title":"一阶程序"} -->

# 一阶程序 {#first-order-programs}

```admonish tip title="相关内容"
Rust 中的语义驱动设计：[派生含义与组合](derived-meaning.md)、[语言与编译器流水线](compiler-pipelines.md)  
概念：[延续传递风格](../concepts/cps.md)、[去函数化](../concepts/defunctionalization.md)、[自由单子](../concepts/free_monad.md)  
洞见：[重新审视表达式问题](../insights/expression-problem.md)
```

```admonish note title="何时将应用具体化为数据"
普通函数与扩展已经可以表达派生行为。只有当另一个解释器必须在运行前检查、组合、序列化或编译程序时，才应将应用转换为一阶数据。
```

普通函数与扩展方法通常是表达派生行为的最佳方式。但有时另一个解释器必须在执行程序之前，先检查、组合、生成文档、序列化或编译程序结构。这时，应用本身必须成为一阶数据。

## 执行会抹去结构 {#execution-erases-structure}

考虑：

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

调用此方法会得到一个状态。调用开始后，外部解释器通常无法再恢复以下信息：

*   语义上下文类型
*   有序参数
*   源参数名称
*   结果类型
*   操作的身份

这些信息原本存在于源代码级别的函数类型中，但普通执行过程会消耗掉它们。

## 对应用进行去函数化 {#defunctionalizing-application}

去函数化会将某个已知函数族中的成员替换为一阶标签，并提供一个共享的应用操作。

一组最小操作词汇如下：

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

零大小的`CurrentStatusOperation<App>`可以表示对原扩展方法的调用。它应当调用该方法，而不是包含一份重复的函数体。

1.  从扩展方法开始。
2.  将其具体化为操作类型。
3.  保留其上下文、参数乘积、参数名称与输出。
4.  通过`ApplyAlg`对其进行解释。

普通调用仍可使用原有便捷方法。只有需要一阶结构的上下文才会用到操作值。

## 没有使用者时，不要具体化为数据 {#do-not-reify-without-a-consumer}

一阶程序会增加类型机制。只有当它们能支持真正的第二种解释时才使用：

*   运行时注册
*   生成文档或模式
*   静态检查
*   执行前组合程序
*   序列化
*   编译

如果代码只需调用函数，就保留函数即可。

## 可移植接口程序 {#portable-interface-programs}

假设 HTTP 接口包含：

| 方法 | 路径 | 输入 | 操作 | 输出 |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | 正文：`f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | 流式文件 |

可移植程序必须保留：

*   方法与路径选择器
*   输入角色，例如路径、查询参数、正文、请求头与身份验证
*   操作值
*   输出角色，例如 JSON 或文件
*   路由合并与嵌套

不应保留某个特定框架的请求、路由器或响应类型。

一种流畅记法可以是：

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

这些流畅调用会构造一个有类型的程序，不必立即注册服务器路由。

## 一个程序，多种折叠解释 {#one-program-several-folds}

同一个一阶程序可以支持多种解释：

| 程序 | 解释 |
| --- | --- |
| 有类型的 HTTP 程序 | 文本文档、可执行路由、OpenAPI 元数据、客户端绑定、符合性测试 |
| 有类型的 JSON-RPC 程序 | 方法注册表、模式、客户端、测试框架 |

不要为执行与文档分别维护路由或方法清单，否则会产生彼此竞争的规范。

## 输入与输出角色 {#input-and-output-roles}

操作已经知道自身的参数与结果类型。传输声明只应添加传输含义。

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`、`query`和`json`用于标识角色，不应要求作者重新声明已经由`ApplyAlg`决定的输出类型。

输出转换属于传输解释器。服务器可以将一种结果转换为 JSON，将另一种结果转换为流式附件。语义操作无需了解任何一种表示。

## 组合本身就是程序含义 {#composition-is-program-meaning}

程序应保留通用组合操作：

*   空程序
*   合并程序
*   将程序嵌套在某个前缀下
*   将端点提升为程序

这些操作比某个框架的路由器方法更基础。熟悉的流畅名称，例如`get`、`post`、`merge`和`nest`，都可以作为中性代数的别名。

独立规范可以发布小型程序：

| 输入程序 | 组合 | 结果 |
| --- | --- | --- |
| 状态与下载程序 | 合并 | 服务程序 |
| 目录程序 | 嵌套 | 服务程序 |

应用程序负责选择并解释最终的组合。

## 宏必须展开为公开的语义结构 {#macros-must-lower-to-public-meaning}

Rust 宏可以让一阶声明更加简洁：

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

只有当宏展开后得到公开且可手动构造的一阶程序时，宏设计才算健全。生成的回调不应成为接口的唯一规范定义。

良好方向：

1.  便捷语法
2.  公开的操作值与程序值
3.  泛型折叠解释
4.  具体框架

表示优先的方向：

1.  框架注解
2.  不透明的生成回调
3.  逆向整理的文档

## 与既有概念的关系 {#relation-to-existing-concepts}

一阶接口程序建立在其他章节介绍的技术之上：去函数化是通用变换；可扩展语法与解释对应表达式问题；自由单子则是一种特定的“带顺序的语法”表示。页面顶部的“相关内容”链接可以跳转到各自章节。

不要把这些技术等同于指称设计本身。指称设计决定哪些结构很重要；当普通调用会抹去这些结构时，一阶表示负责保留它们。

## 审查要点 {#review-checks}

*   是否有真实的第二种解释器需要将程序具体化？
*   操作是否调用作者定义的方法，而非复制其实现？
*   参数与输出是否从操作中推断得出？
*   传输语法是否只添加了传输角色？
*   程序是否可以在不使用便捷宏的情况下构造？
*   运行时与元数据是否解释同一个程序？
