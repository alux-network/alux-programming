<!-- reader: {"title":"언어와 컴파일러 파이프라인"} -->

# 언어와 컴파일러 파이프라인 {#language-and-compiler-pipelines}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [일차 프로그램](first-order-programs.md), [인터프리터와 효과](interpreters.md)  
개념: [작동 의미론](../concepts/operational_semantics.md), [디펑셔널라이제이션](../concepts/defunctionalization.md)  
통찰: [EVM 대수](../insights/evm-alg.md)
```

```admonish note title="의미는 파이프라인이 아닙니다"
언어의 의미를 파서 트리, 컴파일러 패스, 바이트코드, 기계 루프와 동일시하지 않으면 컴파일러를 더 명확하게 이해할 수 있습니다. 정확성은 하나의 가환 법칙입니다. 컴파일된 프로그램의 실행이 프로그램의 표시와 일치해야 합니다.
```

언어의 의미를 파서 트리, 컴파일러 패스, 바이트코드, 가상 머신 루프와 동일시하지 않을 때 컴파일러를 가장 쉽게 추론할 수 있습니다.

이 장에서는 의미론적 구조에 초점을 맞추기 위해 Tolang과 유사한 단순화된 동시성 언어를 사용합니다.

## 서로 다른 네 계층 {#four-distinct-layers}

다음 계층을 구분하세요:

1.  소스 구문
2.  정규화 언어
3.  실행 가능한 표현
4.  기계 실행

일반적인 파이프라인은 다음과 같습니다:

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

편의 연산은 합성입니다:

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

합성된 헬퍼가 각 단계의 의미 정의는 아닙니다.

## 구문은 아직 의미가 아닙니다 {#syntax-is-not-yet-meaning}

파서 출력은 문법 선택을 반영합니다:

*   구두점
*   문법적 편의 구문
*   우선순위
*   소스 구간
*   생성된 파서 표현

이 정보는 진단과 도구에 중요하지만 핵심 언어를 정의할 필요는 없습니다.

정규화는 우연한 구문 차이를 없애고 의미를 담는 더 작은 형태를 도입합니다. 예를 들어 여러 표면 바인딩 형식이 하나의 핵심 제한 연산으로 정규화될 수 있습니다.

**여러 소스 형식** → **정규화 생성자 하나**

이를 통해 후속 컴파일러 및 런타임 법칙을 명시할 단일 지점이 생깁니다.

## 표시적 의미와 컴파일된 의미 {#denotational-and-compiled-meaning}

다음을 정의합시다:

$$ \llbracket - \rrbracket : Core \to D $$

의미론적 영역 `D`에 의미를 부여합니다.

컴파일은 실행 가능한 값을 생성합니다:

$$ compile : Core \to Executable $$

실행은 그 값을 관찰합니다:

$$ run : Executable \to D $$

핵심 정확성 의무는 가환 다이어그램입니다:

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

비결정적 또는 동시성 시스템에서는 일반 값 동등성이 아니라 관찰적 동치, 결과 집합, 실행 기록 동치, 쌍방향 시뮬레이션 동치가 사용될 수 있습니다. 무엇을 쓸지는 의미 모델이 정해야 합니다.

## 동시 프로세스의 의미 {#concurrent-process-meaning}

기본 반사 계산에는 다음과 같은 개념이 포함됩니다:

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang은 기본 계산을 합성적으로 확장합니다. 그 확장 중 하나는 다음 표면 형식을 추가합니다

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

이 바인딩은 새로운 채널을 만들고 그 이름의 범위를 $P$ 위로 제한합니다. 프로세스 계산 문헌에서는 이 연산을 *제한*이라고 부릅니다. 반사형 핵심에는 기본 제한 연산자가 없습니다. Meredith와 Radestock의 [*A Reflective Higher-order Calculus*](https://doi.org/10.1016/j.entcs.2005.05.016)을 참고하세요.

작동 기계는 튜플 공간, 큐, 매칭 인덱스, 연속 실행 기록, 동시 태스크로 이를 구현할 수 있습니다. 그런 기제가 언어의 정의는 아닙니다.

의미 계층은 관찰 가능한 프로세스 동작과 구조 법칙을 식별합니다. 핵심 병렬 합성의 후보 법칙은 다음과 같습니다:

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

새 바인딩 확장의 법칙은 별도입니다. 전통적인 후보 스키마에는 알파 변환, 서로 다른 바인딩의 교환, 범위 확장이 포함됩니다:

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

여기서 $y \mathrel{\#} P$는 $P$에 대해 $y$가 새로운 이름이라는 뜻이고, $P\{y/x\}$는 변수 포획을 피하는 이름 변경이며, $P$는 $\operatorname{FN}(P)$의 자유 채널 이름 집합입니다. 선택한 관찰적 동치가 검증할 때에만 이 스키마가 법칙이 됩니다. 표면 구문에서 당연시하거나 특정 바이트코드 배치에서 추론해서는 안 됩니다.

## 의미를 보존하는 사상으로서의 정규화 {#normalization-as-a-meaning-preserving-map}

소스 프로그램 `s₁`과 `s₂`이 허용된 문법적 편의 구문만 다르다면, 정규화는 공통 의미를 명확히 드러내야 합니다:

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

다른 유용한 의무는 다음과 같습니다:

*   알파 변환이 정규화된 의미를 보존함
*   어휘 범위가 의도된 바인더로 해석됨
*   진단에 필요한 소스 위치가 보존됨
*   컴파일 시간 상수가 런타임 동작 없이 제거됨
*   잘못된 구문에서 단계 계약에 따라 진단이 누적됨

정규화된 값의 표준형이 필요한 프로젝트도 있고, 의미론적 동등성만 필요한 프로젝트도 있습니다. 어느 쪽인지 명시하세요.

## 단계 케이퍼빌리티 {#stage-capabilities}

```admonish warning title="만능 컴파일러 객체는 금물"
거대한 컴파일러 객체 하나만을 단계 인터페이스로 만들지 마세요.
```

정규화기에는 다음과 같은 케이퍼빌리티가 필요할 수 있습니다:

*   바인딩 범위 읽기 및 확장
*   소스 이름 확인
*   진단 누적
*   정규화된 항 구성

코드 생성기에는 다음이 필요할 수 있습니다:

*   실행 가능 참조 할당
*   명령어 출력
*   정규화된 변수 확인
*   실행 구조 확정

단계 진입점은 이러한 케이퍼빌리티에 대한 확장으로 표현하세요. 구체 환경은 맵, 아레나, 카운터, 진단을 저장하지만 단계 의미를 소유하지는 않습니다.

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

정확한 케이퍼빌리티 이름은 컴파일러마다 다릅니다. 중요한 점은 의존성이 명시되고 단계 사상이 안정적이라는 것입니다.

## 파서와 런타임은 작동 방식에 따라 구성할 수 있습니다 {#parser-and-runtime-can-remain-operational}

모든 하위 시스템을 동일한 인코딩으로 강제할 필요는 없습니다.

파서는 생성된 문법 장치가 중심일 수 있습니다. 가상 머신은 효율적인 변경과 스케줄링이 중심일 수 있습니다. 이들은 작동 방식에 맞춘 채로 다음과 같이 명확한 경계를 구현할 수 있습니다:

| 단계 | 계약 |
| --- | --- |
| 파서 | `Syntax` 생성 |
| 정규화기 | 의미를 담는 `Core` 생성 |
| 코드 생성기 | 실행 형식에서도 의미를 보존 |
| 런타임 | 언어 모델과 일치하는 관찰을 생성 |

표시적 설계가 기계를 없애는 것은 아닙니다. 기계가 소리 없이 언어 의미론이 되는 것을 막습니다.

## 컴파일러 법칙과 테스트 {#compiler-laws-and-tests}

강한 증거는 여러 방향에서 확보합니다:

*   동등한 소스 형태 사이의 정규화 법칙
*   의도된 경우 파싱과 예쁘게 출력하기 사이의 왕복 검사
*   직접 의미 평가와 컴파일된 실행 비교
*   표준 출력을 약속한 경우의 바이트코드 동등성
*   런타임 적합성 시나리오
*   인터프리터 간 차등 테스트

```admonish warning title="바이트 동등성은 의미 동등성이 아닙니다"
바이트 단위 동등성을 의미론적 동등성과 혼동하지 마세요. 정규 컴파일이 명세에 포함될 때만 바이트 동등성이 더 강한 유용한 속성입니다.
```

## 이 내용을 읽는 방법 {#how-this-prepares-the-reader}

의미 우선 언어 구현을 읽을 때 다음을 살펴보세요:

*   의미 구문 또는 케이퍼빌리티 트레이트
*   파생 정규화 연산
*   명시적 단계 계약
*   일차 핵심 프로그램
*   치환, 범위, 합성 법칙
*   단계 케이퍼빌리티를 해석하는 얇은 환경
*   가장자리에 있는 작동 파서, 컴파일러, 가상 머신 장치

이 관점은 일반적인 표시적 설계와 Tolang을 연결해 의미론적 경계가 언어 설계, 컴파일, 런타임 해석을 어떻게 이끄는지 보여 줍니다.
