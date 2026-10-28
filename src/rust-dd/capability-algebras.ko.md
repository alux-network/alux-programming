<!-- reader: {"title":"케이퍼빌리티 대수","sourceHash":"sha256:707e5f96df94e673ccee892af8ce5f089dc44abc2d5361d5888348db72d22664"} -->

# 케이퍼빌리티 대수 {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="관련 항목"
의미론적 관점: [표시적 설계](../denotational-design/design.md), [표시와 합성성](../denotational-design/denotations.md)  
Rust에서 의미로 설계하기: [Rust의 의미 타입](semantic-types.md), [파생 의미와 합성](derived-meaning.md)  
개념: [표현식 문제](../concepts/expression-problem.md), [분기와 합류성](../concepts/branching.md)
```

```admonish note title="개요"
케이퍼빌리티 트레이트는 작은 대수입니다. 의미가 필요로 하는 기본 관찰과 변환을 이름으로 나타내고, 표현 선택은 인터프리터에 맡깁니다. 첫 구현에 우연히 들어 있는 필드가 아니라 의미에서 어휘를 설계하세요.
```

Rust에는 “표시적 설계”라는 내장 구문이 없습니다. 일반적인 언어 기능으로 의미 어휘를 인코딩하며, 작은 케이퍼빌리티 트레이트는 그 유용한 인코딩 방법 중 하나입니다.

이 책에서 접미사 `Alg`는 **대수**를 뜻합니다. 인터프리터가 선택한 기반 집합에서 일관성을 이루는 기본 연산의 집합입니다.

## 의미에서 시작하기 {#start-from-meaning}

앞부분에서 다룬 분기 위치의 의미는 다음과 같이 표현할 수 있습니다:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Left,
    Right,
}

pub trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>>;
}
```

트레이트는 세 가지 기본 의미를 명시합니다:

*   루트 구성
*   한 방향으로 분기 확장
*   가능할 때 상대 경로 관찰

분기를 어디에 저장하는지, 경로를 어떻게 인코딩하는지는 드러내지 않습니다.

## 케이퍼빌리티는 필드 투영이 아닙니다 {#capabilities-are-not-field-projections}

````admonish warning title="필드 투영은 의미론적 케이퍼빌리티가 아닙니다"
비교해 보세요:

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

이 트레이트는 구조체를 메서드 뒤에 감추지만 여전히 표현을 노출합니다. 파생 로직은 벡터, 불리언, 소유권, 변경 전략과 결합됩니다.
````

의미론적 케이퍼빌리티는 후속 의미에 필요한 관찰이나 변환을 노출합니다. 다음을 물어보세요:

```admonish question title="모든 케이퍼빌리티에 물어볼 것"
구현이 데이터베이스, 기호 항, 압축 정수, 원격 서비스를 사용하더라도 이 연산이 여전히 타당한가요?
```

그렇다면 해당 연산은 케이퍼빌리티에 들어갈 수 있습니다. 호출자가 현재 필드 배치를 알아야 한다면 아마 적절하지 않습니다.

## 트레이트마다 기본 의미 하나 {#one-primitive-meaning-per-trait}

작은 트레이트는 의존 관계를 드러냅니다:

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

시간과 기한이 필요한 파생 연산은 두 트레이트를 모두 요구할 수 있습니다. 로깅, 저장, 네트워크, 설정, 스케줄링을 담은 `ApplicationContext`까지 필요하지는 않습니다.

“작다”는 것을 기계적으로 메서드 하나로 제한하라는 뜻은 아닙니다. 분리할 수 없는 의미 구조를 이루는 연산은 묶으세요. 서로 독립된 의미를 표현하거나 별도 인터프리터를 허용한다면 나누세요.

## 연관 타입으로 기반 집합 선택하기 {#associated-types-select-carriers}

표현을 인터프리터가 선택할 때는 연관 타입을 사용하세요:

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

이 경계에서 안정된 의미 어휘가 아니라면 `String`, `std::io::Error` 또는 구체적인 구문 트리를 요구하지 마세요.

반대로 구체적인 의미 값은 사용할 수 있습니다:

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

모든 타입을 추상화하라는 뜻이 아닙니다. 인터프리터의 구현 장치와 의미 어휘를 혼동하지 말라는 뜻입니다.

## 바운드는 실제 사용하는 곳에 두세요 {#put-bounds-where-they-are-used}

필요하지 않은 제약으로 기본 연산을 제한하지 마세요:

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="선제적으로 바운드를 추가하지 마세요"
미래의 어떤 알고리즘이 연관 타입을 필요로 할 수 있다는 이유만으로 타입을 제약하지 마세요:

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

후보를 정렬하는 연산은 `Ord`을 요구할 수 있고, 후보를 해시 집합에 넣는 연산은 `Hash`을 요구할 수 있습니다.
````

사용 지점에 둔 바운드는 기본 의미를 재사용할 수 있게 하고 파생 동작의 실제 계약을 드러냅니다.

## 효과도 기본 의미가 될 수 있습니다 {#effects-can-be-primitive-meaning}

케이퍼빌리티 트레이트가 순수 실행을 뜻하지는 않습니다:

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

게시에는 효과가 있습니다. 그래도 현재 경계에서는 기본 의미 연산일 수 있습니다. 구체적인 인터프리터는 HTTP, 큐, 파일, 테스트 버퍼를 사용할 수 있습니다.

의미 계층은 재시도, 소켓 소유권, 태스크 생성, 연결 풀을 의도한 의미에 포함되는 구분이 아닌 한 규정하지 않아야 합니다.

## 경계에 이름 붙이기 {#naming-the-boundary}

케이퍼빌리티는 사용하는 쪽의 의미론적 관점에서 표현해야 합니다:

| 의미 중심 | 표현 중심 |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

이름 붙이기도 설계입니다. 기계적인 이름은 기계적 결합을 부추깁니다.

## 검토 항목 {#review-checks}

*   트레이트가 일관된 기본 의미 하나를 노출하나요?
*   독립적인 인터프리터가 첫 표현을 복사하지 않고 구현할 수 있나요?
*   인터프리터가 실제로 선택하는 경우에만 연관 타입을 추상화했나요?
*   구체 타입이 안정적인 의미 어휘인가요?
*   연산에서 필요로 하기 전까지 바운드를 두지 않았나요?
*   트레이트가 관리자, 컨텍스트, 원시 저장소를 반환하지 않나요?
