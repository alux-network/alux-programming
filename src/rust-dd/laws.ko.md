<!-- reader: {"title":"법칙, 시나리오, 증거","sourceHash":"sha256:0e0b9c287cb808a9461b5c166cd42c27ed33514e8f6cafdbb803b8a6d2bdf1a5"} -->

# 법칙, 시나리오, 증거 {#laws-scenarios-and-evidence}

```admonish tip title="관련 항목"
의미론적 관점: [법칙과 해석](../denotational-design/laws-and-interpretations.md)  
Rust에서 의미로 설계하기: [인터프리터와 효과](interpreters.md), [케이퍼빌리티 대수](capability-algebras.md)  
개념: [분기와 합류성](../concepts/branching.md), [참조 투명성](../concepts/referential_transparency.md)
```

```admonish note title="개요"
테스트는 명세를 뒷받침하는 증거입니다. 비공개 실행 단계를 검사하기보다 공개 관찰과 선택한 영역이 뒷받침하는 법칙을 단언하고, 모든 인터프리터에 같은 법칙을 적용할 수 있도록 케이퍼빌리티에 대해 제네릭하게 작성하세요.
```

의미 우선 코드에는 의미 우선 테스트가 필요합니다. 비공개 실행 단계가 아니라 공개 관찰과 법칙을 테스트하세요.

## 명세의 표면을 테스트하기 {#test-the-specification-surface}

````admonish warning title="표현에 결합된 테스트"
이 단언은 기반 집합 하나의 필드에 접근하므로 다른 인터프리터가 재사용할 수 없습니다:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

의미론적 테스트:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

비트 인코딩을 대상으로 하는 직렬화 모듈이라면 첫 번째 테스트가 적절할 수 있습니다. 그러나 대안적 표현이 공유할 수 없으므로 분기 대수의 증거로는 약합니다.

## 재사용 가능한 법칙 확장 {#reusable-law-extensions}

호환되는 모든 인터프리터에 적용되는 속성이라면 한 번만 작성하세요:

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

모든 인터프리터가 같은 검사기를 실행합니다. `anyhow::Result`는 결과를 전달하고, `bail!`는 누락된 관찰을 알리며, `ensure!`는 왕복 법칙을 확인합니다. 검사기는 특정 분기 표현에 의존하지 않고 두 오류를 구분합니다.

## 유용한 법칙 계열 {#useful-law-families}

의미 구조에서 이미 암시되는 속성을 찾아보세요:

*   항등성
*   결합성
*   실제로 의도된 경우의 교환성
*   멱등성
*   왕복 법칙
*   정규화
*   세분화
*   단조성
*   치환
*   해석의 일치

```admonish warning title="영역이 뒷받침하는 법칙만 주장하세요"
익숙하고 수학적으로 들린다는 이유로 흔한 대수 용어를 끼워 넣지 마세요. 선택한 영역이 뒷받침하는 법칙만 명시하세요.
```

## 법칙과 표현 불변량 {#laws-versus-representation-invariants}

다음을 구분하세요:

*   **의미론적 법칙:** 루트 경로에서 분기를 재구성하면 같은 분기를 나타냅니다.
    
*   **표현 불변량:** 사용하지 않는 상위 비트는 0입니다.
    
*   **직렬화 법칙:**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **정규 형식 법칙:**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

모두 중요할 수 있지만 서로 다른 명세에 속합니다.

## 공유 시나리오 {#shared-scenarios}

시나리오는 공개 케이퍼빌리티를 사용해 작성한 재사용 가능한 상호작용입니다. ALUX 테스트 프레임워크도 이러한 방식으로 시나리오를 표현합니다. 작성 코드는 구체적인 실행기를 지정하지 않고 `Scenario`, `DeployerIds`, `PlayAst`, `ScenarioSchedule` 케이퍼빌리티를 통해 값을 구성합니다.

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

호출할 때마다 실행기 장치가 아니라 작성된 의미를 나타냅니다. `under_comprehensive(100)`은 순차 실행 1회, 완전히 동시인 실행 100회, 순서를 섞은 실행 최대 100회에서 예상 로그를 요구합니다. 시나리오가 관찰을 고정하고 실행기는 실행 순서를 바꿉니다.

같은 원칙은 인터프리터 간에도 적용됩니다. 시나리오에서 사용하는 케이퍼빌리티를 여러 실행기가 구현한다면 같은 작성 상호작용을 각각 해석할 수 있습니다. 실행기별 설정과 경계 검사는 시나리오 밖에 둡니다.

## 인터프리터 간 일치 {#cross-interpreter-agreement}

두 인터프리터가 같은 관찰을 제공할 때는 서로 비교하세요:

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

이 방식은 별도로 만든 스냅샷만으로는 찾지 못하는 차이를 포착합니다. API 정의, 컴파일러 단계, 대안 데이터 표현에서 특히 유용합니다.

## 유한한 증거는 증명이 아닙니다 {#finite-evidence-is-not-proof}

테스트 통과는 검사한 입력과 구현의 동작을 보여 줍니다. 모든 값에 대한 법칙을 증명하지는 않습니다.

필요한 보증 수준을 의도적으로 높이세요:

1.  예제 테스트
2.  재사용 가능한 시나리오 테스트
3.  생성 기반 속성 테스트
4.  유한 영역 전수 검사
5.  모델 비교
6.  증명 산출물

위험과 주장의 강도에 따라 수준을 선택하세요.

## 테스트 이름에 의미를 담으세요 {#test-names-should-state-meaning}

다음과 같은 이름을 선호하세요:

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

구현만 설명하는 이름은 피하세요:

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

연산 순서 자체가 명세에 포함될 때는 작동 테스트도 유효합니다. 그 순서를 의미 있게 만드는 관찰에 이름을 붙이세요.

## 검토 항목 {#review-checks}

*   새 의미 연산마다 집중된 법칙이나 단언이 있나요?
*   재사용 가능한 의무를 공개 케이퍼빌리티에 대해 제네릭하게 표현했나요?
*   시나리오를 구체적인 실행기와 분리했나요?
*   의미론적 법칙과 표현 불변량을 구분했나요?
*   실용적인 경우 여러 인터프리터를 비교하나요?
*   문서에서 유한 테스트를 증명이라고 부르지 않나요?
