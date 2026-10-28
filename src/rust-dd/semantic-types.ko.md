<!-- reader: {"title":"Rust의 의미 타입","sourceHash":"sha256:f260bada57ff228ad424bf6ea7f98dc225853e8a47e5611be37891f06f97e8af"} -->

# Rust의 의미 타입 {#semantic-types-in-rust}

```admonish tip title="관련 항목"
의미론적 관점: [종속 타입과 증명](../denotational-design/dependent-types.md), [표시적 설계](../denotational-design/design.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](capability-algebras.md), [일차 프로그램](first-order-programs.md), [법칙, 시나리오, 증거](laws.md)  
개념: [참조 투명성](../concepts/referential_transparency.md)
```

```admonish note title="개요"
의미 우선 Rust는 타입으로 의미 구조를 명확히 드러냅니다. 연관 타입은 기반 집합 계열에 이름을 붙이고, 바운드는 그 사이의 관계를 명시하며, 확장은 명시된 전제에서 새 연산을 도출합니다. 모든 해석이 보존해야 하는 것은 여전히 법칙으로 정합니다.
```

Rust에서는 여러 역할이 모두 `type`로 표기됩니다. 이를 구분하면 의미가 표현으로 뭉개지는 일을 막을 수 있습니다.

| 역할 | 예 | 설명하는 내용 |
| --- | --- | --- |
| 의미 타입 | `Direction` | 어떤 영역의 구분이 중요한지 |
| 인터프리터가 선택하는 기반 집합 | `BranchAlg::Branch` | 인터프리터가 선택하는 표현 |
| 파생 연산 | `BranchExt::branch_child` | 선언된 케이퍼빌리티에서 무엇이 따라오는지 |
| 단계 타입 | `Syntax`, `CoreProgram`, `Executable` | 값이 어떤 변환을 거쳤는지 |
| 표현 타입 | `BitBranch` | 인터프리터 하나가 분기의 의미를 저장하는 방식 |
| 증거 프로그램 | 시나리오 또는 재사용 가능한 법칙 확장 | 호환 인터프리터가 만족해야 하는 관찰 |

## 표현보다 의미 타입을 먼저 {#semantic-types-before-representation}

