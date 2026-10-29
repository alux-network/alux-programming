<!-- reader: {"title":"자유 모나드","sourceHash":"sha256:1d74262c1053f3cc50c6a3c49b8b9b7eddfb3c6ab6f247530387d19b335f4626"} -->

# 자유 모나드 {#free-monad}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [일차 프로그램](../rust-dd/first-order-programs.md), [인터프리터와 효과](../rust-dd/interpreters.md)  
개념: [연속 전달 스타일](cps.md), [디펑셔널라이제이션](defunctionalization.md)  
통찰: [EVM 대수](../insights/evm-alg.md)
```

```admonish note title="의미론적 위치"
자유 모나드는 자유롭게 생성되는 시퀀싱을 갖춘 명령어 구문의 표현입니다. 명령어 펑터가 이미 어휘를 선택하고, 인터프리터가 그 구문을 의미론적 영역으로 대응시킵니다. 이는 강력한 인코딩 하나이지 표시적 설계의 정의는 아닙니다.
```

## 자유 모나드란 무엇인가 (Rust 버전) {#what-is-a-free-monad-rust-version}

**자유 모나드**를 사용하면 다음이 가능합니다:

*   **설명**만 하고 프로그램을 *데이터*로 표현합니다. 즉시 실행하지 않습니다.
*   나중에 프로그램을 한 가지 이상의 방법으로 **해석**합니다.

다음처럼 생각해 보세요:

> 효과가 있는 연산의 AST + 연산을 연결하는 `bind`/`flat_map`.

다음을 분리합니다:

*   **구문** → 명령어 열거형.
*   **해석** → 선택한 의미론적 영역으로 가는 구조 보존 사상.

“자유”란 모나드 법칙 이외의 등식을 추가하지 않고 펑터 `F`에서 모나드 구조를 생성한다는 뜻입니다. `F`를 선택하는 순간 명령어 구문도 정해집니다. 만들어진 프로그램을 해석하면 구체적인 표시가 주어집니다.

## Rust 구현 {#rust-implementation}

```admonish warning title="개략적 인코딩"
Rust에는 고차 종류 타입 매개변수가 직접 없으므로 실제 자유 모나드 인코딩에는 추가 타입 수준 장치나 특수화된 명령어 펑터가 필요합니다. 다음 코드는 의도된 형태를 보여 주며 그대로 사용할 수 있는 범용 구현은 아닙니다.
```

### 자유 모나드 타입 {#free-monad-type}

```rust,noplayground
#[derive(Clone)]
enum Free<F, A> {
    Pure(A),
    Suspend(F),
    FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>),
}

impl<F: Clone + 'static, A: 'static> Free<F, A> {
    fn pure(a: A) -> Self {
        Free::Pure(a)
    }

    fn flat_map<B: 'static, G>(self, f: G) -> Free<F, B>
    where
        G: Fn(A) -> Free<F, B> + 'static,
        F: 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            Free::Suspend(op) => {
                Free::FlatMap(Box::new(Free::Suspend(op)), Box::new(f))
            }
            Free::FlatMap(inner, g) => {
                Free::FlatMap(inner, Box::new(move |x| g(x).flat_map(f.clone())))
            }
        }
    }
}
```

### DSL: 콘솔 연산 {#dsl-console-operations}

```rust,noplayground
#[derive(Clone)]
enum Console<A> {
    Print(String, A),
    ReadLine(fn(String) -> A),
}

// Smart constructors
fn print_line(s: &str) -> Free<Console<()>, ()> {
    Free::Suspend(Console::Print(s.to_string(), ()))
}

fn read_line() -> Free<Console<String>, String> {
    Free::Suspend(Console::ReadLine(|input| Free::Pure(input)))
}
```

### 인터프리터 {#interpreter}

```rust,noplayground
fn run_console<A>(mut prog: Free<Console<A>, A>) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(Console::Print(s, next)) => {
                println!("{}", s);
                prog = Free::Pure(next);
            }
            Free::Suspend(Console::ReadLine(f)) => {
                let mut buf = String::new();
                std::io::stdin().read_line(&mut buf).unwrap();
                prog = f(buf.trim().to_string());
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op), // minimal handling
                _ => unimplemented!(),
            },
        }
    }
}
```

### 사용법 {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## 핵심 요점 {#takeaway}

*   **구문** = 가능한 명령어인 `enum Console`
*   **프로그램** = 단계를 기술하는 데이터인 `Free<Console, A>`
*   **구체적 해석** = `run_console`
*   장점: 같은 프로그램을 실제 IO로 실행하거나, 파일에 기록하거나, 다른 언어로 컴파일하는 등 여러 인터프리터를 작성할 수 있습니다.

## 연속 실행 및 CPS와의 관계 {#correlation-to-continuations-and-cps}

<strong>연속 전달 스타일(CPS)</strong>은 함수가 값을 직접 반환하지 않고, “프로그램의 나머지”를 나타내는 다른 함수인 *연속 실행*에 결과를 전달하는 방식으로 프로그램을 작성하는 기법입니다.

**자유 모나드**는 기본적으로 **단계의 시퀀스로 된 프로그램**이며, 각 단계는 다음과 같이 말합니다:

> “이 작업을 하고, 나머지를 계속 실행하세요.”

그 “프로그램의 나머지”가 바로 **연속 실행**입니다. 현재 결과를 다음 단계로 전달하는 함수입니다.

*   Rust 자유 모나드에서는:
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>` **가 연속 실행**입니다.
    
