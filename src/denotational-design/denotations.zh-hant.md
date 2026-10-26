<!-- reader: {"title":"指稱與組合性","sourceHash":"sha256:f23d995771d04278d7ee0f0a93000f60dfc435559082912084c4a6f5828256b2"} -->

# 指稱與組合性 {#denotations-and-compositionality}

```admonish tip title="相關內容"
語義視角：[為何含義優先](semantic-view.md)、[指稱設計](design.md)、[定律與解釋](laws-and-interpretations.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)  
概念：[引用透明性](../concepts/referential_transparency.md)、[分支與合流](../concepts/branching.md)
```

```admonish note title="核心思想"
指稱是從語法對映到所選語義域的含義函式。當整體的含義由各部分的含義確定時，語義就是組合式的；這使語義等價與安全替換成為可能。
```

**指稱**是賦予一段語法或一個程式設計構造的含義。通常記作：

$$ \llbracket e \rrbracket $$

表示“表示式`e`的含義”。

這些括號並不要求指稱必須是一個數字。根據所選語義域，程式可以指稱：

*   一個值
*   一個函式
*   一個關係
*   一組可能結果
*   一個狀態變換
*   一個機率分佈
*   一種過程行為
*   一個部分結果

因此，第一個設計決策不是“用哪個結構體來儲存它？”，而是“我們關心的含義屬於哪個語義域？”

## 語義域 {#semantic-domains}

對於算術表示式，一個簡單的語義域可以是整數：

$$ \llbracket e \rrbracket_{eval} \in \mathbb{Z} $$

對於格式化，同一種表示式語言也可以解釋為文字：

$$ \llbracket e \rrbracket_{pretty} \in \mathsf{String} $$

對於帶效應的計算，語義域可以是狀態變換：

$$ \llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State} $$

對於併發語言，語義域可以描述可觀察到的過程行為，而非某一條預先確定的軌跡。

所選語義域決定哪些差異有意義。如果語義域不包含時間，那麼兩個時序不同的實作仍可能指稱同一個程式。如果把資源消耗納入語義域，這種差異就可能具有語義意義。

## 抽象會有意忽略細節 {#abstraction-forgets-intentionally}

有用的指稱會忽略無關的機器細節。

對於分支位置，指稱可以保留從根到該位置的路徑，同時忽略：

*   位元組佈局
*   分配策略
*   快取行為
*   序列化格式

對於 HTTP 程式，可移植的指稱可以保留方法、路徑、輸入角色、操作和輸出角色，同時忽略承載它的路由器或執行器。

對於編譯器階段，指稱可以保留從正規化原始碼到可執行含義的轉換，同時忽略臨時緩衝區與遍歷順序。

忽略細節不是缺陷。正是如此，不同表示才可能等價。

## 組合性 {#compositionality}

當整體的含義由各部分的含義及其組合方式共同決定時，語義就是**組合式的**。

對於加法：

$$ \llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket $$

對於順序函式組合：

$$ \llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket $$

對於並行過程運算子，語義域需要相應的並行組合：

$$ \llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket $$

具體運算子$\otimes$取決於所選的過程模型。關鍵在於，語法組合應系統地對映到語義組合。

組合性支援區域性推理。如果兩個部分的指稱相同，就可以在任意組合上下文中相互替換：

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket \implies \llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket $$

這是安全替換與語義重構的基礎。

## 語義等價 {#semantic-equality}

程式不必在文字或操作上完全相同，才能在語義上等價。

考慮分支位置的兩種實作：

$$ \lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack $$

以及一種指稱相同路徑的整數編碼。它們的記憶體值不同，但指稱可能相等。

同樣，兩個編譯器過程可以按不同順序遍歷語法，卻生成行為符合相同規範的可執行檔案。是否要求逐位元組相等，是另一個更強的定律。

務必明確指出所聲稱的等價關係：

*   值相等
*   結構相等
*   規範表示相等
*   軌跡等價
*   雙模擬
*   觀察等價
*   指稱相等

混淆這些等價關係，是錯誤定律的常見來源。

## 外部性是相對的 {#externality-is-relative}

假設某個計算具有如下含義：

$$ H \times E \to O $$

相對於`H`而言，證據`E`是外部的。如果新的抽象選擇`H × E`作為承載物件，那麼這些證據對於新的邊界來說就變成內部的。

這一觀察對效應與上下文都很重要。沒有任何事實絕對屬於“環境”。關鍵在於當前語義承載物件是否包含該事實，以及有哪些定律支配它。

```admonish warning title="避免使用通用上下文物件"
不要用一個通用上下文物件來解決這個邊界問題。將每種允許的含義明確命名為一種能力或顯式值。
```

## 基本含義與派生含義 {#primitive-and-derived-meaning}

基本操作是選作語義域詞彙的操作。派生操作則由基本操作定義。

對於分支位置，一組精簡的基本詞彙可以包括：

*   一個根位置
*   沿某個方向延伸
*   觀察一個位置到另一個位置的路徑

由此可以派生：

*   向左延伸
*   向右延伸
*   根據路徑構造位置
*   測試一個位置是否為另一個位置的祖先
*   測試一個位置是否為另一個位置的後代

這種區分是設計選擇，而非形而上學事實。應優先採用精簡的基本操作集合，讓定律與其他解釋更容易表述。

## 一項實用檢驗 {#a-useful-test}

在引入程式設計介面之前，先補全以下句子：

*   這個抽象中的值意味著……
*   基本觀察包括……
*   有意義的組合包括……
*   當……時，兩個值等價
*   每種實作都必須保留……
*   該抽象有意忽略……

如果這些句子無法補全，再多的實作機制也無法補上缺失的含義。
