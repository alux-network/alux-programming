<!-- reader: {"title":"일차 프로그램"} -->

# 일차 프로그램 {#first-order-programs}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [파생 의미와 합성](derived-meaning.md), [언어와 컴파일러 파이프라인](compiler-pipelines.md)  
개념: [연속 전달 스타일](../concepts/cps.md), [디펑셔널라이제이션](../concepts/defunctionalization.md), [자유 모나드](../concepts/free_monad.md)  
통찰: [표현식 문제 다시 보기](../insights/expression-problem.md)
```

```admonish note title="함수 적용을 재구화할 때"
일반 함수와 확장으로 이미 파생 동작을 표현할 수 있습니다. 다른 인터프리터가 실행 전에 프로그램을 살펴보거나 합성하거나 직렬화하거나 컴파일해야 할 때만 함수 적용을 일차 데이터로 바꾸세요.
```

일반 함수와 확장 메서드는 대개 파생 동작을 표현하는 가장 좋은 방법입니다. 그러나 실행 전에 다른 인터프리터가 프로그램 구조를 살펴보거나, 결합하거나, 문서화하거나, 직렬화하거나, 컴파일해야 할 때도 있습니다. 그러면 함수 적용 자체를 일차 데이터로 만들어야 합니다.

## 실행은 구조를 지웁니다 {#execution-erases-structure}

다음을 생각해 보세요:

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

이 메서드를 호출하면 상태가 반환됩니다. 호출이 시작되고 나면 외부 인터프리터는 일반적으로 다음 정보를 복구할 수 없습니다:

*   의미론적 컨텍스트 타입
*   순서가 있는 인수
*   소스의 인수 이름
*   결과 타입
*   연산의 정체성

이 정보는 소스 수준 함수 타입에는 있었지만 일반적인 실행 과정에서 소비됩니다.

## 함수 적용의 디펑셔널라이즈 {#defunctionalizing-application}

디펑셔널라이제이션은 알려진 함수 계열의 원소를 일차 태그와 공유 함수 적용 연산으로 대체합니다.

최소 연산 어휘는 다음과 같습니다:

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

크기가 0인 `CurrentStatusOperation<App>`은 원래 확장 메서드의 함수 적용을 나타낼 수 있습니다. 메서드 본문을 한 번 더 복사하지 말고 그 메서드를 호출해야 합니다.

1.  확장 메서드에서 시작합니다.
2.  이를 연산 타입으로 재구화합니다.
3.  컨텍스트, 인수 곱, 인수 이름, 출력을 보존합니다.
4.  `ApplyAlg`를 통해 해석합니다.

일반 호출에는 여전히 메서드가 편리합니다. 일차 구조가 필요한 컨텍스트에서는 연산 값을 사용합니다.

## 사용처 없이 재구화하지 마세요 {#do-not-reify-without-a-consumer}

일차 프로그램은 타입 수준 장치를 추가합니다. 실제로 두 번째 해석을 가능하게 할 때 사용하세요:

*   런타임 등록
*   문서 또는 스키마 생성
*   정적 검사
*   실행 전 프로그램 합성
*   직렬화
*   컴파일

코드가 함수 호출만 필요하다면 함수로 두세요.

## 이식 가능한 인터페이스 프로그램 {#portable-interface-programs}

HTTP 표면에 다음 요소가 있다고 가정해 봅시다:

| 메서드 | 경로 | 입력 | 연산 | 출력 |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | 본문: `f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | 스트리밍 파일 |

이식 가능한 프로그램은 다음을 보존해야 합니다:

*   메서드 및 경로 선택자
*   경로, 쿼리, 본문, 헤더, 인증 등의 입력 역할
*   연산 값
*   JSON 또는 파일 등의 출력 역할
*   경로의 병합과 중첩

특정 프레임워크의 요청, 라우터, 응답 타입을 보존해서는 안 됩니다.

다음과 같은 유창한 표기법을 사용할 수 있습니다:

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

유창한 호출은 타입이 지정된 프로그램을 구성합니다. 즉시 서버 경로를 등록할 필요는 없습니다.

