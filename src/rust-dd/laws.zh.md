<!-- reader: {"title":"定律、场景与证据","sourceHash":"sha256:0e0b9c287cb808a9461b5c166cd42c27ed33514e8f6cafdbb803b8a6d2bdf1a5"} -->

# 定律、场景与证据 {#laws-scenarios-and-evidence}

```admonish tip title="相关内容"
语义视角：[定律与解释](../denotational-design/laws-and-interpretations.md)  
Rust 中的语义驱动设计：[解释器与效应](interpreters.md)、[能力代数](capability-algebras.md)  
概念：[分支与合流](../concepts/branching.md)、[引用透明性](../concepts/referential_transparency.md)
```

```admonish note title="导读"
测试为规范提供证据。应针对公开可观察的结果以及所选语义域支持的定律编写断言，而不是针对私有执行步骤；并将这些定律写成针对该能力的泛型形式，使每个解释器都接受同样的检验。
```

语义优先的代码需要语义优先的测试。测试公开可观察的结果与定律，而非私有执行步骤。

## 测试规范接口 {#test-the-specification-surface}

````admonish warning title="与表示耦合的测试"
这个断言深入访问某个载体的字段，因此其他解释器无法复用：

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

语义测试：

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

如果测试对象是位编码的序列化模块，第一个测试可能合适。但对于分支代数，它提供的证据较弱，因为替代表示无法复用它。

## 可复用的定律扩展 {#reusable-law-extensions}

如果某项性质适用于所有兼容解释器，就把它写一次：

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

每个解释器都运行同一个检查器。`anyhow::Result`承载结果；`bail!`报告缺失的观察，而`ensure!`检查往返定律。该检查器无需依赖某一种分支表示，就能区分这两种失败。

## 有用的定律类别 {#useful-law-families}

寻找语义结构已经暗示的性质：

*   单位元
*   结合性
*   确实有意要求时的交换性
*   幂等性
*   往返
*   规范化
*   细化
*   单调性
*   替换
*   解释一致性

```admonish warning title="只主张该领域支持的定律"
不要仅仅因为熟悉或听起来很数学，就添加代数术语。只陈述所选领域支持的定律。
```

## 定律与表示不变量 {#laws-versus-representation-invariants}

请将以下内容区分开：

*   <strong>语义定律：</strong>根据根路径重构一个分支时，所指称的仍是同一个分支。
    
*   <strong>表示不变量：</strong>未使用的高位为零。
    
*   **序列化定律：**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **规范格式定律：**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

这些都可能很重要，但各自属于不同的规范。

## 共享场景 {#shared-scenarios}

场景是针对公共能力编写的可复用交互。ALUX 测试框架以这种方式表示场景：编写场景的代码通过`Scenario`、`DeployerIds`、`PlayAst`和`ScenarioSchedule`能力构造一个值，无需点名具体运行器。

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

每次调用都描述作者定义的含义，而不是运行器机制。`under_comprehensive(100)`要求在一次顺序运行、100 次完全并发运行以及最多 100 次乱序运行中都得到预期日志。场景固定所观察的内容，运行器则改变执行顺序。

同一原则也适用于不同解释器：如果多个运行器都实现了场景所用的能力，它们就都可以解释同一个编写好的交互。运行器特有的设置与边界检查应留在场景之外。

## 跨解释器一致性 {#cross-interpreter-agreement}

当两个解释器提供相同观察时，可以比较它们：

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

这可以捕捉独立快照遗漏的漂移。对于 API 定义、编译器阶段与替代数据表示，这尤其有价值。

## 有限证据并非证明 {#finite-evidence-is-not-proof}

测试通过，只能证明在受测输入与实现下观察到了相应行为，不能证明某条定律对所有值都成立。

有计划地提升保证强度：

1.  示例测试
2.  可复用场景测试
3.  生成式性质测试
4.  对有限域进行穷举检查
5.  模型比较
6.  证明产物

根据风险与主张强度选择层级。

## 让测试名称表达含义 {#test-names-should-state-meaning}

优先使用：

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

避免只叙述实现过程的名称：

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

如果操作顺序本身有规范规定，操作测试仍然有效。此时应在名称中指出让该顺序具有意义的观察。

## 审查要点 {#review-checks}

*   每个新增的语义操作是否都有针对性的定律或断言？
*   可复用义务是否针对公共能力以泛型方式表达？
*   场景是否与具体运行器分离？
*   是否区分了语义定律与表示不变量？
*   在可行时是否比较了多个解释器？
*   文档是否避免把有限测试称作证明？
