<!-- reader: {"title":"인터프리터와 효과","sourceHash":"sha256:4ca52b24121e8361c8cc8983e3807794110bade03c63105c1609e60eb9554b93"} -->

# 인터프리터와 효과 {#interpreters-and-effects}

```admonish tip title="관련 항목"
의미론적 관점: [법칙과 해석](../denotational-design/laws-and-interpretations.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](capability-algebras.md), [법칙, 시나리오, 증거](laws.md)  
개념: [자유 모나드](../concepts/free_monad.md)  
통찰: [EVM 대수](../insights/evm-alg.md)
```

```admonish note title="개요"
인터프리터는 케이퍼빌리티의 표현이나 효과를 선택합니다. 위에서 도출한 영역 동작을 다시 정의하지 않고 기본 연산을 실현하므로, 모든 인터프리터에서 같은 법칙이 성립합니다.
```

인터프리터는 구체적인 표현이나 효과로 의미론적 케이퍼빌리티를 실현합니다. 영역 동작을 다시 정의하지 않고 구현 장치를 선택해야 합니다.

## 얇은 인터프리터 {#a-thin-interpreter}

비트 경로 분기 표현은 다음과 같을 수 있습니다:

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

구현은 기본 사실을 저장하고 관찰합니다. `branch_left`, `branch_right`, `branch_is_ancestor`는 공유 확장에 남습니다.

## 인터프리터의 경계는 상대적입니다 {#interpreters-are-boundary-relative}

같은 타입이 한 경계에서는 인터프리터이고 다른 경계에서는 의미 입력일 수 있습니다.

| 경계 | 사용하는 것 | 해석하는 것 |
| --- | --- | --- |
| 파일시스템 어댑터 | 파일시스템 접근 | 소스 조회 |
| 정규화기 환경 | 기본 케이퍼빌리티로서의 소스 조회 | 정규화 언어 구성 |
| 컴파일러 파이프라인 | 정규화된 항 | 실행 가능 구성 |

보편적인 “구현 계층” 하나는 없습니다. 서로 중첩된 의미론적 경계가 있습니다.

## 경계에서 처리하는 효과 {#effects-at-the-edge}

구체 인터프리터는 다음과 같은 선택을 담당합니다:

*   데이터베이스 레이아웃
*   비동기 런타임
*   태스크 소유권
*   재시도 전략
*   HTTP 또는 RPC 프레임워크 타입
*   직렬화
*   락과 채널
*   캐싱

호출자가 관찰해야 하는 구분이 아니라면 이런 선택은 의미론적 트레이트에 넣지 마세요.

예를 들어 의미론적 소스 케이퍼빌리티는 소스 값과 오류를 반환할 수 있습니다. 운영 인터프리터는 파일을 캐시하고 비동기 읽기를 수행할 수 있고, 테스트 인터프리터는 변경 불가능한 맵을 사용할 수 있습니다. 파생된 정규화 로직은 둘 다에서 작동해야 합니다.

## 런타임 소유권 {#runtime-ownership}

프레임워크 콜백에는 소유 가능하고 복제할 수 있으며 스레드 안전한 상태가 필요한 경우가 많습니다. 이는 반드시 도메인 제약일 필요는 없으며 인터프리터 제약입니다.

````admonish warning title="프레임워크 기반 집합은 기본 연산에 넣지 마세요"
기본 연산에 프레임워크 기반 집합이 섞이지 않게 하세요:

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

의미론적 애플리케이션을 사용하세요:

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

웹 인터프리터는 `Arc<Context>`를 선택하고 요청 입력을 추출해 `status`를 호출한 뒤 결과를 변환할 수 있습니다. 도메인 호출자는 웹 서버의 존재를 알 필요가 없습니다.

## 중립적인 인터프리터 {#neutral-interpreters}

모든 인터프리터가 효과를 실행해야 하는 것은 아닙니다.

API 프로그램의 텍스트 인터프리터는 다음을 기록할 수 있습니다:

| 메서드 | 경로 | 입력 | 출력 |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

메타데이터 인터프리터는 문서를 만들 수 있습니다. 테스트 인터프리터는 연산 이름을 모을 수 있고, 운영 인터프리터는 서버 경로를 만들 수 있습니다.

중립적인 인터프리터는 프로그램이 특정 런타임과 독립적으로 의미를 담고 있음을 보여 줍니다.

