<!-- reader: {"title":"指稱設計","sourceHash":"sha256:bac0e12637b9f63a8fa1002e44ca58f04237a81e1bc18da343cf22e360a85e8e"} -->

# 指稱設計 {#denotational-design}

```admonish tip title="相關內容"
語義視角：[指稱與組合性](denotations.md)、[定律與解釋](laws-and-interpretations.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)、[派生含義與組合](../rust-dd/derived-meaning.md)
```

```admonish note title="核心思想"
指稱設計從簡單、可組合且獨立於實作的含義推導出程式設計介面，讓語義來引導設計，而不是事後描述介面。
```

指稱設計是一種從簡單、可組合且獨立於實作的含義推導程式設計介面的方法。

該方法由[Conal Elliott](http://conal.net/)提出並命名。它的核心做法不僅是為現有語言或 API 賦予語義，而是讓語義引導 API 本身的設計。

## 設計迴圈 {#the-design-loop}

按以下順序進行：

1.  選擇語義域。
2.  確定該語義域中重要的結構。
3.  選擇一組精簡的基本操作詞彙。
4.  以組合方式派生有用操作。
5.  陳述這些操作遵循的定律。
6.  選擇一種或多種表示。
7.  實作能夠保留該結構的解釋。
8.  透過定律、模型與場景進行驗證。

表示優先的設計通常從第 6 步開始，然後試圖事後補出第 1 至第 5 步。

## 設計分支代數 {#designing-a-branch-algebra}

回到分支位置。預期含義是二叉分支結構中的有限路徑。

一種可能的基本代數是：

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

偏箭頭$\rightharpoonup$表示路徑觀察僅在第一個分支是第二個分支的祖先時才存在。

由此可得一些有用操作：

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

這個代數沒有提到向量、整數、分數、資料庫鍵或位元組。這些選擇留待後續。

## 先結構，後便利 {#structure-before-convenience}

基本詞彙應揭示下游程式碼所依賴的結構，而不應變成某種實作上所有便利方法的集合。

````admonish warning title="拒絕表示優先的基本操作"
這個 trait 將儲存佈局、配置位置、位表示和複合工作流捆綁在一起，並未隔離分支含義：

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

當效應屬於所選語義域時，語義 API 仍然可以包含效應。規則並不是“所有東西都必須是純函式”，而是“每個基本操作都必須表達連貫的含義”。

## 編碼方式不是方法論 {#encoding-is-not-methodology}

指稱設計不要求使用：

*   Haskell
*   tagless-final 編碼
*   物件代數
*   自由單子
*   單一抽象語法樹
*   僅使用純函式
*   每個 API 都採用範疇論術語

這些可以是有用的編碼方式或解釋工具，但沒有一種能夠定義該方法。

```admonish note title="Rust 編碼方式"
在 Rust 中，小型 trait、關聯型別、擴充方法、泛型函式和一階程式值都是實用的編碼方式。它們的價值取決於是否保留了清晰的語義設計。
```

## 型別類態射 {#type-class-morphisms}

理解該方法的一種方式，是把它看作保結構對映。

假設某個介面描述了一個語義代數。實作會將其抽象值與操作對映到具體表示中。有效實作必須保留相關操作與定律。

如果`encode`將抽象分支對映到具體載體，那麼保留延伸操作的形式如下：

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

實作不只是一個方法名稱相同的集合。它應當是一個尊重代數結構的態射。

## 什麼樣的抽象才算好 {#what-counts-as-a-good-abstraction}

一個好的指稱設計抽象具備以下特徵：

*   其中的值具有簡單明確的預期含義。
*   基本操作用於揭示語義觀察或構造。
*   更大的行為由這些基本操作派生。
*   其定律不依賴某一種表示。
*   可以由彼此獨立的實作來解釋。
*   只有在相關時才引入操作細節。

僅僅精簡還不夠。即使一個小型 trait 暴露了`get_manager()`，它仍可能是表示優先的。若某個更大的代數包含的操作構成連貫的語義結構，也可能是合理的。

## 語義值與抽象載體 {#semantic-values-and-abstract-carriers}

並非所有具體型別都不能寫入規範。

當直譯器應當選擇載體時，使用關聯型別：

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

當某個型別屬於穩定的語義詞彙時，使用具體型別：

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

區別並非“抽象好，具體壞”，而是語義詞彙與偶然的機器表示之別。

## 規範就是指稱，而且不必可執行 {#the-specification-is-the-denotation-and-it-need-not-execute}

規範就是指稱：賦予每種構造的數學含義。它的力量在於不受效率約束，甚至不必能夠執行。

```admonish quote title="Conal Elliott"
定義指稱通常比實作容易得多，也更能帶來啟發，因為指稱不受效率或可執行性的約束，也不會受到它們的干擾。

——[《指稱設計：從含義到程式》（LambdaJam 2015）](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

經典示例是 FRP（函式式響應式程式設計）：`Behavior a`被定義為連續時間上的函式，

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

這個模型很精確，卻無法執行——實數無法逐個列舉。程式也可以指稱一組結果；這兩種模型都無法執行，但這正是其用意所在。選擇含義是為了簡潔和精確，而不是為了計算方式。

可執行性與效率完全交由*實作*負責；實作是獨立產物，藉助將其與含義關聯起來的同態定律（型別類態射）來保證正確性：含義函式必須把每種語法組合對映為相應的語義組合。正如 Conal 所說，指稱給出了對*待實作之事*明確無歧義的定義，同時為*如何*實作留下了很大的創作空間。

在 Rust 中，有幾種產物可以表達這份規範的部分內容，其中一些恰好可以執行。可執行性只是偶然屬性，不是它們成為規範的原因：

*   說明文字陳述預期含義
*   trait 陳述可用的基本操作
*   擴充陳述派生方式
*   定律陳述必需的等式
*   直譯器展示可實現性
*   測試提供有限證據

應結合起來閱讀，並讓含義與定律在權威性上優先於具體機制。

## 延伸閱讀 {#further-reading}

*   [《指稱設計：從程式到含義》（BayHac 2014）](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [《藉助型別類態射進行指稱設計》](http://conal.net/papers/type-class-morphisms/)
*   [Conal Elliott 的文章與演講](http://conal.net/)
