<!-- reader: {"title":"표시적 설계","sourceHash":"sha256:bac0e12637b9f63a8fa1002e44ca58f04237a81e1bc18da343cf22e360a85e8e"} -->

# 표시적 설계 {#denotational-design}

```admonish tip title="관련 항목"
의미론적 관점: [표시와 합성성](denotations.md), [법칙과 해석](laws-and-interpretations.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](../rust-dd/capability-algebras.md), [파생 의미와 합성](../rust-dd/derived-meaning.md)
```

```admonish note title="핵심 아이디어"
표시적 설계는 단순하고 합성 가능하며 구현에 독립적인 의미에서 프로그래밍 인터페이스를 도출하여, 사후에 인터페이스를 설명하는 대신 의미론이 설계를 이끌게 합니다.
```

표시적 설계란 단순하고 합성 가능하며 구현에 독립적인 의미에서 프로그래밍 인터페이스를 도출하는 방법입니다.

이 방법론은 [Conal Elliott](http://conal.net/)가 개발하고 이름 붙였습니다. 핵심은 기존 언어나 API에 의미론을 부여하는 데 그치지 않습니다. 의미론이 API 자체의 설계를 이끌도록 하는 것입니다.

## 설계 순환 {#the-design-loop}

다음 순서를 따르세요:

1.  의미론적 영역을 선택합니다.
2.  그 영역에서 중요한 구조를 파악합니다.
3.  기본 연산의 어휘를 작게 선택합니다.
4.  유용한 연산을 합성적으로 도출합니다.
5.  그 연산이 따르는 법칙을 명시합니다.
6.  하나 이상의 표현을 선택합니다.
7.  구조를 보존하는 해석을 구현합니다.
8.  법칙, 모델, 시나리오를 이용해 검증합니다.

표현 우선 설계는 흔히 6단계에서 시작한 뒤 1~5단계를 사후에 재구성하려 합니다.

## 분기 대수 설계 {#designing-a-branch-algebra}

분기 위치로 돌아가 봅시다. 원하는 의미는 이진 분기 구조 안의 유한한 경로입니다.

가능한 기본 대수의 한 예는 다음과 같습니다:

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

부분 함수 $\rightharpoonup$는 첫 번째 분기가 두 번째 분기의 조상일 때만 경로를 관찰할 수 있음을 뜻합니다.

여기서 유용한 연산을 도출할 수 있습니다:

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

이 대수는 벡터, 정수, 분수, 데이터베이스 키, 바이트를 언급하지 않습니다. 그런 선택은 나중에 합니다.

## 편의보다 구조를 먼저 {#structure-before-convenience}

기본 어휘는 후속 코드가 의존하는 구조를 드러내야 합니다. 특정 구현에서 편리하게 쓸 수 있는 메서드를 모두 모아 놓은 집합이어서는 안 됩니다.

````admonish warning title="표현 우선 기본 연산은 피하세요"
이 트레이트는 저장 배치, 설정 위치, 비트 표현, 복합 작업 흐름을 한데 묶습니다. 분기의 의미를 분리해 드러내지 못합니다:

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

선택한 영역에 효과가 포함된다면 의미론적 API에도 효과가 들어갈 수 있습니다. 규칙은 “모든 것이 순수해야 한다”가 아닙니다. “각 기본 연산은 일관된 의미를 명시해야 한다”입니다.

## 인코딩은 방법론이 아닙니다 {#encoding-is-not-methodology}

표시적 설계에 다음은 필수 조건이 아닙니다:

*   Haskell
*   태그리스 파이널 인코딩
*   객체 대수
*   자유 모나드
*   단일 AST
*   순수 함수만 사용하기
*   모든 API에서 범주론 용어 사용하기

이들은 유용한 인코딩이나 설명 도구일 수 있지만, 어느 것도 방법론을 정의하지는 않습니다.

```admonish note title="Rust 인코딩"
Rust에서는 작은 트레이트, 연관 타입, 확장 메서드, 제네릭 함수, 일차 프로그램 값이 실용적인 인코딩입니다. 그 가치는 명확한 의미론적 설계를 보존하는지에 달려 있습니다.
```

## 타입 클래스 사상 {#type-class-morphisms}

이 방법을 이해하는 한 가지 방식은 구조를 보존하는 사상으로 바라보는 것입니다.

인터페이스가 의미론적 대수를 설명한다고 가정해 봅시다. 구현은 추상 값과 연산을 구체적인 표현으로 대응시킵니다. 올바른 구현은 관련 연산과 법칙을 보존해야 합니다.

`encode`가 추상 분기를 구체적인 기반 집합으로 대응시킨다면, 확장의 보존은 다음과 같습니다:

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

구현은 이름만 맞춘 메서드 모음이 아닙니다. 대수적 구조를 따르는 사상이어야 합니다.

## 좋은 추상화의 조건 {#what-counts-as-a-good-abstraction}

좋은 표시적 설계 추상화에는 다음과 같은 특성이 있습니다:

*   값이 단순하고 의도된 의미를 가집니다.
*   기본 연산이 의미론적 관찰이나 구성을 드러냅니다.
*   더 큰 동작을 기본 연산에서 도출합니다.
*   법칙이 특정 표현에 의존하지 않습니다.
*   독립적인 구현이 이를 해석할 수 있습니다.
*   작동 세부 사항은 관련성이 생길 때만 나타납니다.

작다는 것만으로는 충분하지 않습니다. `get_manager()`만 노출하는 작은 트레이트도 여전히 표현 우선입니다. 연산들이 일관된 의미 구조를 이룬다면 더 큰 대수를 정당화할 수 있습니다.

## 의미 값과 추상 기반 집합 {#semantic-values-and-abstract-carriers}

구체 타입을 모두 명세에서 배제해야 하는 것은 아닙니다.

인터프리터가 기반 집합을 선택해야 할 때는 연관 타입을 사용하세요:

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

안정적인 의미 어휘라면 구체 타입을 사용하세요:

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

추상은 좋고 구체는 나쁘다는 구분이 아닙니다. 의미 어휘와 우연히 선택된 기계 표현의 구분입니다.

## 명세는 표시이며 실행될 필요가 없습니다 {#the-specification-is-the-denotation-and-it-need-not-execute}

명세는 표시, 즉 각 구성 요소에 부여되는 수학적 의미입니다. 효율성은 물론 실행 가능성의 제약에서도 자유롭다는 점이 그 힘입니다.

```admonish quote title="Conal Elliott"
표시는 효율성의 제약이나 방해, 심지어 실행 가능성의 제약도 받지 않으므로 구현보다 정의하기가 훨씬 쉽고 더 많은 통찰을 주는 경우가 많습니다.

— [표시적 설계: 의미에서 프로그램으로 (LambdaJam 2015)](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

대표적인 예는 FRP(함수형 반응형 프로그래밍)입니다. `Behavior a`은 연속 시간의 함수로 정의됩니다.

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

그 모델은 정확하지만 실행할 수 없습니다. 실수를 모두 열거할 수는 없기 때문입니다. 마찬가지로 프로그램이 결과의 집합을 나타낼 수도 있습니다. 어느 모델도 실행되지는 않으며, 바로 그 점이 핵심입니다. 의미는 계산 방식이 아니라 단순성과 정확성에 따라 선택합니다.

실행 가능성과 효율성은 전적으로 별도 산출물인 *구현*에 맡깁니다. 의미로 되돌아가는 준동형 법칙(타입 클래스 사상)이 구현의 정확성을 뒷받침합니다. 의미 함수는 각 구문 합성을 대응하는 의미 합성으로 옮겨야 합니다. Conal의 표현을 빌리면, 표시는 “무엇을 구현할지 *정확히* 명확하게 정의하면서, *어떻게* 구현할지는 창의적으로 정할 여지를 넉넉히 남깁니다.”

Rust에서는 여러 산출물이 이 명세의 일부를 표현하며, 그중 일부는 우연히 실행 가능하기도 합니다. 실행 가능성은 부수적인 특성이지, 그것을 명세로 만드는 조건은 아닙니다:

*   산문은 의도된 의미를 명시합니다
*   트레이트는 사용할 수 있는 기본 연산을 명시합니다
*   확장은 도출 과정을 명시합니다
*   법칙은 필요한 등식을 명시합니다
*   인터프리터는 실현 가능성을 보여 줍니다
*   테스트는 유한한 증거를 제공합니다

구체적인 구현 장치보다 의미와 법칙에 더 큰 권위를 두고 함께 읽으세요.

## 더 읽을거리 {#further-reading}

*   [표시적 설계: 프로그램에서 의미로 (BayHac 2014)](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [타입 클래스 사상을 이용한 표시적 설계](http://conal.net/papers/type-class-morphisms/)
*   [Conal Elliott의 글과 강연](http://conal.net/)
