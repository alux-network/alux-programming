<!-- reader: {"title":"自由單子"} -->

# 自由單子 {#free-monad}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[一階程式](../rust-dd/first-order-programs.md)、[直譯器與效應](../rust-dd/interpreters.md)  
概念：[延續傳遞風格](cps.md)、[去函式化](defunctionalization.md)  
洞見：[EVM 代數](../insights/evm-alg.md)
```

```admonish note title="語義定位"
自由單子是一種表示指令語法與自由生成的順序組合的方式。指令函子已經選定了詞彙；隨後，直譯器會將該語法對映到某個語義域。它是一種強大的編碼方式，但並非指稱設計的定義。
```

## 什麼是自由單子（Rust 版本） {#what-is-a-free-monad-rust-version}

**自由單子**可以讓你：

*   **描述**程式時使用*資料*，而非立即執行程式。
*   稍後以一種或多種方式**解釋**該程式。

可以將它想成：

> 一個效應操作 AST + 用於串接步驟的`bind`/`flat_map`。

將以下兩者分開：

*   **語法** → 指令列舉。
*   **解釋** → 對映到所選語義域並保留結構。

“自由”意味著單子結構由函子`F`自由生成，除了單子定律之外不新增其他等式。選擇`F`本身就決定了指令語法；對結果程式作出解釋，則會賦予其特定指稱。

## Rust 實作 {#rust-implementation}

```admonish warning title="示意性編碼"
Rust 不支援直接的高階型別引數，因此生產級自由單子編碼需要額外的型別機制，或專用指令函子。以下程式碼展示預期結構，並非可直接使用的泛型實作。
```

### 自由單子型別 {#free-monad-type}

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

### 領域特定語言：控制檯操作 {#dsl-console-operations}

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

### 直譯器 {#interpreter}

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

## 要點 {#takeaway}

*   **語法** = `enum Console`（可能的指令）
*   **程式** = `Free<Console, A>`（描述步驟的資料）
*   **具體解釋** = `run_console`
*   優勢：同一個程式可以編寫多種直譯器，例如在真正的 IO 中執行、將日誌寫入檔案，或編譯為另一種語言。

## 與延續及 CPS 的關聯 {#correlation-to-continuations-and-cps}

<strong>延續傳遞風格（CPS）</strong>是一種程式設計方式：函式不直接返回值，而是將結果傳給另一個函式（即*延續*），由它表示“程式接下來的部分”。

**自由單子**本質上是**由一系列步驟組成的程式**，每一步都會說：

> “執行此操作，然後繼續處理剩餘部分。”

這個“程式剩餘部分”正是一個**延續**——從當前結果對映到下一步的函式。

*   在我們的 Rust 自由單子中：
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>`**就是延續**。
    
*   解釋自由單子時，你其實是在**透過 CPS 執行**：
    
    *   你不會直接返回值，而是將它們傳給下一個延續。
    *   最終會進入如下迴圈： `current_instruction -> feed result into continuation -> next instruction`
*   **CPS 關係**：
    
    *   自由單子*將 CPS 編碼進資料結構*。
    *   CPS *則是同一思想的執行時控制流表示*。

**快速對照**：

| 概念 | 在 CPS 中 | 在自由單子 AST 中 |
| --- | --- | --- |
| 步驟結果 | 延續的引數 | `A`在`Fn(A) -> Free`中 |
| 延續 | 函式`(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| 程式 | 巢狀延續 | 巢狀的`FlatMap`變體 |
| 執行 | 呼叫函式 | 模式匹配並呼叫 |

## GoF（四人幫）設計模式對映 {#gof-gang-of-four-design-patterns-mapping}

自由單子**並不屬於**GoF，因為它來自函數語言程式設計理論，但可以**涵蓋**或**模擬**若干模式：

| GoF 模式 | 自由單子與該模式的關係 |
| --- | --- |
| **直譯器** | 整個“AST + 執行”就是字面意義上的直譯器模式——自由單子直接提供 AST 與組合器。 |
| **命令** | DSL 中的每個`enum`變體都是一個命令物件。自由單子會像宏命令一樣串接它們。 |
| **組合** | AST 結構（巢狀指令）是命令的組合體。 |
| **構建器** | `.flat_map`鏈式呼叫為程式提供了流暢的構建器。 |
| **存取者** | 直譯器本質上是指令集的存取者。 |

## 為什麼自由單子優於這些模式 {#why-free-monad--these-patterns}

*   GoF 模式是**手動的物件導向工作**——需要自行定義介面、類並將它們組合起來。
    
*   自由單子是**代數式的**——為指令定義*資料*，為其解釋定義*函式*。
    
*   你會自動獲得：
    
    *   順序組合（`flat_map`）
    *   組合
    *   無需觸碰核心邏輯即可使用多種直譯器

**彙總表**：

| 自由單子（函數語言程式設計概念） | 對應的 GoF/物件導向模式 |
| --- | --- |
| 指令列舉 | 命令 |
| 程式 AST | 組合體 |
| `flat_map`構建器 | 構建器 |
| 直譯器函式 | 直譯器/存取者 |
| 多種直譯器 | 策略 |

## 與去函式化的關係 {#relation-to-defunctionalization}

**去函式化**是一種程式變換：它將高階函式替換為表示可能函式集合的一階資料結構，並提供一個用於應用它們的直譯器。

在 CPS 中，延續是高階函式。對 CPS 程式去函式化，會將這些延續替換為延續分支列舉，並提供一個`apply`函式來執行它們。

對於適當的編碼，自由單子可以與 CPS 變換程式內部的去函式化延續連結起來：

1.  從程式的 CPS 版本開始。“程式剩餘部分”由延續函式承載。
2.  將這些延續函式去函式化為資料型別中的有限分支集合。
3.  所得的一階資料型別可以具有與自由單子表示相同的指令與延續結構。

**關鍵相似之處**

*   自由單子與去函式化都會生成計算的資料表示，並且都需要直譯器來賦予這些資料含義。
*   自由單子中的`FlatMap`分支援有延續；去函式化則將該閉包替換為資料型別中的一個分支。

**關鍵區別**

| 方面 | 去函式化 | 自由單子 |
| --- | --- | --- |
| 目的 | 消除高階函式的機械式編譯器技術 | 將語法與語義分離的代數構造 |
| 輸入 | 任意高階程式，通常採用 CPS 形式 | 描述可能指令的函子 F |
| 輸出 | 函式分支列舉及應用函式 | `Free<F, A>`AST 與直譯器 |
| 是否為單子？ | 不一定 | 根據構造始終是單子 |
| 範圍 | 通用變換 | 特定的函數語言程式設計模式 |

**總結** 去函式化是一種變換技術，自由單子是一種代數構造。在某些表示中二者關係密切，但除非附加額外假設，否則通常不能由其中一種構造推出另一種。
