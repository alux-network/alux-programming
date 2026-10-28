<!-- reader: {"title":"一階程式","sourceHash":"sha256:963dfa4d3aafbcfe83acf16b8c79baeceaab0bf4e0106b971e32a212ecb279af"} -->

# 一階程式 {#first-order-programs}

```admonish tip title="相關內容"
Rust 中的語義驅動設計：[派生含義與組合](derived-meaning.md)、[語言與編譯器流水線](compiler-pipelines.md)  
概念：[延續傳遞風格](../concepts/cps.md)、[去函式化](../concepts/defunctionalization.md)、[自由單子](../concepts/free_monad.md)  
洞見：[重新審視表示式問題](../insights/expression-problem.md)
```

```admonish note title="何時將應用具體化為資料"
普通函式與擴充已經可以表達派生行為。只有當另一個直譯器必須在執行前檢查、組合、序列化或編譯程式時，才應將應用轉換為一階資料。
```

普通函式與擴充方法通常是表達派生行為的最佳方式。但有時另一個直譯器必須在執行程式之前，先檢查、組合、產生文件、序列化或編譯程式結構。這時，應用本身必須成為一階資料。

## 執行會抹去結構 {#execution-erases-structure}

考慮：

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

呼叫此方法會得到一個狀態。呼叫開始後，外部直譯器通常無法再恢復以下資訊：

*   語義上下文型別
*   有序引數
*   源引數名稱
*   結果型別
*   操作的身份

這些資訊原本存在於原始碼級別的函式型別中，但普通執行過程會消耗掉它們。

## 對應用進行去函式化 {#defunctionalizing-application}

去函式化會將某個已知函式族中的成員替換為一階標籤，並提供一個共享的應用操作。

一組最小操作詞彙如下：

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

零大小的`CurrentStatusOperation<App>`可以表示對原擴充方法的呼叫。它應當呼叫該方法，而不是包含一份重複的函式體。

1.  從擴充方法開始。
2.  將其具體化為操作型別。
3.  保留其上下文、引數乘積、引數名稱與輸出。
4.  透過`ApplyAlg`對其進行解釋。

普通呼叫仍可使用原有便捷方法。只有需要一階結構的上下文才會用到操作值。

## 沒有使用者時，不要具體化為資料 {#do-not-reify-without-a-consumer}

一階程式會增加型別機制。只有當它們能支援真正的第二種解釋時才使用：

*   執行時註冊
*   生成文件或模式
*   靜態檢查
*   執行前組合程式
*   序列化
*   編譯

如果程式碼只需呼叫函式，就保留函式即可。

## 可移植介面程式 {#portable-interface-programs}

假設 HTTP 介面包含：

| 方法 | 路徑 | 輸入 | 操作 | 輸出 |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | 正文：`f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | 流式檔案 |

可移植程式必須保留：

*   方法與路徑選擇器
*   輸入角色，例如路徑、查詢引數、正文、請求頭與身份驗證
*   操作值
*   輸出角色，例如 JSON 或檔案
*   路由合併與巢狀

不應保留某個特定框架的請求、路由器或響應型別。

一種流暢記法可以是：

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

這些流暢呼叫會構造一個有型別的程式，不必立即註冊伺服器路由。

## 一個程式，多種摺疊解釋 {#one-program-several-folds}

同一個一階程式可以支援多種解釋：

| 程式 | 解釋 |
| --- | --- |
| 有型別的 HTTP 程式 | 文字文件、可執行路由、OpenAPI 後設資料、客戶端繫結、符合性測試 |
| 有型別的 JSON-RPC 程式 | 方法登錄檔、模式、客戶端、測試框架 |

不要為執行與文件分別維護路由或方法清單，否則會產生彼此競爭的規範。

## 輸入與輸出角色 {#input-and-output-roles}

操作已經知道自身的引數與結果型別。傳輸宣告只應新增傳輸含義。

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`、`query`和`json`用於標識角色，不應要求作者重新宣告已經由`ApplyAlg`決定的輸出型別。

輸出轉換屬於傳輸直譯器。伺服器可以將一種結果轉換為 JSON，將另一種結果轉換為流式附件。語義操作無需瞭解任何一種表示。

## 組合本身就是程式含義 {#composition-is-program-meaning}

程式應保留通用組合操作：

*   空程式
*   合併程式
*   將程式巢狀在某個字首下
*   將端點提升為程式

這些操作比某個框架的路由器方法更基礎。熟悉的流暢名稱，例如`get`、`post`、`merge`和`nest`，都可以作為中性代數的別名。

獨立規範可以釋出小型程式：

| 輸入程式 | 組合 | 結果 |
| --- | --- | --- |
| 狀態與下載程式 | 合併 | 服務程式 |
| 目錄程式 | 巢狀 | 服務程式 |

應用程式負責選擇並解釋最終的組合。

## 宏必須展開為公開的語義結構 {#macros-must-lower-to-public-meaning}

Rust 宏可以讓一階宣告更加簡潔：

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

只有當宏展開後得到公開且可手動構造的一階程式時，宏設計才算健全。生成的回呼不應成為介面的唯一規範定義。

良好方向：

1.  便捷語法
2.  公開的操作值與程式值
3.  泛型摺疊解釋
4.  具體框架

表示優先的方向：

1.  框架註解
2.  不透明的生成回撥
3.  逆向整理的文件

## 與既有概念的關係 {#relation-to-existing-concepts}

一階介面程式建立在其他章節介紹的技術之上：去函式化是通用變換；可擴充語法與解釋對應表示式問題；自由單子則是一種特定的“帶順序的語法”表示。頁面頂部的“相關內容”連結可以跳轉到各自章節。

不要把這些技術等同於指稱設計本身。指稱設計決定哪些結構很重要；當普通呼叫會抹去這些結構時，一階表示負責保留它們。

## 審查要點 {#review-checks}

*   是否有真實的第二種直譯器需要將程式具體化？
*   操作是否呼叫作者定義的方法，而非複製其實現？
*   引數與輸出是否從操作中推斷得出？
*   傳輸語法是否只新增了傳輸角色？
*   程式是否可以在不使用便捷宏的情況下構造？
*   執行時與後設資料是否解釋同一個程式？
