<!-- reader: {"title":"작동 의미론","sourceHash":"sha256:ac0d98925f230224cd8aee84741bb9ef24b9a477b131eafa8d0367b730ea077d"} -->

# 작동 의미론 {#operational-semantics}

```admonish tip title="관련 항목"
의미론적 관점: [표시적 설계](../denotational-design/design.md)  
Rust에서 의미로 설계하기: [언어와 컴파일러 파이프라인](../rust-dd/compiler-pipelines.md)  
개념: [자유 모나드](free_monad.md), [연속 전달 스타일](cps.md), [디펑셔널라이제이션](defunctionalization.md)  
통찰: [의미론에서 기계로](../insights/operational_semantics.md)
```

## 정의 {#definition}

**작동 의미론**은 평가 판단이나 **구성** 사이의 전이로 프로그램 동작을 설명합니다. 구성에는 프로그램 일부와 함께 환경, 저장소, 연속 실행 기록 또는 다른 추상 기계 상태가 포함될 수 있습니다.

이 설명은 수학적입니다. 어떤 평가나 전이가 유효한지 명시합니다. 인터프리터나 가상 머신이 그 규칙을 구현할 수 있지만, 특정 구현 자체가 정의는 아닙니다.

```admonish note title="의미론적 위치"
작동 의미론은 비공식적인 구현 세부가 아니라 정확한 의미론입니다. 평가 규칙이나 전이 규칙으로 동작을 설명합니다. [표시적 설계](../denotational-design/design.md)는 이를 보완하는 선행 설계 질문을 던집니다. 그 규칙은 어떤 합성 가능한 의미와 등식을 보존해야 할까요?
```

## 작동 의미론의 유형 {#styles-of-operational-semantics}

### 소단계 의미론(구조적 작동 의미론) {#small-step-structural-operational-semantics}

계산을 원자적 전이로 나눕니다:

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

동시성, 인터리빙, 부분 실행을 모델링하는 데 유용합니다.

### 대단계 의미론(자연 의미론) {#big-step-natural-semantics}

최종 결과로 평가를 설명합니다:

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

종료하는 프로그램을 추론할 때 더 명확한 경우가 많습니다.

## 형식 규칙 {#formal-rules}

작동 의미론은 보통 **추론 규칙**으로 표현합니다. 간단한 산술 언어를 예로 들어 보겠습니다:

$$ E ::= n \mid E + E $$

왼쪽에서 오른쪽으로 평가하려면 규칙 세 개가 필요합니다:

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

앞의 두 규칙은 다음에 줄일 수식을 선택합니다. 세 번째 규칙은 피연산자가 모두 값이 되면 덧셈을 수행합니다.

평가 추적:

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## 중요한 이유 {#why-it-matters}

*   실행에 대한 **정확한 기계식 모델**을 제공합니다.
*   인터프리터와 가상 머신의 토대입니다.
*   정확성, 자원 사용, 안전성을 추론하는 데 도움이 됩니다.

## 다른 개념과의 관계 {#relation-to-other-concepts}

*   **자유 모나드**는 명령어 구문과 시퀀싱을 제공합니다. 작동 규칙은 해당 표현의 프로그램이 어떻게 평가되는지 설명할 수 있습니다.
*   **CPS**는 계산의 나머지를 컨티뉴에이션으로 명시합니다. 작동 규칙은 값이 해당 컨티뉴에이션으로 전달되는 방식을 설명할 수 있습니다.
*   **디펑셔널라이제이션**은 알려진 함수 계열을 일차 데이터와 `apply` 연산으로 대체합니다. 작동 규칙은 그 결과로 생긴 명시적 기계 상태를 설명할 수 있습니다.

이들은 작동 의미론으로 설명할 수 있는 대상과 변환입니다. 그 자체가 작동 의미론은 아닙니다.

## 실제 적용 {#in-practice}

작동 규칙은 인터프리터를 안내하고 검사에 사용할 정확한 모델을 제공할 수 있습니다:

*   **EVM**은 소단계 상태 전이 시스템으로 자연스럽게 모델링할 수 있으며, 종료하는 전체 실행도 대단계 판단으로 연결할 수 있습니다.
*   소단계 규칙은 흔히 Rust 인터프리터의 `match` 분기와 직접 대응합니다.

$$ n_1 + n_2 \to n_3 $$

위에 제시한 완전한 좌우 방향 관계는 Rust 코드로 나타낼 수 있습니다:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

이 함수는 전이 한 번을 수행합니다. 반복 적용하면 표시된 추적이 만들어집니다. `None`을 반환한다는 것은 식이 이미 값임을 뜻합니다.

## 작동적 질문과 표시적 질문 {#operational-and-denotational-questions}

작동 규칙은 안전성, 진행성, 자원 한도, 구현과의 대응 관계를 증명할 수 있습니다. 의도한 추상 의미보다 먼저 작동 장치를 선택하면 한계가 나타납니다. 구현 선택이 의도치 않은 의미론적 약속이 될 수 있습니다.

표시적 설계는 작동 의미론을 거부하지 않습니다. 먼저 의미론적 영역, 합성, 법칙을 명시한 다음 작동 모델을 이들과 연결하자는 것입니다.

| 관점 | 질문 |
| --- | --- |
| 표시적 | 프로그램 전체는 무엇을 의미하나요? |
| 작동적 | 어떤 전이로 평가되나요? |
| 정확성 | 그 전이가 의도한 의미를 보존하나요? |

다음 영상은 작동 설명을 통찰의 유일한 원천으로 삼을 때의 위험을 보여 줍니다.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>작동 설명이 의미 전체는 아니다 (1/2)</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>작동 설명이 의미 전체는 아니다 (2/2)</figcaption></figure>
