<!-- reader: {"title":"파생 의미와 합성"} -->

# 파생 의미와 합성 {#derived-meaning-and-composition}

```admonish tip title="관련 항목"
의미론적 관점: [표시적 설계](../denotational-design/design.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](capability-algebras.md), [인터프리터와 효과](interpreters.md)  
개념: [표현식 문제](../concepts/expression-problem.md)
```

```admonish note title="개요"
파생 동작은 사용하는 케이퍼빌리티에 속합니다. 그 경계를 구현한 특정 타입에 넣지 말고, 필요한 바운드에 대한 확장으로 한 번 작성해 모든 인터프리터가 공유하게 하세요. `where` 절은 도출이 의존하는 것을 정직하게 명시합니다.
```

기본 케이퍼빌리티는 어휘를 제공합니다. 애플리케이션 동작 대부분은 그 어휘에서 파생해 한 번 작성하고 모든 인터프리터가 공유해야 합니다.

## 확장이 도출을 소유합니다 {#extensions-own-derivations}

[`extend`](https://docs.rs/extend/latest/extend/) 크레이트를 사용하면 표현과 독립적으로 분기 연산을 도출할 수 있습니다:

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

`where` 절은 의미론적 의존성을 완전히 선언합니다. `BranchAlg`뿐이며 그 이상은 필요 없습니다. 구체적인 분기 타입은 이 정의를 소유하지 않습니다.

매크로는 트레이트 및 구현의 상용구만 줄입니다. 일반 확장 트레이트로도 같은 설계를 표현할 수 있습니다. 표시적 설계의 핵심은 어트리뷰트가 아니라 의미론적 경계와 도출에 있습니다.

## 왜 구조체에 넣지 않을까요? {#why-not-put-it-on-the-struct}

````admonish warning title="파생 의미를 구조체에 묶지 마세요"
이것은 표현 우선 설계입니다. 수치형 분기 기반 집합을 추가하면 도출을 복사하거나 다시 구현해야 하고, 첫 구체 타입이 의도치 않게 명세가 됩니다.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

확장은 소유 관계를 뒤집습니다:

| 계층 | 책임 |
| --- | --- |
| 의미론적 케이퍼빌리티 | 파생 의미를 소유합니다 |
| 구체 타입 | 기본 의미를 해석합니다 |

## 바운드로 합성하기 {#compose-with-bounds}

하나의 수신자가 여러 케이퍼빌리티를 해석하면 직접 바운드를 사용하세요:

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

````admonish warning title="케이퍼빌리티를 한데 묶지 마세요"
바운드를 짧게 쓰려고 상위 트레이트를 만들지 마세요:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

이 묶음은 어떤 연산이 어떤 케이퍼빌리티를 사용하는지 감추고, 모든 인터프리터가 만족해야 할 인터페이스를 하나 더 만듭니다.
````

## 서로 다른 다섯 가지 합성 의미 {#five-different-composition-meanings}

관계를 정확히 설명하는 형태를 선택하세요.

| 상황 | Rust 표현 |
| --- | --- |
| 하나의 수신자가 여러 케이퍼빌리티를 해석함 | 직접 바운드 |
| 별도 값이 동작을 선택함 | 명시적 정책 매개변수 |
| 독립 정책을 정적으로 합성함 | 곱 또는 일반 구조체 |
| 환경이 다른 인터프리터를 담음 | 작은 `HasX` 투영 |
| 래퍼가 내부 인터프리터를 대체함 | 위임 |

### 명시적 정책 {#explicit-policy}

전략을 독립적으로 선택한다면 확장에 명시적으로 전달하세요:

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

확장은 공유되는 도출을 소유하고 정책은 독립적으로 선택되는 입력으로 남습니다. 환경 안에 숨기거나 `Default`로 선택하지 않습니다.

### 정책의 곱 {#product-of-policies}

상속을 만들어 내지 않고 독립 정책을 합성할 수 있습니다:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### 투영 {#projection}

`HasClock` 트레이트는 환경이 별도의 시계 값을 투영할 수 있다는 것만 말합니다:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

시간을 읽는 연산은 자체 `where` 절에 `This::Clock: ClockAlg`을 추가합니다. 투영은 포함 관계에 관한 것이고, 값을 사용하는 연산은 필요한 케이퍼빌리티를 명시합니다. 실제로 분리가 있을 때만 이 패턴을 사용하세요. 필드 정리용으로 `HasX`를 만들지 마세요.

### 위임 {#delegation}

위임은 래퍼 자체가 내부 인터프리터를 대체할 수 있음을 뜻합니다. 투명한 뉴타입, 공유 포인터, 전체 케이퍼빌리티 계약을 보존하는 어댑터에 적합합니다.

투영은 “가지고 있다”는 뜻이고, 위임은 “그 자체다”라는 뜻입니다. 서로 바꿔 쓸 수 없습니다.

## 기본값도 의미론적 결정입니다 {#defaults-are-semantic-decisions-too}

기계적인 빈 상태에는 `Default`를 구현할 수 있습니다. 도메인 정책은 대개 명시적이어야 합니다.

유용한 경우에는 흔히 대수적 설명이 있습니다. 기본값이 타입의 자연스러운 합성에서 항등 원소인 것입니다. 빈 버퍼를 덧붙이거나 빈 맵을 결합하거나 진단 수 0을 누적해도 아무것도 더해지지 않습니다. 그 합성이 결합적이면 타입과 연산은 모노이드를 이루며, `Default`는 정책을 선택하는 대신 그 중립 원소를 나타낼 수 있습니다.

좋은 기본값:

*   빈 버퍼
*   빈 맵
*   누적된 진단 수 0

의심스러운 기본값:

*   정족수 기준
*   리더 정책
*   재시도 의미
*   확인 깊이
*   출력 형식

핵심 구분은 다음과 같습니다. 중립 원소는 결정을 추가하지 않지만, 정족수, 리더 전략, 재시도 규칙은 도메인의 동작을 선택합니다. 기본값을 바꾸면 도메인의 의미가 바뀌는 경우 정책을 명시적으로 합성하세요.

## 파생 의미는 닫힌 상태를 유지해야 합니다 {#derived-meaning-should-stay-closed}

확장은 선언된 케이퍼빌리티와 명시적 입력만 사용해야 합니다. 필드 직접 접근, 전역 상태, 구체 타입으로의 다운캐스팅은 `where` 절을 부정확하게 만듭니다.

의존성 선언을 증명하듯 메서드 본문을 검토하세요:

```admonish question title="각 도출을 검사하세요"
이 본문에 있는 모든 연산을 이 바운드만으로 정당화할 수 있나요?
```

그렇지 않다면 바운드가 불완전하거나 코드가 다른 계층에 속하는 것입니다.

## 검토 항목 {#review-checks}

*   파생 동작을 케이퍼빌리티에 대해 한 번 정의했나요?
*   확장에서 구체 필드와 컨텍스트 타입을 피하나요?
*   인터프리터 하나를 위해 직접 바운드를 사용하나요?
*   독립 선택 정책은 명시적 값인가요?
*   투영과 위임이 각각 정확한 주장을 하나요?
*   도메인 기본값이 합성 과정에서 드러나나요?
