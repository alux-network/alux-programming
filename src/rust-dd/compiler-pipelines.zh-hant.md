<!-- reader: {"title":"語言與編譯器流水線"} -->

# 語言與編譯器流水線 {#language-and-compiler-pipelines}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[一階程式](first-order-programs.md)、[直譯器與效應](interpreters.md)  
概念：[操作語義](../concepts/operational_semantics.md)、[去函式化](../concepts/defunctionalization.md)  
洞見：[EVM 代數](../insights/evm-alg.md)
```

```admonish note title="含義並非流水線本身"
當語言含義不與解析器語法樹、編譯過程、位元組碼或機器迴圈混為一談時，編譯器就更清晰。正確性可由一條交換律表達：執行編譯後的程式，應與該程式的指稱一致。
```

如果語言含義不等同於解析器語法樹、編譯器過程、位元組碼或虛擬機器迴圈，推理編譯器就會容易得多。

本章採用一種類似 Tolang 的簡化併發語言，重點放在語義架構上。

## 四個不同層次 {#four-distinct-layers}

請將以下層次分開：

1.  源語言語法
2.  正規化語言
3.  可執行表示
4.  機器執行

典型流水線如下：

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

便捷操作就是組合：

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

組合後的輔助函式並非每個階段的語義定義。

## 語法尚未成為含義 {#syntax-is-not-yet-meaning}

解析器輸出會映照語法選擇：

*   標點
*   語法糖
*   優先順序
*   原始碼區間
*   生成的解析器表示

這些資訊對診斷與工具很重要，但不必用來定義核心語言。

正規化會移除偶然的語法差異，並引入一種更精簡、承載含義的形式。例如，多種表層繫結形式可以正規化為同一個核心限制操作。

**多種源形式** → **一個正規化構造**

這樣一來，編譯器後續階段與執行時定律便有了統一的陳述位置。

## 指稱含義與編譯含義 {#denotational-and-compiled-meaning}

令：

$$ \llbracket - \rrbracket : Core \to D $$

在語義域`D`中賦予含義。

編譯會生成可執行值：

$$ compile : Core \to Executable $$

執行時會觀察這些值：

$$ run : Executable \to D $$

核心正確性義務是一張交換圖：

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

對於非確定性或併發系統，等價關係可能是觀察等價、結果集合、軌跡等價或雙模擬，而非普通的值相等。必須由語義模型作出選擇。

## 併發過程含義 {#concurrent-process-meaning}

基礎反射演算包含以下思想：

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang 以組合方式擴充基礎演算。其中一種擴充增加了表層形式

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

這個繫結會建立一個新通道，並將其名稱的作用域限定在$P$之內；過程演算文獻將此操作稱為*限制*。反射核心沒有基本限制運算子。參見 Meredith 與 Radestock 的論文[*《反射式高階演算》*](https://doi.org/10.1016/j.entcs.2005.05.016)。

操作機器可以透過元組空間、佇列、匹配索引、延續記錄與併發任務來實作這些功能。這些機制並非語言定義。

語義層負責確定可觀察的過程行為與結構定律。核心並行組合可能遵循以下定律：

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

這種新鮮繫結擴充還具有獨立的定律。常見候選模式包括 α 重新命名、不同繫結的交換，以及作用域外提：

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

這裡，$y \mathrel{\#} P$表示$y$對$P$來說是新鮮的；$P\{y/x\}$表示避免變數捕獲的重新命名；$\operatorname{FN}(P)$表示$P$中的自由通道名稱集合。只有在選定的觀察等價關係認可這些模式時，它們才成為定律；不能僅憑表層語法或某種位元組碼佈局就作此假設。

## 正規化是一種保持含義的映射 {#normalization-as-a-meaning-preserving-map}

如果源程式`s₁`與`s₂`的區別僅在於所接受的語法糖，正規化就應顯式呈現它們共同的含義：

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

其他有用的義務包括：

*   α 重新命名保留正規化含義
*   詞法作用域應繫結到預期的繫結項
*   診斷所需的原始碼位置應予保留
*   編譯期常量應被擦除，不產生執行時行為
*   畸形語法應依階段契約累積診斷資訊

有些專案要求正規化值具有規範形式，有些專案只要求語義等價。應明確選擇哪一種。

## 階段能力 {#stage-capabilities}

```admonish warning title="不要使用萬能編譯器物件"
不要讓一個巨型編譯器物件成為唯一的階段介面。
```

正規化器可能需要以下能力：

*   讀取並擴充繫結作用域
*   解析原始碼名稱
*   累積診斷資訊
*   構造正規化項

程式碼生成器可能需要：

*   分配可執行引用
*   生成指令
*   解析正規化變數
*   完成可執行結構

將各階段入口表達為基於這些能力的擴充。具體環境可以儲存對映、區域分配器、計數器與診斷資訊，但它們並不擁有階段含義。

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

各編譯器的精確能力名稱會有所不同。重要的是依賴明確，階段對映穩定。

## 解析器與執行時可以保持操作式設計 {#parser-and-runtime-can-remain-operational}

並非每個子系統都必須被強制納入同一種編碼。

解析器可能主要由生成式語法機制主導。虛擬機器可能主要依賴高效的狀態變更與排程。它們可以保留操作式設計，同時實作定義清晰的邊界：

| 階段 | 契約 |
| --- | --- |
| 解析器 | 生成`Syntax` |
| 正規化器 | 生成承載含義的`Core` |
| 程式碼生成器 | 以可執行形式保留含義 |
| 執行時 | 生成符合語言模型的觀察 |

指稱設計不會移除機器，而是防止機器悄然成為語言語義。

## 編譯器定律與測試 {#compiler-laws-and-tests}

強有力的證據來自多個方面：

*   針對等價源形式的正規化定律
*   在預期情況下檢查解析與漂亮列印的往返性質
*   比較直接語義求值與編譯後執行
*   規範承諾規範輸出時檢查位元組碼等價
*   執行時符合性場景
*   跨直譯器差分測試

```admonish warning title="位元組相等不等於語義相等"
不要混淆逐位元組相等與語義相等。只有當規範要求編譯結果具有正規形式時，位元組相等才是一項有用的更強性質。
```

## 這對讀者有何幫助 {#how-this-prepares-the-reader}

閱讀語義優先的語言實作時，請留意：

*   語義語法或能力 trait
*   派生的正規化操作
*   明確的階段契約
*   一階核心程式
*   替換、作用域與組合定律
*   解釋階段能力的輕量環境
*   位於邊界處的操作式解析器、編譯器與虛擬機器機制

這個視角連線了一般的指稱設計與 Tolang，展示語義邊界如何引導語言設計、編譯與執行時解釋。
