<!-- reader: {"title":"분기와 합류성","sourceHash":"sha256:5f5f2bd836aff683d4aeb745963ca7b9e19c5f2a9ed3cdd1f2b1038bacda97fa"} -->

# 분기와 합류성 {#branching-and-confluence}

```admonish tip title="관련 항목"
의미론적 관점: [표시와 합성성](../denotational-design/denotations.md), [법칙과 해석](../denotational-design/laws-and-interpretations.md)  
Rust에서 의미로 설계하기: [법칙, 시나리오, 증거](../rust-dd/laws.md)  
개념: [작동 의미론](operational_semantics.md)
```

분기, 결정성, 합류성, 실행 기록 동치, 쌍방향 시뮬레이션은 모두 계산의 여러 가능성을 다룹니다. 하지만 같은 속성은 아닙니다.

```admonish note title="의미론적 위치"
제어 흐름 분기는 작동 구조입니다. 합류성은 축약 관계의 속성입니다. 실행 기록 동치와 쌍방향 시뮬레이션은 동작을 비교합니다. 표시적 동등성은 선택한 의미론적 영역에서 의미를 비교합니다. 건전한 설계는 이런 개념 사이를 막연하게 오가지 말고 필요한 동등성이 무엇인지 명시합니다.
```

## 동작 동치 {#behavioral-equivalence}

동시성 및 대화형 프로그램은 최종 결과가 하나뿐인 경우가 드뭅니다. 일반적인 출발점은 **레이블 전이 시스템**입니다:

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

여기서 $S$는 상태 집합이고, $A_{\tau}$은 관찰 가능한 동작 레이블과 내부 동작 $\tau$의 집합이며, $\to\;\subseteq S \times A_{\tau} \times S$은 전이 관계입니다. 상태 $p$가 동작 $a$을 수행해 $p'$가 될 수 있을 때 $p \xrightarrow{a} p'$라고 씁니다.

동작 동치는 이런 시스템 사이에서 어떤 차이를 의도적으로 무시할지 지정합니다:

*   **선형 시간 관찰**은 완료되거나 부분적으로 실행된 과정을 따라가며 그동안 일어난 일을 기록합니다
*   **분기 시간 관찰**은 대안이 가능한 지점과 선택이 확정되는 시기도 보존합니다

따라서 두 시스템이 같은 실행 기록을 허용하면서도 분기 구조는 다를 수 있습니다. 하나는 상호작용 전에 두 동작 중 하나를 고르고 다른 하나는 상호작용 뒤로 선택을 미룰 수 있습니다. 동작 순서는 같지만 앞으로 가능한 경우는 다릅니다.