분기 영역이 두 방향을 구분한다고 가정해 봅시다:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction`은 그 구분을 직접 나타냅니다. 한 인터프리터는 경로를 간결하게 인코딩할 수 있습니다:

```rust,noplayground
struct BitBranch(Vec<bool>);
```

불리언은 그 표현에 속합니다. 왼쪽과 오른쪽의 정의가 아니며, 다른 인터프리터는 불리언을 사용하지 않아도 됩니다.

```admonish warning title="간결한 인코딩은 의미 타입이 아닙니다"
비트 위치, 바이트 오프셋, 기계 분기로 영역의 동작을 정의하지 마세요. 그런 산출물은 의미론적 구분을 인코딩해야 하지만, 그 구분의 주인이 되지는 않습니다.
```

이 분리 덕분에 저장 및 실행 배치를 바꾸더라도 영역의 의미가 소리 없이 바뀌지 않습니다.

## 연관 타입으로 기반 집합 선택하기 {#associated-types-choose-carriers}

케이퍼빌리티 대수는 기반 집합 선택을 인터프리터마다 다르게 둘 수 있습니다:

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

`Self::Branch`은 숨겨진 필드 타입이 아닙니다. 분기 의미를 해석하면서 선택한 기반 집합입니다. 비트 경로, 수치 트리 위치, 기호 항 등 어떤 표현도 같은 대수를 만족할 수 있습니다.

인터프리터 `T`에 대해 표기 `T::Branch`을 기반 집합 계열 $\mathsf{Branch}(T)$로 읽을 수 있습니다. 인터프리터가 바뀌면 기반 집합은 달라질 수 있지만, 모든 연산은 같은 선택을 일관되게 따릅니다.

## 확장으로 결과를 도출하기 {#extensions-derive-consequences}

확장은 필요한 전제만으로 새 연산을 구성할 수 있습니다:

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

`where` 절은 전제입니다. `This`가 분기 대수를 해석합니다. 메서드는 그 결과입니다. 해당 인터프리터의 기반 집합에서는 분기와 방향으로 자식 분기가 정해집니다.

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

도출 과정에서 구체적인 분기 표현을 선택하지 않습니다. 결과는 인터프리터가 선택한 기반 집합 계열에 그대로 남습니다.

## 동등성 바운드로 호환성을 명시하기 {#equality-bounds-state-compatibility}

두 케이퍼빌리티가 같은 기반 집합을 사용해야 할 때가 있습니다. 연관 타입 동등성으로 구체 표현을 고르지 않고 그 요구를 명시할 수 있습니다:

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

이 바운드는 국소 명제처럼 읽으면 됩니다. `Left`과 `Right`은 같은 기반 집합에서 분기 연산을 해석합니다. 이 동등성은 두 대수 전체에 강제하지 말고, 일치가 필요한 연산에 두세요.

이런 바운드는 두 구현을 우연히 담고 있다는 이유만으로 구체적인 컨텍스트를 받는 것보다 더 강하고 정확합니다.

## 단계 타입으로 컴파일러 계약 드러내기 {#stage-types-make-compiler-contracts-visible}

컴파일러 파이프라인이 모든 단계를 구분 없는 트리 하나로 처리해서는 안 됩니다. 서로 다른 단계 타입은 어떤 변환이 이루어졌는지 명시합니다:

| 단계 | 입력 | 출력 | 계약 |
| --- | --- | --- | --- |
| 파싱 | 소스 텍스트 | `Syntax` | 표면 문법을 인식합니다 |
| 정규화 | `Syntax` | `CoreProgram` | 선택한 핵심 의미를 생성합니다 |
| 코드 생성 | `CoreProgram` | `Executable` | 실행 가능한 형식에서도 프로그램 관찰을 보존합니다 |
| 런타임 | `Executable` | 관찰 가능한 동작 | 언어 모델에 맞게 실행 코드를 일관되게 해석합니다 |

이 타입들은 단계 혼동을 막지만, 타입 이름만으로 보존을 증명하지는 못합니다. 변환에는 여전히 명시적인 법칙, 대표 시나리오, 인터프리터 간 증거가 필요합니다.

## 계약 읽기 {#read-the-contract}

타입 수준 구조는 다음과 같은 논리적 해석을 허용합니다:

| Rust 표현 | 해석 |
| --- | --- |
| `This: BranchAlg` | `This`가 분기 의미의 해석을 제공합니다 |
| `This::Branch` | 분기 기반 집합은 `This`가 선택합니다 |
| `Right: BranchAlg<Branch = Left::Branch>` | 두 해석이 기반 집합에서 일치합니다 |
| `-> This::Branch` | 결과는 선택된 기반 집합 계열에 남습니다 |

이런 식으로 읽으면 타입을 결정하는 요소, 합성에 필요한 동등성, 전제에서 따라오는 결론을 API에 드러낼 수 있습니다. 기초 구분이 실제로 존재한다면 연관 타입, 제네릭 연관 타입, const 제네릭, 타입 상태, 크기가 0인 증거 타입으로 계약의 일부를 표현할 수 있습니다.

구현을 더 형식적으로 보이게 하려고 타입 수준 장치를 만들어 내지 마세요. 타입은 표현을 장식하는 대신 의미나 필요한 관계를 드러내야 합니다.

## 타입이 법칙을 대체하지 않습니다 {#types-do-not-replace-laws}

타입 시그니처는 어떤 프로그램을 만들 수 있는지 제약합니다. 법칙은 그 연산들이 어떤 관계인지 제약합니다. 둘 다 필요합니다.

예를 들어 `BranchAlg::Branch`은 각 인터프리터가 분기 기반 집합을 선택한다고 말합니다. 그것만으로 다음이 보장되지는 않습니다:

*   분기에서 자기 자신으로 가는 경로는 비어 있습니다
*   루트 경로를 다시 적용하면 해당 분기가 재구성됩니다
*   서로 반대 방향의 자식은 서로 다릅니다

이는 호환 인터프리터가 공유하는 의미론적 법칙입니다. 사용하지 않는 비트가 0이라는 주장과 같은 표현별 주장은 해당 표현을 선택한 인터프리터에 속합니다.

```admonish quote title="타입을 주장으로 읽기"
각 타입이 무엇을 주장하는지, 무엇이 그 타입을 결정하는지, 어떤 법칙으로 완성되는지, 어떤 인터프리터가 실현하는지 물으세요.
```

## 검토 항목 {#review-checks}

*   영역의 구분을 간결한 기계 인코딩보다 먼저 정의했나요?
*   연관 타입이 위장된 구체 상태가 아니라 인터프리터가 선택하는 기반 집합인가요?
*   동등성 바운드가 사용 지점에 필요한 호환성만 명시하나요?
*   컴파일러의 각 단계에 별도 타입과 명시적 계약이 있나요?
*   의미론적 명제와 표현 불변량을 구분했나요?
*   Rust로 표현할 수 없는 주장을 재사용 가능한 법칙이나 시나리오로 뒷받침하나요?
