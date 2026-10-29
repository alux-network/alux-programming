<!-- reader: {"title":"延續傳遞風格","sourceHash":"sha256:cf423534a1315531133363dea3ff20097731dacb0c4efc6db7e28806acf97237"} -->

# 延續傳遞風格（CPS） {#continuation-passing-style-cps}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[一階程式](../rust-dd/first-order-programs.md)、[語言與編譯器流水線](../rust-dd/compiler-pipelines.md)  
概念：[自由單子](free_monad.md)、[去函式化](defunctionalization.md)  
洞見：[EVM 代數](../insights/evm-alg.md)
```

```admonish note title="語義定位"
CPS 是一種表示與程式變換，它會將控制流顯式化。它是否保留含義，取決於是否明確了源語義、目標語義及二者之間的對應關係。
```

## 定義 {#definition}

延續傳遞風格（CPS）是一種程式設計方式：函式不直接返回值，而是將結果傳給另一個稱為*延續*的函式；延續表示程式接下來的部分。

## 動機 {#motivation}

*   使控制流顯式且可程式設計。
*   支援非阻塞 IO、提前退出、協程、回溯與併發排程等高階變換。
*   用於編譯器中間表示，以簡化最佳化與分析。

## 基本形式 {#basic-form}

直接風格：

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

CPS 風格：

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

這裡，`k`是延續。我們不再返回`x + 1`，而是呼叫`k(x + 1)`。

## 關鍵性質 {#key-properties}

*   所有函式呼叫都是對延續的*尾呼叫*。
*   當前計算永遠不會“返回”到呼叫者，而是跳入延續。
*   程式中的控制流變得顯式。

## 與高階函式的關係 {#relation-to-higher-order-functions}

*   在 CPS 中，延續就是高階函式。
*   計算的每個步驟都會接收一個延續，用來表示下一步要做什麼。

## 與去函式化的關係 {#relation-to-defunctionalization}

*   在 CPS 中，延續是實際的函式值。
*   去函式化會把延續函式替換為表示可能後續步驟的資料結構（列舉），並提供一個`apply`函式來解釋這些步驟。

## 與自由單子的關係 {#relation-to-free-monads}

*   自由單子中的`FlatMap`構造器恰好儲存了一個延續。
*   解釋自由單子類似於執行 CPS 程式碼，只不過延續成為程式資料的一部分。
*   適當的自由單子編碼可以與 CPS 以及去函式化的延續表示建立連結。

## 優點 {#advantages}

*   控制流表示靈活。
*   更容易推理求值順序。
*   適用於實作直譯器、偵錯程式、最佳化器與非同步執行時。

## 缺點 {#disadvantages}

*   比直接風格冗長。
*   對人來說可能更難閱讀。
*   在不提供原生支援的語言中，需要尾呼叫最佳化才能獲得較高效率。