van Glabbeek의 [선형 시간–분기 시간 스펙트럼](https://ir.cwi.nl/pub/5685/5685.pdf)은 이런 동작 동치를 체계적으로 설명하는 표준 틀입니다. 약한 것에서 강한 것으로 단순 순위를 매기는 것이 아니라, 각 지점이 서로 다른 관찰 집합을 보존합니다.

## Rust 프로그램의 분기 {#branching-in-rust-programs}

`if`는 조건에 따라 한 분기를 선택합니다:

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

`match`는 값에 따라 한 갈래를 선택합니다:

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

결정적 언어에서 입력이 고정되어 있으면 이러한 구성은 예측 가능한 제어 흐름 경로를 선택합니다. 이 속성은 **결정성**이며 합류성이 아닙니다.

## 합류성이란 {#what-confluence-means}

같은 항에서 시작한 두 축약이 다시 하나로 합쳐질 수 있을 때 축약 관계는 합류적입니다:

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

형식적으로 다음이 성립하면:

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

그런 다음 어떤 `d`가 존재하여 다음이 성립해야 합니다:

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

합류성은 여러 축약 경로를 허용합니다. 그 경로들이 공통 후속 상태에 도달할 수 있다는 의미에서 서로 양립한다고 말합니다.

## 결정성과 합류성 {#determinism-and-confluence}

결정적 축약 관계에서는 상태마다 다음 단계가 최대 하나입니다. 따라서 조정해야 할 경쟁 전이가 없으므로 간단한 의미에서 합류적입니다.

역은 성립하지 않습니다. 여러 축약 순서를 허용하면서도 모든 순서가 결국 같은 결과에 도달하는 시스템이 있을 수 있습니다.

일반 Rust의 `if` 및 `match` 표현식은 결정적 선택의 예입니다. 그것만으로 합류성의 흥미로운 내용을 보여 주지는 않습니다.

## Church–Rosser {#churchrosser}

Church–Rosser 정리는 람다 계산의 축약에 대한 합류성 속성을 말합니다. 서로 다른 축약 경로로 하나의 항이 두 결과에 도달하면 그 결과들에는 공통 축약형이 있습니다.

정규형이 존재한다면 합류성은 그 정규형이 유일함을 뜻합니다. 평가 순서와 무관하게 최종 정규형이 같으므로 등식 추론에 도움이 됩니다.

이 결과를 임의의 명령형 프로그램에 일반화하지 마세요. 부작용, 비결정적 스케줄링, 실패, 중간 상태 관찰이 축약 순서를 구분할 수 있습니다.

## 실행 기록 {#traces}

**실행 기록**은 관찰 가능한 동작이나 상태의 시퀀스를 기록합니다. 실행 기록 의미론은 결과만 보는 의미론보다 작동 정보를 의도적으로 더 많이 보존합니다.

두 순수 함수가 내부적으로 다른 단계를 거쳐도 같은 결과를 반환할 수 있습니다. 그 단계를 무시하는 결과 표시에선 서로 같습니다. 실행 기록 의미론에서는 반드시 같지는 않습니다.

효과가 있으면 순서 변경이 관찰을 바꿀 수 있습니다:

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

`is_admin`를 먼저 검사하는 것과 `is_user`를 먼저 검사하는 것은 동등한 분류 결과를 반환해도 서로 다른 실행 기록을 출력할 수 있습니다.

그 출력이 선택한 의미론적 영역에 속하는지가 설계 질문입니다.

## 실행 기록 동치 {#trace-equivalence}

선택한 실행 기록 모델에서 같은 관찰 실행 기록을 허용할 때 두 시스템은 실행 기록 동치입니다.

실행 기록 동치는 분기 구조를 무시할 수 있습니다. 한 시스템이 다른 시스템보다 일찍 선택을 확정해도 같은 실행 기록을 생성할 수 있습니다. 대화형 및 동시성 시스템에서는 그 차이가 중요할 수 있습니다.

## 쌍방향 시뮬레이션 {#bisimulation}

쌍방향 시뮬레이션은 두 전이 시스템을 단계별로 연관시킵니다. 한 시스템이 관찰 가능한 동작을 하면 다른 시스템도 이를 맞출 수 있어야 하며, 그 결과 상태들도 계속 연관되어야 합니다.

일반적인 변형은 다음과 같습니다:

*   **강한 쌍방향 시뮬레이션**은 개별 전이를 대응시킵니다
*   **약한 쌍방향 시뮬레이션**은 선택된 내부 전이를 추상화합니다
*   **분기 쌍방향 시뮬레이션**은 중요한 선택 구조를 보존하면서 내부 작업을 추상화합니다

쌍방향 시뮬레이션은 상호작용 중 대안이 계속 가능한 방식을 관찰하므로 실행 기록 동치보다 더 강한 동작 비교인 경우가 많습니다.

<details>
<summary><strong>기원과 형식 정의</strong></summary>

Milner는 [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)에서 통신 프로세스의 관찰적 동치를 발전시켰습니다. Park는 [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)에서 그에 대응하는 동치를 쌍대 귀납적으로 규정하여, 오늘날 쌍방향 시뮬레이션으로 알려진 최대 고정점 관계와 증명 방법을 제시했습니다. Milner는 이 방법을 프로세스 동작 추론의 토대로 채택하고 발전시켰습니다.

**강한 쌍방향 시뮬레이션.** 레이블 전이 시스템에서 관계 $R$는 $p\mathrel{R}q$일 때 강한 쌍방향 시뮬레이션입니다. 모든 동작 $a$에 대해:

*   $p\xrightarrow{a}p'$이면 $q'$을 만족하는 어떤 $q\xrightarrow{a}q'$가 존재하고 $p'\mathrel{R}q'$이어야 합니다. 그리고
*   $q\xrightarrow{a}q'$이면 $p'$을 만족하는 어떤 $p\xrightarrow{a}p'$가 존재하고 $p'\mathrel{R}q'$이어야 합니다.

어떤 쌍방향 시뮬레이션이 두 상태를 연관시키면 두 상태는 쌍방향 시뮬레이션 동치입니다. 정의는 쌍대 귀납적입니다. 전이를 대응시킨 뒤에도 후속 상태에 같은 동작 의무가 다시 적용됩니다.

**분기 쌍방향 시뮬레이션.** 흔히 쓰이는 발산을 무시하는 설명에서 대칭 관계 $R$는 $p\mathrel{R}q$ 및 $p\xrightarrow{a}p'$가 참일 때 다음 둘 중 하나를 만족하면 분기 쌍방향 시뮬레이션입니다:

*   $a = \tau$ 및 $p'\mathrel{R}q$, 또는
    
*   다음과 같은 상태 $q_0$와 $q'$이 존재합니다
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

여기서 $\xRightarrow{\tau}$는 내부 전이가 0회 이상 있음을 나타냅니다. 중간 상태 $q_0$가 $p$와 계속 연관되어야 한다는 조건은 내부 작업을 무시할 수 있게 하면서 관련 분기 가능성을 보존합니다. van Glabbeek과 Weijland는 [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf)에서 이 동치를 도입하고 발전시켰습니다.

</details>

## 표시적 동등성 {#denotational-equality}

표시적 동등성은 선택한 의미론적 영역에 따라 달라집니다:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

영역 자체가 실행 기록, 쌍방향 시뮬레이션에 따라 몫을 취한 전이 시스템, 결과 집합 또는 다른 수학적 모델로 구성될 수 있습니다. 표시적 설계는 보편적인 단일 동등성을 규정하지 않습니다. 동등성을 명시적으로 선택해 합성적으로 사용해야 합니다.

관계는 다음과 같습니다:

1.  작동 시스템에서 시작합니다.
2.  관련 관찰을 선택합니다.
3.  의미론적 영역과 동등성을 선택합니다.

## 데이터로서의 분기 {#branching-as-data}

분기는 트리 구조로도 나타납니다. 이진 경로는 왼쪽/오른쪽 선택의 시퀀스로 표현할 수 있습니다. 이 표현은 트라이, 실행 식별자, 결정 다이어그램, 메모리 주소 지정에 유용합니다.

[왜 의미가 먼저인가](../denotational-design/semantic-view.md)의 분기 위치 의미 예시는 트리의 의미와 비트 벡터 인코딩 하나를 의도적으로 구분합니다.

Conal Elliott는 완전 이진 리프 트리 구조를 사용해 메모리 주소 지정을 설명했습니다. 기계가 언제나 소스 수준 트리를 그대로 저장한다는 뜻이 아닙니다. 합성 가능한 트리 모델이 평면 수치 주소에서는 감춰진 유용한 구조를 드러낼 수 있다는 뜻입니다.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott — 완전 이진 리프 트리로 본 메모리 주소 지정</figcaption></figure>

## 비교 {#comparison}

| 개념 | 대상 | 핵심 질문 |
| --- | --- | --- |
| 제어 흐름 분기 | 프로그램 실행 한 번 | 어떤 연속 실행이 선택되는가? |
| 결정성 | 전이 관계 | 다음 단계가 유일하게 정해지는가? |
| 합류성 | 축약 관계 | 서로 다른 축약이 합쳐질 수 있는가? |
| 실행 기록 동치 | 관찰 가능한 동작 시퀀스 | 시스템이 같은 실행 기록을 허용하는가? |
| 쌍방향 시뮬레이션 | 분기 전이 구조 | 시스템이 서로의 동작을 대응할 수 있는가? |
| 표시적 동등성 | 선택한 의미론적 영역 | 프로그램이 명세상 같은 의미를 가지는가? |

이 개념들은 서로 뒷받침할 수 있지만, 어느 것도 다른 개념의 동의어로 사용해서는 안 됩니다.

## 더 읽을거리 {#further-reading}

*   [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf) — CCS와 관찰적 동치에 관한 Milner의 기초 저작
*   [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) — 쌍방향 시뮬레이션에 대한 Park의 쌍대 귀납적 정식화
*   [*Algebraic Laws for Nondeterminism and Concurrency*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf) — 관찰적 합동과 대수 법칙에 관한 Hennessy와 Milner의 연구
*   [*What Is Branching Time and Why Use It?*](https://theory.stanford.edu/~rvg/branching/) ([압축 PDF](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)) — 분기 구조를 보존하는 이유를 간결하게 설명
*   [*The Linear Time–Branching Time Spectrum*](https://ir.cwi.nl/pub/5685/5685.pdf) — 동작 동치의 표준 분류
*   [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf) — 분기 쌍방향 시뮬레이션의 기초 연구
*   [*Three Logics for Branching Bisimulation*](https://ir.cwi.nl/pub/1370/1370D.pdf) — 다음 시간 연산자가 없는 Hennessy–Milner식 논리와 CTL\*를 통한 논리적 특성화