## 프로그램 하나, 여러 폴드 {#one-program-several-folds}

같은 일차 프로그램을 여러 방식으로 해석할 수 있습니다:

| 프로그램 | 해석 |
| --- | --- |
| 타입이 지정된 HTTP 프로그램 | 텍스트 문서, 실행 가능한 경로, OpenAPI 메타데이터, 클라이언트 바인딩, 적합성 테스트 |
| 타입이 지정된 JSON-RPC 프로그램 | 메서드 레지스트리, 스키마, 클라이언트, 테스트 하네스 |

실행용 경로 목록과 문서용 메서드 목록을 따로 관리하지 마세요. 서로 경쟁하는 명세가 만들어집니다.

## 입력 및 출력 역할 {#input-and-output-roles}

연산은 이미 인수와 결과 타입을 알고 있습니다. 전송 선언은 전송 의미만 추가해야 합니다.

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`, `query`, `json`는 역할을 나타냅니다. `ApplyAlg`에서 이미 정해지는 출력 타입을 작성자에게 다시 명시하도록 요구해서는 안 됩니다.

출력 변환은 전송 인터프리터의 책임입니다. 서버는 한 결과를 JSON으로, 다른 결과를 스트리밍 첨부 파일로 바꿀 수 있습니다. 의미론적 연산은 두 표현을 모두 알지 못합니다.

## 합성은 프로그램의 의미입니다 {#composition-is-program-meaning}

프로그램은 일반적인 합성을 보존해야 합니다:

*   빈 프로그램
*   프로그램 병합
*   접두 경로 아래에 프로그램 중첩
*   엔드포인트를 프로그램으로 올리기

이들은 특정 프레임워크의 라우터 메서드보다 근본적입니다. `get`, `post`, `merge`, `nest` 같은 익숙한 유창한 이름은 중립 대수의 별칭이 될 수 있습니다.

독립적인 명세는 작은 프로그램을 제공할 수 있습니다:

| 입력 프로그램 | 합성 | 결과 |
| --- | --- | --- |
| 상태 및 다운로드 프로그램 | 병합 | 서비스 프로그램 |
| 카탈로그 프로그램 | 중첩 | 서비스 프로그램 |

애플리케이션이 결과 합성을 선택해 해석합니다.

## 매크로는 공개 의미로 낮춰야 합니다 {#macros-must-lower-to-public-meaning}

Rust 매크로를 사용하면 일차 선언을 편리하게 작성할 수 있습니다:

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

매크로가 공개적으로 수동 구성 가능한 일차 프로그램으로 낮춰질 때에만 바람직합니다. 생성된 콜백이 인터페이스의 유일한 정의가 되어서는 안 됩니다.

바람직한 방향:

1.  편리한 구문
2.  공개 연산 및 프로그램 값
3.  제네릭 폴드
4.  구체 프레임워크

표현 우선 방향:

1.  프레임워크 어노테이션
2.  불투명한 자동 생성 콜백
3.  역공학한 문서

## 기존 개념과의 관계 {#relation-to-existing-concepts}

일차 인터페이스 프로그램은 다른 장의 기법을 기반으로 합니다. 디펑셔널라이제이션은 일반적인 변환이고, 확장 가능한 구문과 해석은 표현식 문제이며, 자유 모나드는 시퀀싱이 있는 구문의 특정 표현입니다. 페이지 위쪽의 관련 링크에서 각각을 볼 수 있습니다.

이 기법들을 표시적 설계 자체와 동일시하지 마세요. 표시적 설계는 어떤 구조가 중요한지 정하고, 일반 호출이 구조를 지우는 경우 일차 표현이 그 구조를 보존합니다.

## 검토 항목 {#review-checks}

*   실제 두 번째 인터프리터를 위해 재구화가 필요한가요?
*   연산이 작성된 메서드를 중복하지 않고 호출하나요?
*   인수와 출력 타입이 연산에서 추론되나요?
*   전송 구문이 전송 역할만 추가하나요?
*   편의 매크로 없이도 프로그램을 구성할 수 있나요?
*   런타임과 메타데이터가 같은 프로그램을 해석하나요?
