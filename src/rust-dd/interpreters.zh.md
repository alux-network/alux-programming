<!-- reader: {"title":"解释器与效应","sourceHash":"sha256:4ca52b24121e8361c8cc8983e3807794110bade03c63105c1609e60eb9554b93"} -->

# 解释器与效应 {#interpreters-and-effects}

```admonish tip title="相关内容"
语义视角：[定律与解释](../denotational-design/laws-and-interpretations.md)  
Rust 中的语义驱动设计：[能力代数](capability-algebras.md)、[定律、场景与证据](laws.md)  
概念：[自由单子](../concepts/free_monad.md)  
洞见：[EVM 代数](../insights/evm-alg.md)
```

```admonish note title="导读"
解释器为某种能力选择表示或效应。它实现基本操作，但不会重新定义其上层派生出的领域行为，因此所有解释器都遵循相同定律。
```

解释器使用具体表示或效应来实现语义能力。它应选择实现机制，而不重新定义领域行为。

## 轻量级解释器 {#a-thin-interpreter}

分支的一种位路径表示可以是：

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

实现负责存储和观察基本事实。`branch_left`、`branch_right`和`branch_is_ancestor`仍留在共享扩展中。

## 解释器取决于边界 {#interpreters-are-boundary-relative}

同一种类型在一个边界上可以是解释器，在另一个边界上则可以是语义输入。

| 边界 | 使用 | 解释 |
| --- | --- | --- |
| 文件系统适配器 | 文件系统访问 | 源代码查找 |
| 规范化器环境 | 将源代码查找作为基本能力 | 规范化语言构造 |
| 编译器流水线 | 规范化项 | 可执行程序构造 |

不存在唯一通用的“实现层”，而是存在嵌套的语义边界。

## 边界处的效应 {#effects-at-the-edge}

具体解释器负责选择以下内容：

*   数据库布局
*   异步运行时
*   任务所有权
*   重试策略
*   HTTP 或 RPC 框架类型
*   序列化
*   锁与通道
*   缓存

除非调用者需要观察这些选择，否则应让它们留在语义 trait 之外。

例如，语义源代码能力可以返回源代码值与错误。生产解释器可以缓存文件并异步读取；测试解释器则可以使用不可变映射。派生的规范化逻辑应能同时适用于二者。

## 运行时所有权 {#runtime-ownership}

框架回调通常要求状态具备所有权、可克隆且线程安全。这是解释器的约束，不一定是领域约束。

````admonish warning title="不要让框架载体污染基本操作"
避免在基本操作中混入框架载体：

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

优先采用语义应用方式：

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

Web 解释器可以选择`Arc<Context>`、提取请求输入、调用`status`并转换结果。领域调用方无需知道 Web 服务器存在。

## 中性解释器 {#neutral-interpreters}

并非所有解释器都需要执行效应。

API 程序的文本解释器可以记录：

| 方法 | 路径 | 输入 | 输出 |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

元数据解释器可以生成文档。测试解释器可以收集操作名称。生产解释器可以构造服务器路由。

中性解释器能够证明，程序的含义独立于任何特定运行时。

## 通过委托组合解释器 {#composing-interpreters-by-delegation}

由于含义存在于小型能力 trait 中，解释器通常是*组装*而成，而非从头写出。载体通过委托给已有的能力来获得新能力，因此转发代码由工具生成，无需手写。两种形式几乎就能覆盖所有情况。

<strong>将能力转发给字段。</strong>ambassador 的`#[derive(Delegate)]`会把整个 trait 转发给内部值。持有多个组件的载体可以将各项能力委托给拥有它的字段，无需编写转发函数体：

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

<strong>通过 getter 授予能力。</strong>为类型提供一个 getter，再由整体实现为所有具有该 getter 的类型提供完整能力：

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

这样一来，许多结构体根本无需存在。庞大的上下文对象——一个携带多个关联类型与十几个方法的大型 trait，再加上唯一的具体实现——可以化为几个小型能力 trait，以及一个轻量载体；载体将每种能力委托给提供该能力的字段或 getter。检查截止时间是否已过之类的派生操作，只需作为基本操作之上的扩展编写一次，无需在每个载体上重新实现。

```admonish warning title="委托转发的是操作，而非含义"
生成委托代码可以省去样板工作，却不能确立语义上的可替代性。`derive`诸如 ambassador 的`#[derive(Delegate)]`宏只能证明实现能够编译，不能证明该载体指称相同的解释器。如果`Shared<T>(Arc<T>)`要替代`T`，就应在载体上检查定律——会改变共享性或身份的包装器（`Arc`、池化、缓存）可能正确转发每个方法，却仍违反新鲜度或唯一性定律。如果载体只是在其他服务之间存放了`T`，使用投影会比委托更诚实。
```

## 错误属于特定边界 {#errors-belong-to-a-boundary}

错误应当在负责处理它的边界上传达失败的含义。

| 错误 | 边界转换 |
| --- | --- |
| 领域错误 | 传输解释器将其映射为协议响应 |
| 解析错误 | 编译器前端将其映射为诊断信息 |
| 存储错误 | 源代码解释器将其映射为语义层面的源代码失败 |

不要把 HTTP 状态码、RPC 错误对象或数据库错误强加给基本领域 trait。应在解释器边界处转换它们。

## 在性能可观察之前，它属于解释范畴 {#performance-is-an-interpretation-concern-until-observed}

批处理、并行、缓存与数据布局通常属于解释器。只有当规范承诺了可观察的顺序、时间、资源使用、公平性或失败行为时，它们才成为语义的一部分。

这种区分能够在避免语义漂移的同时进行优化：

*   遵循相同定律
*   声明相同观察
*   采用不同操作策略

## 审查要点 {#review-checks}

*   解释器是否实现基本操作，而非重复派生逻辑？
*   运行时与框架约束是否限定在使用这些约束的边界内？
*   中性解释器或测试解释器能否实现同一能力？
*   传输与存储错误是否在边界处转换？
*   委托表达的语义关系是否准确？
*   根据所述指称，性能差异是否不可观察？
