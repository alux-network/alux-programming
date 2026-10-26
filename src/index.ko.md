<!-- reader: {"title":"ALUX 프로그래밍","parts":{"Welcome":"환영합니다","The Semantic View":"의미론적 관점","Design by Meaning in Rust":"Rust에서 의미 중심 설계","Concepts":"개념","Insights":"통찰","Contributing":"기여하기"},"sourceHash":"sha256:801d6c5e7d3e5862395c094158caadb1df71cec65054c97d146882cf39bd00dc"} -->

```admonish warning title="ALUX 프로젝트"
ALUX 코드베이스는 현재 활발히 개발 중이며 아직 공개되지 않았습니다.
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; width: 60px;"> ALUX 프로그래밍 지침 {#alux-programming-guidelines}

```admonish note title="참고"
이 책은 프로그램이 어떻게 작동하는지를 정하기 전에 무엇을 의미하는지 정의한다는 [표시적 설계](denotational-design/design.md)의 핵심 원칙에서 출발해, 의미를 우선하는 ALUX 코드베이스를 이해하고 기여하는 데 필요한 토대를 다룹니다.

Conal Elliott의 관점을 따라, 계산을 불투명한 단계의 나열이 아니라 명확한 수학적 대상으로 다룹니다.

명세는 프로그램이 *무엇을* 의미하는지 설명하는 단순하고 합성 가능한 [케이퍼빌리티 트레이트](rust-dd/capability-algebras.md)로 표현합니다. [인터프리터](rust-dd/interpreters.md)는 그러한 의미를 *실현하는* 상호 교환 가능한 방법을 제공합니다.

그 결과, 합성 규칙과 구현 의무, [유효한 등식](denotational-design/laws-and-interpretations.md)을 더 쉽게 파악하고 시험할 수 있는 소프트웨어가 만들어집니다.
```

```admonish quote title="구현 장치와 의미"
[개념](concepts/index.md)과 [통찰](insights/index.md)은 유용한 프로그래밍 장치를 설명합니다. [표시적 설계](denotational-design/design.md)는 어떤 장치가 무엇을 보존해야 하는지 결정하는 방법을 설명합니다.
```

## 이 책 읽는 법 {#how-to-read-this-book}

이 책은 세 층위로 읽으세요:

*   [**의미론적 관점**](denotational-design/semantic-view.md)에서는 [표시와 합성성](denotational-design/denotations.md), [법칙과 해석](denotational-design/laws-and-interpretations.md), 의미와 표현 사이의 관계를 소개합니다.
*   [**Rust에서 의미로 설계하기**](rust-dd/capability-algebras.md)에서는 그 관점을 [작은 케이퍼빌리티](rust-dd/capability-algebras.md), [파생 확장](rust-dd/derived-meaning.md), [일차 프로그램](rust-dd/first-order-programs.md), [얇은 인터프리터](rust-dd/interpreters.md)로 구체화합니다.
*   [**개념**](concepts/index.md)과 [**통찰**](insights/index.md)은 중요한 실행 모델, 인코딩, 변환, 연관성을 설명합니다.

의미론적 원칙은 특정 언어에 종속되지 않습니다. 주요 구현 언어는 Rust이며, [동시성 언어 파이프라인](rust-dd/compiler-pipelines.md)이 이 원칙들을 Tolang과 연결합니다.

## 이 책의 대상 독자 {#who-this-book-is-for}

*   소프트웨어가 발전하는 동안에도 복잡한 소프트웨어를 **모듈화하고, 합성 가능하며, 테스트하고 유지보수할 수 있는** 상태로 두고 싶은 프로그래머.
*   **범주론, 타입 시스템, 프로그램 설계를 연결**하려는 개발자.
*   [**자유 모나드**](concepts/free_monad.md), [**연속 전달 스타일(CPS)**](concepts/cps.md), [**디펑셔널라이제이션**](concepts/defunctionalization.md) 같은 표현 및 실행 기법에 익숙하며, 그러한 장치가 의미 우선 설계를 정의하는 것이 아니라 어떻게 뒷받침하는지 알고 싶은 독자.
*   [**종속 타입**](denotational-design/dependent-types.md)과 증명 중심 프로그래밍에 익숙하고, 고성능 Rust를 작성하면서 그 사고방식을 적용하려는 독자.
*   [의미 우선 Rust 명세](rust-dd/capability-algebras.md)를 읽고, 동시성 언어의 정의를 컴파일러에 맡기지 않으면서도 [동시성 언어를 컴파일하는 방법](rust-dd/compiler-pipelines.md)을 이해해야 하는 기여자.
