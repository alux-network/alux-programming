<!-- reader: {"title":"참조 투명성"} -->

# 참조 투명성 {#referential-transparency}

```admonish tip title="관련 항목"
의미론적 관점: [표시와 합성성](../denotational-design/denotations.md), [법칙과 해석](../denotational-design/laws-and-interpretations.md)  
통찰: [참조 투명성 다시 보기](../insights/referential-transparency.md)
```

```admonish note title="의미론적 위치"
참조 투명성은 선택한 표시와 동등성에 따라 달라집니다. 식을 해당 표시로 바꿔도 명세된 의미가 보존된다면 치환할 수 있으며, 의미론적 경계 뒤에서 구현이 작동하는 방식은 달라도 됩니다.
```

참조 투명성(RT)은 표현식의 치환 속성입니다. 프로그램의 의미를 바꾸지 않고 표현식을 그 표시에 해당하는 값으로 대체할 수 있습니다.

오늘날 RT는 등식 추론, 안전한 리팩터링, 법칙 중심 API 설계의 토대로 실무에서 사용됩니다.

## 핵심 의미 {#core-meaning}

RT는 다음을 말합니다:

*   `e`가 `v`을 나타낸다면
*   `e` 대신 `v`를 사용해도 의미가 보존됩니다

이는 코딩 스타일의 구호가 아니라 의미론적 주장입니다.

### 순수성 {#purity}

순수 함수는 같은 입력에 항상 같은 출력을 반환하고 관찰 가능한 부작용이 없습니다. RT는 표현식의 치환 법칙으로, 표현식을 그 표시에 해당하는 값으로 바꿔도 의미가 보존되어야 합니다. 따라서 순수성은 실무에서 RT를 얻는 흔한 방법이고, RT는 더 넓은 의미론적 기준입니다. 표시적 설계에서 순수성과 RT를 구분하는 내용은 [참조 투명성 다시 보기](../insights/referential-transparency.md)를 참고하세요.

## 역사적 맥락 {#historical-context}

프로그래밍 언어 의미론에서 RT는 Christopher Strachey의 설명과 깊은 관련이 있습니다. 그의 논의는 값에 대한 추론과 갱신이 많은 동작을 구분합니다:

*   **R값**: 표현식의 값.
*   **L값**: 대입할 수 있는 위치.

핵심은 값에 대한 추론을 유지할 때 표현식 수준 치환이 안정적이라는 점입니다. 대입은 위치를 갱신하므로 치환 추론을 어렵게 하거나 단순한 형태에서는 무효로 만듭니다.

## 이 문맥에서 대입과 부작용의 의미 {#what-assignment-and-side-effects-mean-here}

이 문맥에서는 다음과 같습니다:

*   **대입**은 위치를 갱신합니다 (예: `x := x + 1`)
*   **부작용**은 값을 반환하는 것 외의 관찰 가능한 모든 변화입니다

대입은 특정 종류의 부작용입니다.

이 때문에 여러 명령형 환경에서 RT가 성립하지 않습니다. 평가가 표현식의 명시적 값 인터페이스 밖에 있는 관찰 가능한 컨텍스트에 의존하거나 이를 변경할 수 있습니다.

## 현대 언어에서 RT를 다루는 방식 {#how-modern-languages-present-rt}

### Haskell {#haskell}

RT는 순수 표현식의 기본 추론 방식으로 가르칩니다. 효과는 타입이 지정된 구성(`IO`, 상태 전달 및 관련 추상화)에 명시되므로 치환 법칙이 일상적인 사용의 핵심입니다.

### Scala (Cats/Cats Effect) {#scala-cats--cats-effect}

Scala 함수형 프로그래밍에서 Cats Effect는 가장 흔히 RT를 다음과 같이 설명합니다:

*   `IO[A]`는 효과가 있는 작업을 순수하게 기술합니다
*   `IO` 값의 합성은 참조 투명합니다
*   실행은 런타임 경계(`unsafeRun*`)에서 명시적으로 이루어집니다

Cats Effect는 이를 즉시 `Future` 평가와 대조합니다. 그래서 Scala의 RT 논의는 지연성과 실행 연기를 강조하기도 합니다.

## 오늘날의 RT {#rt-today}

현대의 여러 생태계에서 RT는 치환이 안전한 동작을 줄여 부르는 말로 사용됩니다. 여러 패러다임이 섞인 시스템에서는 보통 전체 코드에 일괄 적용하기보다 특정 모듈, API, 효과 타입 영역에 RT 주장을 적용합니다.

RT의 표시적 설계 관점은 [참조 투명성 다시 보기](../insights/referential-transparency.md)를 참고하세요.

## 참고 문헌 {#references}

*   Strachey, C. *프로그래밍 언어의 기본 개념* (Oxford PRG 강의 노트, 1967).  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Cats Effect 문서: `IO` 데이터 타입과 RT/지연 평가 설명.  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Typelevel 블로그: *Cats용 IO 모나드* (Scala의 부수성 대 RT 동기).  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
