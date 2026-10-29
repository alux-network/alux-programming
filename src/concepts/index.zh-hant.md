<!-- reader: {"title":"簡介","sourceHash":"sha256:194a77c34127d9a1e9575400d0bddfbda3cbea7bb3d4e51141da9e69c1e64bee"} -->

# 概念導讀 {#concepts-introduction}

![Concepts — the programming machinery](/concepts.png)

```admonish tip title="相關內容"
語義視角：[為何含義優先](../denotational-design/semantic-view.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)  
洞見：[簡介](../insights/index.md)
```

本部分的章節將介紹重要的程式設計機制與理論工具：

*   操作語義描述執行規則
*   CPS 會將控制流程中的延續顯式化
*   去函式化將已知的高階行為轉為一階資料
*   自由單子透過順序組合表示效應語法
*   表示式問題編碼用於管理可擴充性
*   引用透明性支援替換
*   合流性、軌跡與雙模擬用於比較不同形式的行為

指稱設計並未取代這些概念，而是將它們放在合適的位置。

```admonish quote title="機制與含義"
[概念](index.md)與[洞見](../insights/index.md)用於說明實用的程式設計機制。[指稱設計](../denotational-design/design.md)則說明如何判斷這些機制應當保留什麼。
```

閱讀每章時，思考以下三個問題：

1.  這個概念描述的是含義、表示、執行，還是它們之間的某種變換？
2.  它保留了哪些觀察與等價關係？
3.  它是規範、規範的一種編碼，還是一種直譯器？

有幾章寫於本書採用明確的語義遞進結構之前，其示例有意保留了操作層面的側重。相關頁面連結與“洞見”章節會將它們重新連線到語義視角。
