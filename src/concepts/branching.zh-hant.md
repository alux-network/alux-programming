<!-- reader: {"title":"分支與合流","sourceHash":"sha256:7b0ae3cd887e2ddebc21b9054fddd9eb54d1c7452218516c8a6c0da578ce05b1"} -->

# 分支與合流 {#branching-and-confluence}

```admonish tip title="相關內容"
語義視角：[指稱與組合性](../denotational-design/denotations.md)、[定律與解釋](../denotational-design/laws-and-interpretations.md)  
Rust 中的語義驅動設計：[定律、場景與證據](../rust-dd/laws.md)  
概念：[操作語義](operational_semantics.md)
```

分支、確定性、合流、軌跡等價與雙模擬都涉及計算中的多種可能，但它們並非同一種性質。

```admonish note title="語義定位"
控制流分支屬於操作結構。合流性是歸約關係的性質。軌跡等價與雙模擬用於比較行為。指稱等價則比較所選語義域中的含義。健全的設計應明確說明所需的等價關係，而不是非正式地在這些概念之間切換。
```

## 行為等價 {#behavioral-equivalence}

併發與互動式程式很少只有一個最終結果。一個常見的起點是**標記遷移系統**：

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

其中$S$是狀態集合，$A_{\tau}$是可觀察動作標籤與一個內部動作$\tau$的集合，$\to\;\subseteq S \times A_{\tau} \times S$是轉換關係。我們將$p \xrightarrow{a} p'$記作：狀態$p$可以執行動作$a$並變為$p'$。

行為等價會說明有意忽略這些系統之間的哪些差異：

*   **線性時間觀察**沿著已完成或部分執行記錄發生的事件
*   **分支時間觀察**還會保留何時出現了哪些選擇，以及選擇何時確定

因此，兩個系統可能有相同軌跡，卻具有不同分支結構。一個系統可能在互動前就在兩個動作間選擇，另一個系統則推遲到互動之後才選擇。動作序列相同，但後續可能性不同。

