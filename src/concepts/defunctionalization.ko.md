<!-- reader: {"title":"디펑셔널라이제이션"} -->

# 디펑셔널라이제이션 {#defunctionalization}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [일차 프로그램](../rust-dd/first-order-programs.md), [언어와 컴파일러 파이프라인](../rust-dd/compiler-pipelines.md)  
개념: [자유 모나드](free_monad.md), [연속 전달 스타일](cps.md)  
통찰: [EVM 대수](../insights/evm-alg.md)
```

```admonish note title="의미론적 위치"
디펑셔널라이제이션은 프로그램 동작을 보존하려는 의도로 표현을 변경합니다. 의미 우선 설계에서는 실행 전에 다른 인터프리터가 연산을 검사하거나 합성해야 할 때 생성된 일차 값을 활용할 수 있습니다.
```

## 정의 {#definition}

디펑셔널라이제이션은 고차 함수를 가능한 함수를 나타내는 일차 자료 구조와 그 함수를 적용하는 인터프리터 함수로 대체하는 프로그램 변환입니다.

## 동기 {#motivation}

일부 언어, 컴파일러, 런타임은 고차 함수를 효율적으로 처리할 수 없거나 전혀 지원하지 않습니다. 디펑셔널라이제이션을 하면 프로그램이 온전히 일차 형태가 되어 컴파일, 분석, 직렬화 또는 제한된 환경에서 실행하기 쉬워집니다.

## 절차 {#the-process}

1.  생성되어 전달될 수 있는 모든 고차 함수를 파악합니다.
2.  각 함수가 필요로 하는 데이터와 함께 열거형이나 합 타입에서 고유 태그를 부여합니다.
3.  함수 값을 이 태그로 바꿉니다.
4.  태그와 함수 인수를 받는 `apply` 함수를 정의한 다음, 태그를 패턴 매칭해 올바른 코드를 실행합니다.

## Rust 예시 {#example-in-rust}

변환 전: 클로저 사용

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

변환 후: 디펑셔널라이즈된 형태

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## 속성 {#properties}

*   모든 함수가 이제 단순한 데이터로 표현됩니다.
*   프로그램은 순수한 일차 형태가 됩니다.
*   `apply` 함수가 직접 함수 호출을 대체합니다.

## 응용 {#applications}

*   컴파일러 백엔드 단순화: 많은 컴파일러가 CPS 코드를 만든 다음 디펑셔널라이즈합니다.
*   함수 직렬화: 열거형 태그를 네트워크로 보내거나 파일에 저장할 수 있습니다.
*   정적 분석: 일차 코드는 추론하기 쉽습니다.
*   인터프리터 도출: 디펑셔널라이제이션은 자연스럽게 인터프리터 패턴으로 이어집니다.

## CPS와의 관계 {#relation-to-cps}

CPS(연속 전달 스타일)에서 연속 실행은 고차 함수입니다. CPS 코드를 디펑셔널라이즈하면 연속 실행이 열거형의 유한한 사례 집합과 적용 함수로 바뀝니다.

## 자유 모나드와의 관계 {#relation-to-free-monads}

적합한 자유 모나드 표현은 CPS로 변환된 프로그램의 디펑셔널라이즈된 연속 실행과 관련될 수 있습니다. 밀접한 연관은 있지만 두 구성이 항상 동일한 것은 아닙니다.

## 타입 수준 애플리케이션 {#type-level-application}

디펑셔널라이제이션은 고차 종류 타입을 기본 지원하지 않는 언어에서도 타입 수준 애플리케이션을 인코딩할 수 있습니다. [객체 대수를 적용한 C# 실험](https://github.com/tgrospic/object-algebras)은 `App<F, a>`를 이용해 이 경량 인코딩을 적용하고, 펑터, 애플리케이티브, 모나드, 효과 대수를 표현합니다.

## 참고 문헌 {#references}

*   Reynolds, J. C. (1972). *Definitional Interpreters for Higher-Order Programming Languages*.  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J., White, L. (2014). *Lightweight Higher-Kinded Polymorphism* (디펑셔널라이제이션을 이용해 타입 수준 애플리케이션 인코딩).  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