*   자유 모나드를 해석할 때는 **CPS로 실행**하는 것입니다:
    
    *   값을 직접 반환하는 대신 다음 연속 실행에 전달합니다.
    *   결국 다음과 같은 반복 구조가 됩니다: `current_instruction -> feed result into continuation -> next instruction`
*   **CPS와의 관계**:
    
    *   자유 모나드는 *CPS를 자료 구조에 인코딩합니다*.
    *   CPS는 같은 아이디어의 *런타임 제어 흐름 표현*입니다.

**간단한 대응표**:

| 개념 | CPS에서 | 자유 모나드 AST에서 |
| --- | --- | --- |
| 단계 결과 | 연속 실행의 인수 | `A`, `Fn(A) -> Free` 안의 |
| 연속 실행 | 함수 `(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| 프로그램 | 중첩된 연속 실행 | 중첩된 `FlatMap` 변형 |
| 실행 | 함수 호출 | 패턴 매칭 후 호출 |

## GoF(GoF 디자인 패턴) 대응 {#gof-gang-of-four-design-patterns-mapping}

자유 모나드는 함수형 프로그래밍 이론에서 나온 것이므로 GoF의 **패턴은** 아니지만, 여러 패턴을 **포괄하거나** **모사**합니다:

| GoF 패턴 | 자유 모나드와의 관계 |
| --- | --- |
| **인터프리터** | “AST + 실행” 전체가 문자 그대로 인터프리터 패턴입니다. 자유 모나드는 AST와 합성자를 무료로 제공합니다. |
| **명령** | DSL의 각 `enum` 변형은 명령 객체입니다. 자유 모나드는 이를 매크로 명령처럼 연결합니다. |
| **컴포지트** | AST 구조(중첩 명령어)는 명령의 컴포지트입니다. |
| **빌더** | `.flat_map` 연결은 프로그램을 위한 유창한 빌더입니다. |
| **비지터** | 인터프리터는 본질적으로 명령어 집합을 순회하는 비지터입니다. |

## 왜 자유 모나드가 이 패턴들보다 나은가 {#why-free-monad--these-patterns}

*   GoF 패턴은 인터페이스와 클래스를 정의하고 이를 합성하는 **수작업 객체 지향 작업**입니다.
    
*   자유 모나드는 **대수적**입니다. 명령어용 *데이터*와 이를 해석할 *함수*를 정의합니다.
    
*   다음 기능을 자동으로 얻습니다:
    
    *   시퀀싱 (`flat_map`)
    *   합성
    *   핵심 로직을 수정하지 않는 여러 인터프리터

**요약 표**:

| 자유 모나드의 함수형 프로그래밍 개념 | 동등한 GoF/객체 지향 패턴 |
| --- | --- |
| 명령어 열거형 | 명령 |
| 프로그램 AST | 컴포지트 |
| `flat_map` 빌더 | 빌더 |
| 인터프리터 함수 | 인터프리터/비지터 |
| 여러 인터프리터 | 전략 |

## 디펑셔널라이제이션과의 관계 {#relation-to-defunctionalization}

**디펑셔널라이제이션**은 고차 함수를 가능한 함수들의 일차 데이터 구조와 그 데이터에 적용하는 인터프리터로 대체하는 프로그램 변환입니다.

CPS에서 연속 실행은 고차 함수입니다. CPS 프로그램을 디펑셔널라이즈하면 연속 실행이 사례별 열거형과 이를 실행하는 `apply` 함수로 대체됩니다.

적절한 인코딩에서는 자유 모나드를 CPS 변환 프로그램 안의 디펑셔널라이즈된 연속 실행과 연결할 수 있습니다:

1.  프로그램을 CPS 버전으로 시작합니다. “프로그램의 나머지”는 연속 실행 함수에 담깁니다.
2.  그 연속 실행 함수를 데이터 타입의 유한한 사례 집합으로 디펑셔널라이즈합니다.
3.  결과 일차 데이터 타입은 자유 모나드 표현과 같은 명령어 및 연속 실행 형태를 가질 수 있습니다.

**주요 공통점**

*   자유 모나드와 디펑셔널라이제이션은 모두 계산을 데이터로 표현하며, 그 데이터에 의미를 부여하는 인터프리터가 필요합니다.
*   자유 모나드의 `FlatMap` 사례에는 연속 실행이 들어 있습니다. 디펑셔널라이제이션은 해당 클로저를 데이터 타입의 사례로 대체합니다.

**주요 차이점**

| 관점 | 디펑셔널라이제이션 | 자유 모나드 |
| --- | --- | --- |
| 목적 | 고차 함수를 제거하는 기계적 컴파일러 기법 | 구문과 의미론을 분리하는 대수적 구성 |
| 입력 | 모든 고차 프로그램, 흔히 CPS 형태 | 가능한 명령어를 기술하는 펑터 F |
| 출력 | 함수 사례의 열거형과 적용 함수 | `Free<F, A>` AST와 인터프리터 |
| 모나드인가? | 반드시 그렇지는 않음 | 구성 방식상 항상 모나드 |
| 범위 | 일반적인 변환 | 특정 함수형 프로그래밍 패턴 |

**요약** 디펑셔널라이제이션은 변환 기법이고 자유 모나드는 대수적 구성입니다. 일부 표현에서는 서로 밀접하게 관련되지만, 추가 가정 없이 어느 한쪽에서 다른 쪽이 일반적으로 따라오지는 않습니다.