van Glabbeek 提出的[線性時間—分支時間譜](https://ir.cwi.nl/pub/5685/5685.pdf)，系統整理了這些行為等價關係。它並非從弱到強的排序；譜中的每一點都保留不同的觀察。

## Rust 程式中的分支 {#branching-in-rust-programs}

`if`會根據條件選擇一個分支：

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

`match`會根據某個值選擇一個分支：

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

對於確定性語言中的固定輸入，這些構造會選擇可預測的控制流路徑。這種性質稱為**確定性**，而非合流性。

## 合流性的含義 {#what-confluence-means}

如果某個項的兩種歸約方式最終能夠再次匯合，那麼該歸約關係就是合流的：

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

形式化地說，若：

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

則必然存在某個`d`，使得：

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

合流性允許存在多條歸約路徑。它表示這些路徑能夠到達共同後繼，因此彼此相容。

## 確定性與合流性 {#determinism-and-confluence}

確定性歸約關係中，每個狀態最多隻有一個後續步驟。因此它自然滿足合流性：沒有相互競爭的單步選擇需要協調。

反過來則不成立。系統可以允許多種歸約順序，同時仍滿足合流性，因為所有順序最終都會得到相同結果。

普通 Rust 的`if`與`match`表示式展示了確定性選擇，但單憑它們無法體現合流性的有趣之處。

## Church–Rosser 性質 {#churchrosser}

Church–Rosser 定理說明了 lambda 演算歸約的合流性質。如果一個項沿不同歸約路徑得到兩個結果，那麼這兩個結果存在共同歸約結果。

只要正規化存在，合流性就意味著它唯一。這支援等式推理，因為求值順序不會改變最終正規化。

不要將此結果推廣到任意命令式程式。副作用、非確定性排程、失敗以及對中間狀態的觀察，都可能使不同歸約順序產生差異。

## 軌跡 {#traces}

**軌跡**記錄一系列可觀察動作或狀態。與只記錄結果的語義相比，軌跡語義有意保留更多操作資訊。

兩個純函式可以返回同一結果，卻經過不同內部步驟。如果結果指稱忽略了這些步驟，它們在該指稱下相等；但在軌跡語義下，它們未必相等。

存在效應時，調整檢查順序可能改變觀察：

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

先檢查`is_admin`還是先檢查`is_user`，可能返回等價分類，卻列印出不同軌跡。

設計問題在於，這些列印資訊是否屬於所選語義域。

## 軌跡等價 {#trace-equivalence}

如果兩個系統在選定的軌跡模型下允許相同的可觀察軌跡，它們就是軌跡等價的。

軌跡等價可能忽略分支結構。兩個系統可以生成相同軌跡，但一個比另一個更早確定選擇。在互動式與併發系統中，這種區別可能很重要。

## 雙模擬 {#bisimulation}

雙模擬逐步關聯兩個遷移系統。每當一個系統執行可觀察動作，另一個系統就必須能夠匹配該動作，而且遷移後的狀態仍須保持關聯。

常見變體包括：

*   **強雙模擬**，用於匹配單個狀態轉換
*   **弱雙模擬**，用於抽象選定的內部轉換
*   **分支雙模擬**，用於抽象內部工作，同時保留重要的選擇結構

雙模擬通常比軌跡等價提供更強的行為比較，因為它會觀察互動過程中各種選擇是否仍然可用。

<details>
<summary><strong>起源與形式定義</strong></summary>

Milner 在[*《通訊系統演算》*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)中為通訊過程發展了觀察等價。隨後 Park 在[*《無限序列上的併發與自動機》*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)中，以餘歸納方式刻畫了相應的等價關係，給出了現稱為雙模擬的最大不動點關係與證明方法。Milner 隨後採用並發展了這一方法，將其作為推理過程行為的基礎。

<strong>強雙模擬。</strong>對於標記遷移系統，若關係$R$滿足以下條件，則它是強雙模擬：當$p\mathrel{R}q$成立時，對於每個動作$a$：

*   如果$p\xrightarrow{a}p'$成立，則存在某個$q'$，使得$q\xrightarrow{a}q'$與$p'\mathrel{R}q'$成立；並且
*   如果$q\xrightarrow{a}q'$成立，則存在某個$p'$，使得$p\xrightarrow{a}p'$與$p'\mathrel{R}q'$成立。

如果存在某個雙模擬關係關聯兩個狀態，那麼它們就是雙模擬等價的。這一定義是餘歸納的：匹配某個狀態轉換後，後繼狀態必須再次滿足相同的行為義務。

<strong>分支雙模擬。</strong>在一種忽略發散的常見表述中，如果對稱關係$R$滿足以下條件，那麼它就是分支雙模擬：當$p\mathrel{R}q$與$p\xrightarrow{a}p'$成立時，以下情況至少一種成立：

*   $a = \tau$與$p'\mathrel{R}q$成立；或
    
*   存在狀態$q_0$與$q'$，使得
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

這裡，$\xRightarrow{\tau}$表示零次或多次內部轉換。要求中間狀態$q_0$仍與$p$保持關聯，正是為了忽略內部工作時仍能保留相關的分支可能性。van Glabbeek 與 Weijland 在[*《雙模擬語義中的分支時間與抽象》*](https://ir.cwi.nl/pub/5564/5564D.pdf)中引入並發展了這一等價關係。

</details>

## 指稱相等 {#denotational-equality}

指稱相等取決於所選語義域：

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

語義域本身可以由軌跡、以雙模擬等價關係取商的遷移系統、結果集合或其他數學模型構成。指稱設計不規定某個通用等價關係，而是要求明確選擇等價關係，並以組合方式使用它。

其關係如下：

1.  從作業系統開始。
2.  選定相關觀察。
3.  選擇語義域與等價關係。

## 作為資料的分支 {#branching-as-data}

分支也會以樹的結構出現。二叉路徑可以表示為一串左右選擇。這種表示適用於字首樹、執行識別符號、決策圖與記憶體定址。

[《為何含義優先》](../denotational-design/semantic-view.md)中的語義分支位置示例，特意將樹的含義與一種位向量編碼區分開來。

Conal Elliott 曾用完美二叉葉樹結構描述記憶體定址。重點並不是每臺機器都會按字面儲存一棵源級樹，而是組合式樹模型能夠揭示扁平數值地址所隱藏的有用結構。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott——將記憶體定址視為完美二叉葉樹</figcaption></figure>

## 對比 {#comparison}

| 概念 | 研究物件 | 核心問題 |
| --- | --- | --- |
| 控制流分支 | 一次程式執行 | 會選擇哪個延續？ |
| 確定性 | 轉換關係 | 下一步是否由當前狀態唯一決定？ |
| 合流性 | 歸約關係 | 不同歸約路徑能否匯合？ |
| 軌跡等價 | 可觀察動作序列 | 系統是否允許相同軌跡？ |
| 雙模擬 | 分支轉換結構 | 系統能否匹配彼此的動作？ |
| 指稱相等 | 所選語義域 | 程式是否具有相同的指定含義？ |

這些概念可以相互支援，但不能彼此互為同義詞。

## 延伸閱讀 {#further-reading}

*   [*《通訊系統演算》*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)——Milner 對 CCS 與觀察等價的奠基性論述
*   [*《無限序列上的併發與自動機》*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)——Park 對雙模擬的餘歸納刻畫
*   [*《非確定性與併發的代數定律》*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf)——Hennessy 與 Milner 關於觀察同餘與代數定律的論述
*   [*《什麼是分支時間，為什麼要使用它？》*](https://theory.stanford.edu/~rvg/branching/)（[壓縮版 PDF](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)）——簡明闡述保留分支結構的動機
*   [*《線性時間—分支時間譜》*](https://ir.cwi.nl/pub/5685/5685.pdf)——行為等價的標準分類
*   [*《雙模擬語義中的分支時間與抽象》*](https://ir.cwi.nl/pub/5564/5564D.pdf)——分支雙模擬的奠基性論述
*   [*《分支雙模擬的三種邏輯》*](https://ir.cwi.nl/pub/1370/1370D.pdf)——透過 Hennessy–Milner 風格邏輯與不含下一時刻運算子的 CTL\* 給出邏輯刻畫
