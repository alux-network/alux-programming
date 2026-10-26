<!-- reader: {"title":"操作語義","sourceHash":"sha256:ac0d98925f230224cd8aee84741bb9ef24b9a477b131eafa8d0367b730ea077d"} -->

# 操作語義 {#operational-semantics}

```admonish tip title="相關內容"
語義視角：[指稱設計](../denotational-design/design.md)  
Rust 中的語義驅動設計：[語言與編譯器流水線](../rust-dd/compiler-pipelines.md)  
概念：[自由單子](free_monad.md)、[延續傳遞風格](cps.md)、[去函式化](defunctionalization.md)  
洞見：[從語義到機器](../insights/operational_semantics.md)
```

## 定義 {#definition}

**操作語義**透過求值判斷或**配置**之間的狀態轉換來描述程式行為。配置可能包含程式片段，以及環境、儲存、延續或其他抽象機器狀態。

這種描述具有數學性質：它陳述哪些求值或狀態轉換有效。直譯器或虛擬機器可以實作這些規則，但某個具體實作本身並非定義。

```admonish note title="語義定位"
操作語義是一種精確的語義，而非非正式的實作細節。它透過求值規則或轉換規則說明行為。[指稱設計](../denotational-design/design.md)提出了一個互補且更早的設計問題：這些規則應保留哪些可組合含義與等式？
```

## 操作語義的形式 {#styles-of-operational-semantics}

### 小步操作語義（結構操作語義） {#small-step-structural-operational-semantics}

計算被拆分為原子轉換：

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

適用於建模併發、交錯執行與部分執行。

### 大步操作語義（自然語義） {#big-step-natural-semantics}

根據最終結果描述求值：

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

推理終止程式時通常更清晰。

## 形式規則 {#formal-rules}

操作語義通常採用**推理規則**給出。對於簡單算術語言：

$$ E ::= n \mid E + E $$

從左到右求值時，需要三條規則：

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

前兩條規則確定下一個可歸約子表示式。兩個運算元都成為值後，第三條規則執行加法。

求值軌跡：

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## 為何重要 {#why-it-matters}

*   提供**精確的類機器模型**來描述執行。
*   為直譯器與虛擬機器奠定基礎。
*   支援對正確性、資源使用與安全性的推理。

## 與其他概念的關係 {#relation-to-other-concepts}

*   **自由單子**提供指令語法與順序組合。操作規則可以描述該表示中的程式如何求值。
*   **CPS**將計算剩餘部分顯式表示為延續。操作規則可以描述值如何傳遞給這些延續。
*   **去函式化**會將已知函式族替換為一階資料，並提供一個`apply`操作。操作規則可以描述由此產生的顯式機器狀態。

這些都是可以賦予操作語義的物件與變換，本身並不是操作語義。

## 實踐中的應用 {#in-practice}

操作規則可以指導直譯器實現，並提供一個用於檢查實現的精確模型：

*   **EVM**可以自然地建模為小步狀態轉換系統；也可以透過大步判斷描述完整的終止執行。
*   小步規則通常與 Rust 直譯器中的`match`分支非常相似。

$$ n_1 + n_2 \to n_3 $$

上文完整的從左到右求值關係可以表示為 Rust 程式碼：

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

這個函式執行一次狀態轉換。重複應用即可得到所示軌跡；返回`None`表示表示式已經是一個值。

## 操作問題與指稱問題 {#operational-and-denotational-questions}

操作規則可以證明安全性、進展性質、資源上限以及與實作的對應關係。如果在預期的抽象含義明確之前就選定了操作機制，限制便會顯現：實作選擇可能意外變成語義承諾。

指稱設計並不否定操作語義。它要求先陳述語義域、組合與定律，再將操作模型與其關聯起來。

| 視角 | 問題 |
| --- | --- |
| 指稱 | 整個程式意味著什麼？ |
| 操作 | 透過哪些狀態轉換求值？ |
| 正確性 | 這些狀態轉換是否保留了預期含義？ |

以下片段用於說明，將操作描述視為唯一洞見來源的危險。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作描述並非全部含義（1/2）</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>操作描述並非全部含義（2/2）</figcaption></figure>
