<!-- reader: {"title":"연속 전달 스타일"} -->

# 연속 전달 스타일(CPS) {#continuation-passing-style-cps}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [일차 프로그램](../rust-dd/first-order-programs.md), [언어와 컴파일러 파이프라인](../rust-dd/compiler-pipelines.md)  
개념: [자유 모나드](free_monad.md), [디펑셔널라이제이션](defunctionalization.md)  
통찰: [EVM 대수](../insights/evm-alg.md)
```

```admonish note title="의미론적 위치"
CPS는 제어를 명시하는 표현이자 프로그램 변환입니다. 의미를 보존하는지는 명시된 소스 의미론과 대상 의미론 및 둘 사이의 대응 관계에 달려 있습니다.
```

## 정의 {#definition}

연속 전달 스타일(CPS)은 함수가 값을 직접 반환하지 않는 프로그램 작성 방식입니다. 대신 프로그램의 나머지를 나타내는 *연속 실행*이라는 함수에 결과를 전달합니다.

## 동기 {#motivation}

*   제어 흐름을 명시하고 프로그램으로 다룰 수 있게 합니다.
*   논블로킹 IO, 조기 종료, 코루틴, 백트래킹, 동시성 스케줄링 같은 고급 변환을 가능하게 합니다.
*   최적화와 분석을 단순화하기 위해 컴파일러 중간 표현에서 사용됩니다.

## 기본 형태 {#basic-form}

직접 스타일:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

CPS:

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

여기서 `k`는 연속 실행입니다. `x + 1`를 직접 반환하는 대신 `k(x + 1)`를 호출합니다.

## 주요 속성 {#key-properties}

*   모든 함수 호출은 연속 실행에 대한 *꼬리 호출*입니다.
*   현재 계산은 호출자에게 “돌아오지” 않습니다. 대신 연속 실행으로 이동합니다.
*   프로그램에서 제어 흐름이 명시적으로 드러납니다.

## 고차 함수와의 관계 {#relation-to-higher-order-functions}

*   CPS에서 연속 실행은 그저 고차 함수입니다.
*   계산의 각 단계는 다음에 할 일을 나타내는 연속 실행을 받습니다.

## 디펑셔널라이제이션과의 관계 {#relation-to-defunctionalization}

*   CPS에서 연속 실행은 실제 함수 값입니다.
*   디펑셔널라이제이션은 연속 실행 함수를 다음 단계의 가능성을 나타내는 자료 구조(열거형)와 이를 해석하는 `apply` 함수로 대체합니다.

## 자유 모나드와의 관계 {#relation-to-free-monads}

*   자유 모나드의 `FlatMap` 생성자는 저장된 연속 실행입니다.
*   자유 모나드를 해석하는 것은 연속 실행이 프로그램 데이터에 포함된 CPS 코드를 실행하는 것과 같습니다.
*   적합한 자유 모나드 인코딩은 CPS 및 디펑셔널라이즈된 연속 실행 표현과 연관 지을 수 있습니다.

## 장점 {#advantages}

*   유연한 제어 흐름 표현.
*   평가 순서를 더 쉽게 추론할 수 있음.
*   인터프리터, 디버거, 최적화기, 비동기 런타임 구현에 유용함.

## 단점 {#disadvantages}

*   직접 스타일보다 장황함.
*   사람이 읽기 더 어려울 수 있음.
*   꼬리 호출 최적화가 기본 지원되지 않는 언어에서는 효율성을 위해 필요함.
