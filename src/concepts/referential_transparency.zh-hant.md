<!-- reader: {"title":"引用透明性","sourceHash":"sha256:cf7ad00c5e2f7e6e1da3d3f18d03b6ec9ec16d836e412d29a99f0fa801064234"} -->

# 引用透明性 {#referential-transparency}

```admonish tip title="相關內容"
語義視角：[指稱與組合性](../denotational-design/denotations.md)、[定律與解釋](../denotational-design/laws-and-interpretations.md)  
洞見：[重新審視引用透明性](../insights/referential-transparency.md)
```

```admonish note title="語義定位"
引用透明性取決於所選指稱與等價關係。當替換表示式不會改變指定含義時，它允許進行替換，即使語義邊界背後的實作操作有所不同。
```

引用透明性（RT）是表示式的替換性質：可以用一個表示式的指稱替換該表示式，而不改變程式含義。

如今，實踐中通常將 RT 作為等式推理、安全重構與定律驅動 API 設計的基礎。

## 核心含義 {#core-meaning}

RT 表示：

*   如果`e`指稱`v`
*   那麼，以`v`代替`e`會保留含義

這是語義主張，而非編碼風格口號。

### 純性 {#purity}

純函式對相同輸入總是返回相同輸出，並且沒有可觀察的副作用。RT 是表示式的替換定律：用其指稱替換表示式必須保留含義。因此，純函式是實踐中實現 RT 的一種常見方式，而 RT 是更廣泛的語義標準。關於指稱設計中純性與 RT 的區別，請參閱[《重新審視引用透明性》](../insights/referential-transparency.md)。

## 歷史背景 {#historical-context}

在程式語言語義中，RT 與 Christopher Strachey 的表述密切相關。他的論述將值推理與以更新為主的行為區分開來：

*   **R 值**：表示式的值。
*   **L 值**：可以賦值的位置。

關鍵在於：當我們進行值層面的推理時，表示式級別的替換是穩定的。賦值會引入位置更新，使替換推理變得困難，甚至不再以樸素形式成立。

## 這裡的賦值與副作用意味著什麼 {#what-assignment-and-side-effects-mean-here}

在此上下文中：

*   **賦值**是對某個位置進行更新（例如`x := x + 1`）
*   **副作用**是返回值之外任何可觀察的變化

賦值是一種特定的副作用。

這就是 RT 在許多命令式環境中失效的原因：求值可能依賴或改變表示式顯式值介面以外的可觀察上下文。

## 現代語言如何呈現 RT {#how-modern-languages-present-rt}

### Haskell {#haskell}

純表示式通常被當作預設推理物件來教授 RT。效應透過型別化構造顯式表達（例如`IO`、狀態傳遞及相關抽象），所以替換定律在日常使用中居於核心地位。

### Scala（Cats / Cats Effect） {#scala-cats--cats-effect}

在 Scala 函數語言程式設計實踐中，Cats Effect 提供了最常見的 RT 解釋方式：

*   `IO[A]`是對帶效應工作的純描述
*   組合`IO`值滿足 RT
*   在執行時邊界顯式執行（`unsafeRun*`）

Cats Effect 也將其與急切求值`Future`作對比，這也是 Scala 中討論 RT 時強調惰性與延遲執行的原因之一。

## 當代的 RT {#rt-today}

在現代生態系統中，RT 常被用作“行為可安全替換”的簡稱。 在多範式系統中，團隊通常會將 RT 主張應用於特定模組、API 或帶效應型別的區域，而不是全域性套用於所有程式碼。

關於 RT 在指稱設計中的解讀，請參閱[《重新審視引用透明性》](../insights/referential-transparency.md)。

## 參考文獻 {#references}

*   Strachey, C. *《程式語言的基本概念》*（牛津 PRG 講義，1967）。  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Cats Effect 文件：`IO`資料型別及 RT/惰性求值說明。  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Typelevel 部落格：*《Cats 的 IO 單子》*（討論 Scala 的副作用與 RT 動機）。  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
