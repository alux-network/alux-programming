<!-- reader: {"title":"Rust 中的語義型別","sourceHash":"sha256:f260bada57ff228ad424bf6ea7f98dc225853e8a47e5611be37891f06f97e8af"} -->

# Rust 中的語義型別 {#semantic-types-in-rust}

```admonish tip title="相關內容"
語義視角：[依賴型別與證明](../denotational-design/dependent-types.md)、[指稱設計](../denotational-design/design.md)  
Rust 中的語義驅動設計：[能力代數](capability-algebras.md)、[一階程式](first-order-programs.md)、[定律、場景與證據](laws.md)  
概念：[引用透明性](../concepts/referential_transparency.md)
```

```admonish note title="導讀"
依義設計優先的 Rust 使用型別來顯露語義結構。關聯型別為載體族命名，約束陳述它們之間的關係，擴充則從明確前提推導出新操作。定律仍然決定每種解釋都必須保留什麼。
```

在 Rust 中，`type`一詞可以指代多種不同角色。將它們區分開，能避免含義坍縮為表示。

| 角色 | 示例 | 表達的內容 |
| --- | --- | --- |
| 語義型別 | `Direction` | 哪些領域區別很重要 |
| 由直譯器選擇的載體 | `BranchAlg::Branch` | 直譯器選擇哪種表示 |
| 派生操作 | `BranchExt::branch_child` | 根據已宣告能力可以推出什麼 |
| 階段型別 | `Syntax`, `CoreProgram`, `Executable` | 某個值經過了哪種變換 |
| 表示型別 | `BitBranch` | 某個直譯器如何儲存分支含義 |
| 證據程式 | 場景或可複用的定律擴充 | 相容直譯器必須滿足哪些觀察 |

## 表示之前先確定語義型別 {#semantic-types-before-representation}

假設某個分支領域區分兩個方向：

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction`直接表達了這一區別。一種直譯器可以緊湊地編碼路徑：

```rust,noplayground
struct BitBranch(Vec<bool>);
```

布林值屬於這種表示。它們並非左右方向的定義，其他直譯器也不必使用它們。

```admonish warning title="緊湊編碼不等於語義型別"
不要根據位位置、位元組偏移或機器分支來定義領域行為。這些產物應編碼語義區別，而不是擁有這些區別的定義權。
```

這種區分讓儲存與執行佈局可以改變，而不悄然改變領域本身。

## 關聯型別選擇載體 {#associated-types-choose-carriers}

能力代數可以把載體留給各個直譯器選擇：

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```

`Self::Branch`不是隱藏的欄位型別，而是對分支含義作出解釋時所選的載體。位路徑、數值樹位置、符號項或其他表示都可以滿足同一個代數。

對於直譯器`T`而言，記法`T::Branch`可以理解為一個載體族$\mathsf{Branch}(T)$。切換直譯器可能改變載體，但每種操作仍會根據同一選擇保持一致索引。

## 擴充用於推導結論 {#extensions-derive-consequences}

擴充可以根據它恰好需要的前提構造新操作：

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

`where`子句是前提：`This`對分支代數作出解釋。方法則是結論：對於該直譯器的載體，分支與方向決定一個子分支。

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

推導過程沒有選擇具體的分支表示。結果仍然屬於直譯器所選的載體族。

## 相等約束用於陳述相容性 {#equality-bounds-state-compatibility}

兩種能力有時需要對載體達成一致。關聯型別相等約束可以陳述這一要求，而無須選擇具體表示：

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

可以把這個約束讀作一個區域性命題：`Left`和`Right`在同一載體上解釋分支操作。應將這一相等要求放在需要達成一致的操作上，而不是全域性強加給任一代數。

與僅僅因為某個具體上下文碰巧同時包含兩種實作就接受它相比，這種約束更強，也更精確。

## 階段型別讓編譯器契約一目瞭然 {#stage-types-make-compiler-contracts-visible}

編譯器流水線不應讓一個無法區分階段的語法樹貫穿所有環節。不同階段型別可以說明已經發生了哪種變換：

| 階段 | 輸入 | 輸出 | 契約 |
| --- | --- | --- | --- |
| 解析 | 源文字 | `Syntax` | 識別表層語法 |
| 正規化 | `Syntax` | `CoreProgram` | 生成所選的核心含義 |
| 程式碼生成 | `CoreProgram` | `Executable` | 以可執行形式保留程式觀察 |
| 執行時 | `Executable` | 可觀察行為 | 依據語言模型一致地解釋可執行程式 |

這些型別可防止意外混淆階段，但僅憑名稱無法證明保留性。仍需陳述變換定律、設計代表性場景，並提供跨直譯器證據。

## 閱讀契約 {#read-the-contract}

型別層面的結構可以作如下邏輯解讀：

| Rust 形式 | 解讀 |
| --- | --- |
| `This: BranchAlg` | `This`提供了對分支含義的解釋 |
| `This::Branch` | 分支載體由`This`選擇 |
| `Right: BranchAlg<Branch = Left::Branch>` | 兩種解釋在載體上保持一致 |
| `-> This::Branch` | 結果仍屬於所選載體族 |

這種解讀鼓勵 API 顯露決定型別的因素、組合所需的等式，以及這些前提能推出的結論。只要底層區別確實存在，關聯型別、泛型關聯型別、const 泛型、型別狀態與零大小見證都可以表達此類契約的一部分。

不要僅僅為了讓實作看起來更形式化，就憑空製造型別層面的機制。型別應當顯露含義或保留必要關係，而不是裝飾一種表示。

## 型別不能替代定律 {#types-do-not-replace-laws}

型別簽名約束哪些程式能夠構造，定律則約束這些程式的操作之間如何關聯。二者缺一不可。

例如，`BranchAlg::Branch`說明每個直譯器都會選擇一種分支載體，但它本身並不能確立以下性質：

*   從某個分支到其自身的路徑為空
*   重放根路徑可以重構出該分支
*   相反方向的子節點彼此不同

這些是相容直譯器共同遵循的語義定律。特定於表示的主張（例如未使用的位必須為零）則屬於選擇該表示的直譯器。

```admonish quote title="將型別視為主張"
詢問每種型別主張什麼、由什麼決定、需要哪些定律補全，以及由哪個直譯器實現。
```

## 審查要點 {#review-checks}

*   領域區別是否先於緊湊的機器編碼出現？
*   關聯型別是否是由直譯器選擇的載體，而非偽裝的具體狀態？
*   相等約束是否只陳述該使用位置所需的相容性？
*   不同編譯器階段是否採用不同型別並具有明確契約？
*   語義命題是否與表示不變數分開？
*   Rust 無法表達的主張是否有可複用定律或場景作為依據？
