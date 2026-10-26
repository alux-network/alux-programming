<!-- reader: {"title":"法則、シナリオ、証拠"} -->

# 法則、シナリオ、証拠 {#laws-scenarios-and-evidence}

```admonish tip title="関連項目"
意味論的な見方：[法則と解釈](../denotational-design/laws-and-interpretations.md)  
Rustで意味から設計する：[インタープリターと副作用](interpreters.md)、[ケイパビリティ代数](capability-algebras.md)  
概念：[分岐と合流性](../concepts/branching.md)、[参照透過性](../concepts/referential_transparency.md)
```

```admonish note title="概要"
テストは仕様を裏付ける証拠です。非公開の実行手順ではなく、公開された観測と、選択した領域が支える法則を検査します。また、すべてのインタープリターに同じ要求を課せるよう、法則はケイパビリティに対してジェネリックに保ちます。
```

意味を第一に考えるコードには、意味を第一に考えるテストが必要です。非公開の実行手順ではなく、公開された観測と法則をテストします。

## 仕様の表面をテストする {#test-the-specification-surface}

````admonish warning title="表現に結び付いたテスト"
このアサーションは一つの担体のフィールドを調べるため、ほかのインタープリターと共有できません。

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

意味論的なテスト：

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

ビット符号化を対象とするシリアライズモジュールなら、最初のテストが適切な場合もあります。しかし別の表現と共有できないため、分岐代数を裏付ける証拠としては弱いものです。

## 再利用可能な法則拡張 {#reusable-law-extensions}

すべての互換インタープリターに当てはまる性質は、一度だけ記述します。

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

すべてのインタープリターで同じチェッカーを実行します。`anyhow::Result`は結果を運び、`bail!`は不足している観測を報告し、`ensure!`は往復法則を検査します。チェッカーは分岐表現に依存せず、二種類の失敗を区別します。

## 有用な法則の類型 {#useful-law-families}

意味論的な構造から導かれる性質を探します。

*   恒等性
*   結合性
*   意図が真にある場合の可換性
*   冪等性
*   往復性
*   正準化
*   精緻化
*   単調性
*   置換
*   解釈の一致

```admonish warning title="領域が支える法則だけを主張する"
数学的に聞こえるからといって、馴染みのある代数用語を加えないでください。選択した領域が支える法則だけを述べます。
```

## 法則と表現不変条件 {#laws-versus-representation-invariants}

次のものを区別します。

*   <strong>意味論的法則：</strong>根からの経路を使って分岐を再構成すると、同じ分岐を表す。
    
*   <strong>表現不変条件：</strong>未使用の上位ビットはゼロである。
    
*   **シリアライズ法則：**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **正準形式の法則：**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

どれも重要な場合がありますが、別々の仕様に属します。

## 共有シナリオ {#shared-scenarios}

シナリオは、公開ケイパビリティに対して記述した、再利用可能な相互作用です。ALUXのテストフレームワークでは、シナリオの記述コードが`Scenario`、`DeployerIds`、`PlayAst`、`ScenarioSchedule`のケイパビリティを使って値を構築し、具体的なランナー名を指定しません。

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

各呼び出しは、ランナーの仕組みではなく記述された意味を表します。`under_comprehensive(100)`は、逐次実行100回、自由な並行実行100回、順列を変えた実行を最大100回行った場合に、期待するログが得られることを要求します。シナリオは観測内容を固定し、ランナーが実行順序を変えます。

同じ原則はインタープリター間にも当てはまります。シナリオが使うケイパビリティを複数のランナーが実装するなら、同じ記述上の相互作用をそれぞれ解釈できます。ランナー固有の準備や境界の検査は、シナリオの外に置きます。

## インタープリター間の一致 {#cross-interpreter-agreement}

二つのインタープリターが同じ観測を公開するなら、比較します。

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

こうすると、個別のスナップショットでは見つからないずれを検出できます。API定義、コンパイラーの各段階、代替データ表現で特に有用です。

## 有限の証拠は証明ではない {#finite-evidence-is-not-proof}

テストに合格しても、試した入力と実装で振る舞いが示されたにすぎません。すべての値について法則を証明するものではありません。

意図的に確実性を高めます。

1.  例示テスト
2.  再利用可能なシナリオテスト
3.  生成データを使うプロパティテスト
4.  有限領域の網羅検査
5.  モデル比較
6.  証明の成果物

リスクと主張の強さに応じて水準を選びます。

## テスト名で意味を示す {#test-names-should-state-meaning}

次のような名前を優先します。

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

実装手順を説明するだけの名前は避けます。

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

操作順そのものが仕様である場合、操作上のテストは有効です。その順序に意味が生じる観測を名前で示します。

## レビュー時の確認 {#review-checks}

*   新たな意味論的操作ごとに、焦点を絞った法則またはアサーションがあるか。
*   再利用可能な責務を公開ケイパビリティに対してジェネリックにしているか。
*   シナリオと具体的なランナーを分けているか。
*   意味論的法則と表現不変条件を区別しているか。
*   実用的な範囲で複数のインタープリターを比較しているか。
*   有限テストを証明と呼ばないよう、ドキュメントで注意しているか。
