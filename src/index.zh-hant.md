<!-- reader: {"title":"ALUX 程式設計","parts":{"Welcome":"歡迎","The Semantic View":"語義視角","Design by Meaning in Rust":"Rust 中的語義驅動設計","Concepts":"概念","Insights":"洞見","Contributing":"參與貢獻"}} -->

```admonish warning title="ALUX 專案"
ALUX 程式碼庫仍在積極開發中，尚未公開。
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX 程式設計指南 {#alux-programming-guidelines}

```admonish note title="注"
本書將介紹理解並參與 ALUX 語義優先程式碼庫所需的基礎，從[指稱設計](denotational-design/design.md)的一項核心原則講起：先定義程式的含義，再決定程式如何執行。

沿襲 Conal Elliott 的思路，本書將計算視為清晰的數學物件，而不是不透明的步驟序列。

規範以簡單、可組合的[能力 trait](rust-dd/capability-algebras.md)表達，用來描述程式*意味著什麼*。[直譯器](rust-dd/interpreters.md)提供可互換的方式來*實現*這些含義。

這樣一來，軟體的組合規則、實作義務和[有效等式](denotational-design/laws-and-interpretations.md)都更容易理解和測試。
```

```admonish quote title="機制與含義"
[概念](concepts/index.md)與[洞見](insights/index.md)用於說明實用的程式設計機制。[指稱設計](denotational-design/design.md)則說明如何判斷這些機制應當保留什麼。
```

## 如何閱讀本書 {#how-to-read-this-book}

本書分三個層次閱讀：

*   [**語義視角**](denotational-design/semantic-view.md)介紹[指稱與組合性](denotational-design/denotations.md)、[定律與解釋](denotational-design/laws-and-interpretations.md)，以及含義與表示之間的關係。
*   [**Rust 中的語義驅動設計**](rust-dd/capability-algebras.md)將這一視角落實為[小型能力](rust-dd/capability-algebras.md)、[派生擴充](rust-dd/derived-meaning.md)、[一階程式](rust-dd/first-order-programs.md)和[輕量級直譯器](rust-dd/interpreters.md)。
*   [**概念**](concepts/index.md)與[**洞見**](insights/index.md)介紹重要的執行模型、編碼、變換與連結。

語義原則不依賴特定語言。Rust 是主要實作語言；一條[併發語言處理流水線](rust-dd/compiler-pipelines.md)將這些原則與 Tolang 連結起來。

## 本書適合誰 {#who-this-book-is-for}

*   希望複雜軟體在不斷演進時仍能保持**模組化、可組合、可測試且易於維護**的程式設計師。
*   希望**連結範疇論、型別系統與程式設計**的開發者。
*   熟悉表示與操作技術的讀者——例如[**自由單子**](concepts/free_monad.md)、[**延續傳遞風格（CPS）**](concepts/cps.md)和[**去函式化**](concepts/defunctionalization.md)——希望理解這些機制如何服務於語義優先設計，而非定義它。
*   熟悉[**依賴型別**](denotational-design/dependent-types.md)與證明導向程式設計，並希望在編寫高效能 Rust 時運用這套思維方式的讀者。
*   需要閱讀[語義優先的 Rust 規範](rust-dd/capability-algebras.md)，並理解如何[編譯並行語言](rust-dd/compiler-pipelines.md)而不以編譯器本身來定義語言的貢獻者。
