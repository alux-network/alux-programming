<!-- reader: {"title":"派生含義與組合"} -->

# 派生含義與組合 {#derived-meaning-and-composition}

```admonish tip title="相關內容"
語義視角：[指稱設計](../denotational-design/design.md)  
Rust 中的語義驅動設計：[能力代數](capability-algebras.md)、[直譯器與效應](interpreters.md)  
概念：[表示式問題](../concepts/expression-problem.md)
```

```admonish note title="導讀"
派生行為應歸屬於它所使用的能力，並在擴充中基於這些約束定義一次，供所有直譯器共享；它不應屬於某個碰巧實作這些能力的具體型別。`where`子句誠實地說明了該推導依賴什麼。
```

基本能力提供詞彙。大多數應用行為都應從這些詞彙派生一次，並由所有直譯器共享。

## 擴充擁有派生定義 {#extensions-own-derivations}

使用[`extend`](https://docs.rs/extend/latest/extend/) crate，可以獨立於表示派生分支操作：

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

`where`子句完整宣告瞭語義依賴：`BranchAlg`，除此之外別無其他。沒有任何具體分支型別擁有這些定義。

宏只是省去了 trait 與 impl 的樣板程式碼。普通擴充 trait 也能表達相同設計。指稱設計體現在語義邊界與派生定義中，而不在屬性宏裡。

## 為什麼不把它放進結構體？ {#why-not-put-it-on-the-struct}

````admonish warning title="不要把派生含義焊死在結構體上"
這屬於表示優先設計。如果引入數值分支載體，就必須複製或重新實作派生邏輯，首個具體型別也會意外變成規範本身。

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

擴充反轉了歸屬關係：

| 層 | 職責 |
| --- | --- |
| 語義能力 | 擁有派生含義 |
| 具體型別 | 解釋基本含義 |

## 基於約束組合 {#compose-with-bounds}

當一個接收者解釋多種能力時，使用直接約束：

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="不要捆綁能力"
不要僅僅為了縮短約束就建立超 trait：

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

能力捆綁會掩蓋哪個操作使用了哪些能力，還會額外建立一種所有直譯器都必須滿足的介面。
````

## 五種不同的組合含義 {#five-different-composition-meanings}

選擇能夠如實描述這種關係的形式。

| 情形 | Rust 結構 |
| --- | --- |
| 一個接收者解釋多種能力 | 直接約束 |
| 由單獨的值選擇行為 | 顯式策略引數 |
| 獨立策略靜態組合 | 乘積型別或普通結構體 |
| 環境承載另一個直譯器 | 小型`HasX`投影 |
| 包裝器替代內部直譯器 | 委託 |

### 顯式策略 {#explicit-policy}

如果某種策略獨立選擇，就將它顯式傳入擴充：

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

擴充擁有共享的派生定義，而策略仍是獨立選擇的輸入。它不會隱藏在環境中，也不會由`Default`選擇。

### 策略乘積 {#product-of-policies}

無需發明繼承機制，也能組合獨立策略：

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### 投影 {#projection}

一個`HasClock` trait 僅表明環境可以投影出一個獨立的時鐘值：

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

讀取時間的操作會在自己的`This::Clock: ClockAlg`能力`where`子句中新增該能力。投影只說明包含關係；使用時間的操作則說明自己需要哪種能力。只有在這種分離確實存在時才採用該模式。不要僅僅為了整理欄位就引入`HasX`。

### 委託 {#delegation}

委託意味著包裝器本身可以替代內部直譯器。這適用於透明新型別、共享指標，以及完整保留能力契約的介面卡。

投影表示“擁有”。委託表示“就是”。二者不能互換。

## 預設值也是語義決策 {#defaults-are-semantic-decisions-too}

機械的空狀態可以實作`Default`。領域策略通常應當顯式給出。

有用的情形往往可以用代數解釋：預設值是該型別自然組合運算的單位元。追加空緩衝區、與空對映合併，或累積零條診斷資訊，都不會帶來額外貢獻。若這種組合滿足結合律，該型別與操作便構成么半群；此時`Default`可以命名其中的中性元，而非替使用者選擇策略。

合適的預設值：

*   空緩衝區
*   空對映
*   累積的診斷數量為零

值得懷疑的預設值：

*   法定人數閾值
*   領導者策略
*   重試語義
*   確認深度
*   輸出格式

關鍵區別在於：中性元不會引入決策，而法定人數、領導者策略或重試規則會選擇領域行為。如果更改預設值會改變領域含義，就應顯式組合該策略。

## 派生含義應保持封閉 {#derived-meaning-should-stay-closed}

擴充只能使用已宣告的能力與顯式輸入。直接存取欄位、全域性狀態和具體型別向下轉型都會使`where`子句變得不誠實。

審查函式體時，應把它看作對依賴宣告的證明：

```admonish question title="逐項檢查推導"
函式體中的每個操作，是否都能由這些約束證明合理？
```

如果不能，要麼約束不完整，要麼程式碼屬於其他層。

## 審查要點 {#review-checks}

*   派生行為是否只在能力之上定義一次？
*   擴充是否避免依賴具體欄位與上下文型別？
*   單個直譯器是否使用直接約束？
*   獨立選擇的策略是否以顯式值傳入？
*   投影與委託所表達的關係是否準確？
*   領域預設值是否在組合中清晰可見？
