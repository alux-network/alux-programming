<!-- reader: {"title":"定律、場景與證據"} -->

# 定律、場景與證據 {#laws-scenarios-and-evidence}

```admonish tip title="相關內容"
語義視角：[定律與解釋](../denotational-design/laws-and-interpretations.md)  
Rust 中的語義驅動設計：[直譯器與效應](interpreters.md)、[能力代數](capability-algebras.md)  
概念：[分支與合流](../concepts/branching.md)、[引用透明性](../concepts/referential_transparency.md)
```

```admonish note title="導讀"
測試為規範提供證據。應針對公開可觀察的結果，以及所選語義域支持的定律撰寫斷言，而非針對私有執行步驟；並將這些定律以針對該能力的泛型形式表述，讓每個直譯器都接受同樣的檢驗。
```

語義優先的程式碼需要語義優先的測試。測試公開可觀察的結果與定律，而非私有執行步驟。

## 測試規範介面 {#test-the-specification-surface}

````admonish warning title="與表示耦合的測試"
這個斷言深入存取某個載體的欄位，因此其他直譯器無法複用：

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

語義測試：

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

如果測試物件是位編碼的序列化模組，第一個測試可能合適。但對於分支代數，它提供的證據較弱，因為替代表示無法複用它。

## 可複用的定律擴充 {#reusable-law-extensions}

如果某項性質適用於所有相容直譯器，就把它寫一次：

```rust,noplayground
use anyhow::{Result, bail, ensure};
use extend::ext;

#[ext(name = BranchLawsExt)]
pub impl<This> This
where
    This: BranchAlg,
    This::Branch: Clone + Eq,
{
    fn check_branch_root_round_trip(&self, directions: &[Direction]) -> Result<()> {
        let root = self.branch_root();
        let branch = directions.iter().copied().fold(root.clone(), |branch, direction| self.branch_grow(&branch, direction));

        let Some(path) = self.branch_path(&root, &branch) else {
            bail!("grown branch has no path from root");
        };
        ensure!(path == directions, "root path did not round-trip");
        Ok(())
    }
}
```

每個直譯器都執行同一個檢查器。`anyhow::Result`承載結果；`bail!`報告缺失的觀察，而`ensure!`檢查往返定律。該檢查器無需依賴某一種分支表示，就能區分這兩種失敗。

## 有用的定律類別 {#useful-law-families}

尋找語義結構已經暗示的性質：

*   單位元
*   結合性
*   確實有意要求時的交換性
*   冪等性
*   往返
*   正規化
*   細化
*   單調性
*   替換
*   解釋一致性

```admonish warning title="只主張該領域支援的定律"
不要僅僅因為熟悉或聽起來很數學，就新增代數術語。只陳述所選領域支援的定律。
```

## 定律與表示不變數 {#laws-versus-representation-invariants}

請將以下內容區分開：

*   <strong>語義定律：</strong>根據根路徑重構一個分支時，所指稱的仍是同一個分支。
    
*   <strong>表示不變數：</strong>未使用的高位為零。
    
*   **序列化定律：**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **規範格式定律：**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

這些都可能很重要，但各自屬於不同的規範。

## 共享場景 {#shared-scenarios}

場景是針對公共能力編寫的可複用互動。ALUX 測試框架以這種方式表示場景：編寫場景的程式碼透過`Scenario`、`DeployerIds`、`PlayAst`和`ScenarioSchedule`能力構造一個值，無需點名具體執行器。

```rust,noplayground
#[ext(name = HelloScenarioExt)]
pub impl<This> This
where
    This: StandaloneScenario,
    This::Step: PlayAst<Ast = RProc>,
{
    fn hello(self) -> This::Scenario {
        self.scenario()
            .under_comprehensive(100)
            .step(
                self.play_ast(
                    self.deployer(0),
                    tolang! {
                        let x in {
                            x ! "hello" |
                            ? (a <- x) a.log()
                        }
                    },
                )
                .expect_log(r#""hello""#),
            )
    }
}
```

每次呼叫都描述作者定義的含義，而不是執行器機制。`under_comprehensive(100)`要求在一次順序執行、100 次完全併發執行以及最多 100 次亂序執行中都得到預期日誌。場景固定所觀察的內容，執行器則改變執行順序。

同一原則也適用於不同直譯器：如果多個執行器都實作了場景所用的能力，它們就都可以解釋同一個編寫好的互動。執行器特有的設定與邊界檢查應留在場景之外。

## 跨直譯器一致性 {#cross-interpreter-agreement}

當兩個直譯器提供相同觀察時，可以比較它們：

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

這可以捕捉獨立快照遺漏的漂移。對於 API 定義、編譯器階段與替代資料表示，這尤其有價值。

## 有限證據並非證明 {#finite-evidence-is-not-proof}

測試透過，只能證明在受測輸入與實作下觀察到了相應行為，不能證明某條定律對所有值都成立。

有計劃地提升保證強度：

1.  示例測試
2.  可複用場景測試
3.  生成式性質測試
4.  對有限域進行窮舉檢查
5.  模型比較
6.  證明產物

根據風險與主張強度選擇層級。

## 讓測試名稱表達含義 {#test-names-should-state-meaning}

優先使用：

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

避免只敘述實作過程的名稱：

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

如果操作順序本身有規範規定，操作測試仍然有效。此時應在名稱中指出讓該順序具有意義的觀察。

## 審查要點 {#review-checks}

*   每個新增的語義操作是否都有針對性的定律或斷言？
*   可複用義務是否針對公共能力以泛型方式表達？
*   場景是否與具體執行器分離？
*   是否區分了語義定律與表示不變數？
*   在可行時是否比較了多個直譯器？
*   文件是否避免把有限測試稱作證明？