## 위임으로 인터프리터 합성하기 {#composing-interpreters-by-delegation}

의미가 작은 케이퍼빌리티 트레이트에 있으므로 인터프리터는 보통 직접 *작성하기보다* 조립합니다. 이미 케이퍼빌리티를 제공하는 구성 요소에 위임해 기반 집합이 해당 케이퍼빌리티를 얻으므로 전달 코드가 자동 생성되고 직접 작성할 필요가 없습니다. 대부분의 경우 두 가지 형식이면 충분합니다.

**케이퍼빌리티를 필드로 전달합니다.** ambassador의 `#[derive(Delegate)]`는 전체 트레이트를 내부 값에 전달합니다. 여러 구성 요소를 보유한 기반 타입은 전달 메서드를 직접 쓰지 않고 각 케이퍼빌리티를 담당 필드에 위임합니다:

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

**게터를 통해 케이퍼빌리티를 부여합니다.** 타입에 게터 하나를 제공하면 포괄 구현이 그 게터를 가진 모든 타입에 전체 케이퍼빌리티를 제공합니다:

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

그 결과 많은 구조체를 만들 필요가 없어집니다. 연관 타입 여러 개와 메서드 십여 개가 있는 큰 트레이트 하나 및 이를 구현하는 구체 타입 하나로 이루어진 단일 컨텍스트 객체 대신, 작은 케이퍼빌리티 트레이트 몇 개와 각각을 제공하는 필드나 게터에 위임하는 얇은 기반 타입만 있으면 됩니다. 기한이 지났는지 확인하는 파생 연산은 각 기반 타입에서 다시 구현하지 않고 기본 연산을 확장해 한 번만 작성합니다.

```admonish warning title="위임은 의미가 아니라 연산을 전달합니다"
자동 생성된 위임은 상용구를 없애지만 의미론적 대체 가능성을 보장하지 않습니다. ambassador의 `derive` 매크로 `#[derive(Delegate)]`는 구현이 컴파일됨을 확인할 뿐, 기반 타입이 같은 인터프리터를 나타내는지는 증명하지 않습니다. `Shared<T>(Arc<T>)`가 `T`을 대신하려면 기반 타입에서 법칙을 확인하세요. 공유 방식이나 정체성을 바꾸는 래퍼(`Arc`, 풀링, 캐싱)는 모든 메서드를 올바르게 전달하면서도 최신성 또는 유일성 법칙을 위반할 수 있습니다. 기반 타입이 관련 없는 서비스 중 `T`만 보유한다면 위임보다 투영이 더 정확합니다.
```

## 오류는 경계에 속합니다 {#errors-belong-to-a-boundary}

오류는 이를 처리하는 경계의 실패 의미를 전달해야 합니다.

| 오류 | 경계 간 변환 |
| --- | --- |
| 도메인 오류 | 전송 인터프리터가 이를 프로토콜 응답으로 변환합니다 |
| 파싱 오류 | 컴파일러 프런트엔드가 이를 진단 정보로 변환합니다 |
| 저장소 오류 | 소스 인터프리터가 이를 의미론적 소스 실패로 변환합니다 |

HTTP 상태 코드, RPC 오류 객체, 데이터베이스 오류를 기본 도메인 트레이트에 억지로 넣지 마세요. 인터프리터 경계에서 변환하세요.

## 관찰되기 전까지 성능은 해석의 문제입니다 {#performance-is-an-interpretation-concern-until-observed}

일괄 처리, 병렬성, 캐싱, 데이터 배치는 대개 인터프리터에 속합니다. 명세가 관찰 가능한 순서, 시간, 자원 사용, 공정성, 실패 동작을 보장할 때에만 의미론적 요소가 됩니다.

이 구분을 통해 의미가 변하지 않게 최적화할 수 있습니다:

*   같은 법칙
*   같은 선언된 관찰
*   다른 작동 전략

## 검토 항목 {#review-checks}

*   인터프리터가 파생을 중복하지 않고 기본 연산을 구현하나요?
*   런타임 및 프레임워크 제약이 사용하는 경계에만 머무르나요?
*   중립 인터프리터나 테스트 인터프리터도 같은 케이퍼빌리티를 구현할 수 있나요?
*   전송 및 저장소 오류를 경계에서 변환하나요?
*   위임이 의미론적으로 정확한가요?
*   명시된 표시에 따라 성능 차이를 관찰할 수 없나요?
