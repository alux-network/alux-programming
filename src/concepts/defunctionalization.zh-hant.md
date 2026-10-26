<!-- reader: {"title":"去函式化"} -->

# 去函式化 {#defunctionalization}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[一階程式](../rust-dd/first-order-programs.md)、[語言與編譯器流水線](../rust-dd/compiler-pipelines.md)  
概念：[自由單子](free_monad.md)、[延續傳遞風格](cps.md)  
洞見：[EVM 代數](../insights/evm-alg.md)
```

```admonish note title="語義定位"
去函式化會改變表示，同時力求保留函式應用的行為。在語義優先設計中，當另一個直譯器需要在執行前檢查或組合操作時，生成的一階值就很有用。
```

## 定義 {#definition}

去函式化是一種程式變換：它將高階函式替換為表示可能函式集合的一階資料結構，並提供一個應用這些函式的直譯器函式。

## 動機 {#motivation}

有些語言、編譯器或執行時無法高效處理高階函式，甚至完全不支援。透過去函式化，程式會變成純一階形式，因此更容易編譯、分析、序列化，或在受限環境中執行。

## 處理過程 {#the-process}

1.  找出所有可能被建立並傳遞的高階函式。
2.  為每個函式分配列舉或和型別中的唯一標籤，並附上它執行時所需的資料。
3.  用這些標籤替換函式值。
4.  定義一個`apply`函式，接收標籤與函式引數，然後按標籤進行模式匹配並執行相應程式碼。

## Rust 示例 {#example-in-rust}

之前：使用閉包

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

之後：去函式化形式

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

## 性質 {#properties}

*   現在所有函式都由簡單資料表示。
*   程式變為純一階形式。
*   `apply`函式取代直接的函式呼叫。

## 應用 {#applications}

*   簡化編譯器後端：許多編譯器會生成 CPS 程式碼，然後對其去函式化。
*   函式序列化：可以透過網路傳送列舉標籤，也可以將其存入檔案。
*   靜態分析：一階程式碼更容易推理。
*   推導直譯器：去函式化會自然引出直譯器模式。

## 與 CPS 的關係 {#relation-to-cps}

在 CPS（延續傳遞風格）中，延續是高階函式。對 CPS 程式碼去函式化，會將這些延續轉換為列舉中的有限分支集合，並提供一個應用函式。

## 與自由單子的關係 {#relation-to-free-monads}

適當的自由單子表示可以與 CPS 變換程式中的去函式化延續相關聯。這是一種緊密連結，但不意味著兩種構造普遍等同。

## 型別層面的應用 {#type-level-application}

去函式化還可以在不原生支援高階型別的語言中編碼型別層面的應用。[C# 物件代數實驗](https://github.com/tgrospic/object-algebras)透過`App<F, a>`運用這種輕量級編碼，以表達函子、適用函子、單子與效應代數。

## 參考文獻 {#references}

*   Reynolds, J. C.（1972）。*《高階程式語言的定義直譯器》*。  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J. 與 White, L.（2014）。*《輕量級高階型別多型》*（使用去函式化來編碼型別層面的應用）。  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
