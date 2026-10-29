<!-- reader: {"title":"重新審視引用透明性","sourceHash":"sha256:3f37fd77a20744f5881d426de372b671f438c12c29fc26e32f79a6cf91e6ab6a"} -->

# 重新審視引用透明性 {#referential-transparency-reloaded}

```admonish tip title="相關內容"
語義視角：[指稱與組合性](../denotational-design/denotations.md)、[定律與解釋](../denotational-design/laws-and-interpretations.md)  
Rust 中的語義驅動設計：[能力代數](../rust-dd/capability-algebras.md)、[派生含義與組合](../rust-dd/derived-meaning.md)  
概念：[引用透明性](../concepts/referential_transparency.md)
```

本頁介紹*引用透明性*的指稱設計解讀。 概念頁討論其歷史與主流語言中的用法。 本頁重點說明 RT 作為設計約束時的含義。

在指稱設計中，RT 並非純性標籤。 它是關於指稱的一條定律：替換必須保留指定含義。

## 以指稱設計重新表述 RT {#denotational-design-restatement-of-rt}

指稱設計將 RT 重新表述為規範要求，而非實作風格。 規範必須先定義可組合含義；之後才選擇執行策略。

因此，應在語義邊界檢查 RT：

*   相同輸入
*   相同的已宣告上下文
*   相同指稱

若這些條件成立，替換就是有效的，並且可以進行等式推理。 即使具體直譯器執行 I/O、併發、重試或狀態轉換，這一點仍然成立，因為這些細節都委託給規範能力邊界之後的實現。

換言之，指稱設計不會問“這個實作是否純？”。 它會問“指稱等式是否明確？直譯器是否保留了這些等式？”

## 純性與 RT {#purity-and-rt}

RT 與純性相關，但並不相同。

*   **RT**是關於含義的一條替換定律。
*   **純性**是一項操作約束：不存在隱藏的可觀察效應。

純性是表示式級程式碼實現 RT 的常見方式。 但 RT 仍是語義標準：替換必須保留指定指稱。

因此，指稱設計不會把 RT 變成“只能寫純程式碼”這樣的風格標籤。 它要求指稱等式明確，並將效應隔離在能力邊界之後。

一種最簡語義解讀是：

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

對於相同的`a`和相同的`io`輸入，`f`會得出相同的`(result, io')`。 這是指稱設計中按上下文索引的替換推理形式。

## RT 為何因此更清晰 {#why-this-clarifies-rt}

許多關於 RT 的爭論混淆了一項有用區別：

*   語義透明性
*   操作性副作用

指稱設計將這些層次分開：

*   語義核心陳述含義
*   直譯器實現執行策略

這種區分既允許實際效應存在，也不會失去基於定律的推理。

## 表示優先設計的失誤模式 {#representation-first-failure-mode}

如果過早確定具體表示，關於 RT 的討論就會偏離到風格爭論：

*   “這種風格是純的”
*   “那種風格不純”
*   “用 IO 包裝器就能解決”

這些大多隻是編碼方式之爭。 指稱設計提出了一個更簡單的問題： 你的規範中哪些等式有效？

## 指稱設計的實用模式 {#practical-dd-pattern}

定義小型能力 trait，並將程式行為寫成其上的擴充。 隨後提供輕量級具體直譯器。

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]`是來自[`extend`crate 的宏](https://docs.rs/extend/latest/extend/)，用於從`impl`塊中生成擴充方法以減少樣板程式碼；它不是新的 Rust 語言特性。

在 Scala 函數語言程式設計中，RT 常透過`F[A]`型別的值來介紹（例如`IO[A]`或`F[Either[E, A]]`）。 這裡的 RT 被表達在更高一層：作為受能力約束的程式含義。 因此，這種 Rust 方法並非以與`F[A]`相同的編碼方式實作的 RT 值容器；它是在明確能力之上規範 RT 行為，並將具體效應委託給實作。

擴充依據能力陳述語義行為。 具體實作負責決定執行策略，例如批次處理、重試、傳輸、並行與儲存細節。

## 最終洞見 {#final-insight}

在指稱設計中，RT 是語義規範的性質。 只要保留已陳述的指稱定律，實作選擇就是次要的。

保留定律。 不要困在標籤之爭裡。
