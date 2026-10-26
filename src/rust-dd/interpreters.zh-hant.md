<!-- reader: {"title":"直譯器與效應"} -->

# 直譯器與效應 {#interpreters-and-effects}

```admonish tip title="相關內容"
語義視角：[定律與解釋](../denotational-design/laws-and-interpretations.md)  
Rust 中的語義驅動設計：[能力代數](capability-algebras.md)、[定律、場景與證據](laws.md)  
概念：[自由單子](../concepts/free_monad.md)  
洞見：[EVM 代數](../insights/evm-alg.md)
```

```admonish note title="導讀"
直譯器為某種能力選擇表示或效應。它實現基本操作，但不會重新定義其上層派生出的領域行為，因此所有直譯器都遵循相同定律。
```

直譯器使用具體表示或效應來實現語義能力。它應選擇實現機制，而不重新定義領域行為。

## 輕量級直譯器 {#a-thin-interpreter}

分支的一種位路徑表示可以是：

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

實作負責儲存和觀察基本事實。`branch_left`、`branch_right`和`branch_is_ancestor`仍留在共享擴充中。

## 直譯器取決於邊界 {#interpreters-are-boundary-relative}

同一種型別在一個邊界上可以是直譯器，在另一個邊界上則可以是語義輸入。

| 邊界 | 使用 | 解釋 |
| --- | --- | --- |
| 檔案系統介面卡 | 檔案系統存取 | 原始碼查詢 |
| 正規化器環境 | 將原始碼查詢作為基本能力 | 正規化語言構造 |
| 編譯器流水線 | 正規化項 | 可執行程式構造 |

不存在唯一通用的“實作層”，而是存在巢狀的語義邊界。

## 邊界處的效應 {#effects-at-the-edge}

具體直譯器負責選擇以下內容：

*   資料庫佈局
*   非同步執行時
*   任務所有權
*   重試策略
*   HTTP 或 RPC 框架型別
*   序列化
*   鎖與通道
*   快取

除非呼叫者需要觀察這些選擇，否則應讓它們留在語義 trait 之外。

例如，語義原始碼能力可以返回原始碼值與錯誤。生產直譯器可以快取檔案並非同步讀取；測試直譯器則可以使用不可變對映。派生的正規化邏輯應能同時適用於二者。

## 執行時所有權 {#runtime-ownership}

框架回撥通常要求狀態具備所有權、可克隆且執行緒安全。這是直譯器的約束，不一定是領域約束。

````admonish warning title="不要讓框架載體汙染基本操作"
避免在基本操作中混入框架載體：

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

優先採用語義應用方式：

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

Web 直譯器可以選擇`Arc<Context>`、提取請求輸入、呼叫`status`並轉換結果。領域呼叫方無需知道 Web 伺服器存在。

## 中性直譯器 {#neutral-interpreters}

並非所有直譯器都需要執行效應。

API 程式的文字直譯器可以記錄：

| 方法 | 路徑 | 輸入 | 輸出 |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

後設資料直譯器可以生成文件。測試直譯器可以收集操作名稱。生產直譯器可以構造伺服器路由。

中性直譯器能夠證明，程式的含義獨立於任何特定執行時。

## 透過委託組合直譯器 {#composing-interpreters-by-delegation}

由於含義存在於小型能力 trait 中，直譯器通常是*組裝*而成，而非從頭寫出。載體透過委託給已有的能力來獲得新能力，因此轉發程式碼由工具生成，無需手寫。兩種形式幾乎就能覆蓋所有情況。

<strong>將能力轉發給欄位。</strong>ambassador 的`#[derive(Delegate)]`會把整個 trait 轉發給內部值。持有多個元件的載體可以將各項能力委託給擁有它的欄位，無需編寫轉發函式體：

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

<strong>透過 getter 授予能力。</strong>為型別提供一個 getter，再由整體實現為所有具有該 getter 的型別提供完整能力：

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

這樣一來，許多結構體根本無需存在。龐大的上下文物件——一個攜帶多個關聯型別與十幾個方法的大型 trait，再加上唯一的具體實作——可以化為幾個小型能力 trait，以及一個精簡載體；載體將每種能力委託給提供該能力的欄位或 getter。檢查截止時間是否已過之類的派生操作，只需作為基本操作之上的擴充編寫一次，無需在每個載體上重新實作。

```admonish warning title="委託轉發的是操作，而非含義"
生成委託程式碼可以省去樣板工作，卻不能確立語義上的可替代性。`derive`諸如 ambassador 的`#[derive(Delegate)]`宏只能證明實現能夠編譯，不能證明該載體指稱相同的直譯器。如果`Shared<T>(Arc<T>)`要替代`T`，就應在載體上檢查定律——會改變共享性或身份的包裝器（`Arc`、池化、快取）可能正確轉發每個方法，卻仍違反新鮮度或唯一性定律。如果載體只是在其他服務之間存放了`T`，使用投影會比委託更誠實。
```

## 錯誤屬於特定邊界 {#errors-belong-to-a-boundary}

錯誤應當在負責處理它的邊界上傳達失敗的含義。

| 錯誤 | 邊界轉換 |
| --- | --- |
| 領域錯誤 | 傳輸直譯器將其對映為協議響應 |
| 解析錯誤 | 編譯器前端將其對映為診斷資訊 |
| 儲存錯誤 | 原始碼直譯器將其對映為語義層面的原始碼失敗 |

不要把 HTTP 狀態碼、RPC 錯誤物件或資料庫錯誤強加給基本領域 trait。應在直譯器邊界處轉換它們。

## 在效能可觀察之前，它屬於解釋範疇 {#performance-is-an-interpretation-concern-until-observed}

批次處理、並行、快取與資料佈局通常屬於直譯器。只有當規範承諾了可觀察的順序、時間、資源使用、公平性或失敗行為時，它們才成為語義的一部分。

這種區分能夠在避免語義漂移的同時進行最佳化：

*   遵循相同定律
*   宣告相同觀察
*   採用不同操作策略

## 審查要點 {#review-checks}

*   直譯器是否實作基本操作，而非重複派生邏輯？
*   執行時與框架約束是否限定在使用這些約束的邊界內？
*   中性直譯器或測試直譯器能否實作同一能力？
*   傳輸與儲存錯誤是否在邊界處轉換？
*   委託表達的語義關係是否準確？
*   根據所述指稱，效能差異是否不可觀察？
