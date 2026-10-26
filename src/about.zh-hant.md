<!-- reader: {"title":"關於本書","sourceHash":"sha256:dc574b72cd9d99b223d155921c54f7cf34eb8ee02ac5655eb0c184c2c520199a"} -->

# 關於 {#about}

本書提煉了一種軟體思維方式，靈感來自 Conal Elliott 的**指稱設計**。核心思想簡單而深刻：

```admonish note title="指稱設計"
*先定義程式的含義，再決定它如何執行。*
```

在這一視角下，計算不是不透明的步驟序列，而是透明的數學物件。我們從**規範**開始，以純粹且可組合的方式描述程式*意味著什麼*。這些描述採用代數結構表達，通常表現為 trait 或型別簽名。**實作**——這些含義*如何*實現出來——則是獨立且可互換的一層。

將含義與機制分離後，我們便能獲得：

*   **清晰性**——程式讀起來像精確的定義。
*   **可組合性**——各部分可以按代數規則組合。
*   **可重構性**——實作持續演進時，含義仍保持不變。
*   **正確性**——推理程式時可以採用等式推理，而非操作層面的推理。

這些指南旨在提供實用技術，幫助讀者在現代程式語言中運用這一風格，尤其是 Rust，同時保留其數學根基的優雅與嚴謹。

本書有意區分三個層次：

*   **含義**說明所設計的值、關係與變換。
*   **表示**選擇如何將這些含義編碼為型別與資料。
*   **執行**選擇如何讓一種表示在機器上執行。

ALUX 與 Tolang 為許多示例提供了背景，但閱讀本版並不需要了解它們。本書會先介紹相關詞彙。

## mdBook 參考 {#reference-of-mdbook}

[mdBook 文件](https://rust-lang.github.io/mdBook/index.html)

## **admonish** mdbook 外掛參考（提示框） {#reference-of-admonish-mdbook-plugin-tooltip-boxes}

[admonish 文件](https://tommilligan.github.io/mdbook-admonish/)
