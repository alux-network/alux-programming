<!-- reader: {"title":"참조 투명성 다시 보기"} -->

# 참조 투명성 다시 보기 {#referential-transparency-reloaded}

```admonish tip title="관련 항목"
의미론적 관점: [표시와 합성성](../denotational-design/denotations.md), [법칙과 해석](../denotational-design/laws-and-interpretations.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](../rust-dd/capability-algebras.md), [파생 의미와 합성](../rust-dd/derived-meaning.md)  
개념: [참조 투명성](../concepts/referential_transparency.md)
```

이 페이지에서는 *참조 투명성*을 표시적 설계 관점에서 설명합니다. 개념 페이지에서는 역사와 주류 언어에서의 사용을 다룹니다. 여기서는 RT가 설계 제약으로서 무엇을 의미하는지 살펴봅니다.

표시적 설계에서 RT는 순수성이라는 꼬리표가 아닙니다. 표시에 관한 법칙입니다. 치환해도 명세된 의미가 보존되어야 합니다.

## RT를 표시적 설계 관점에서 다시 서술하기 {#denotational-design-restatement-of-rt}

표시적 설계는 RT를 구현 스타일이 아니라 명세의 요구 사항으로 다시 서술합니다. 명세는 합성 의미를 먼저 정의해야 하며 실행 전략은 나중에 선택합니다.

그러므로 RT는 의미론적 경계에서 확인합니다:

*   같은 입력
*   같다고 선언된 컨텍스트
*   같은 표시

이 조건이 성립하면 치환이 유효하고 등식 추론이 가능합니다. 구체적 인터프리터가 IO, 동시성, 재시도, 상태 전이를 수행하더라도 명세된 케이퍼빌리티 뒤에 위임되므로 이 원칙은 그대로 적용됩니다.

다시 말해 표시적 설계는 “이 구현이 순수한가?”라고 묻지 않습니다. 표시적 설계가 묻는 것은 “표시 등식이 명시되어 있고 인터프리터가 이를 보존하는가?”입니다.

## 순수성과 RT {#purity-and-rt}

RT와 순수성은 관련은 있지만 동일하지 않습니다.

*   **RT**는 의미에 관한 치환 법칙입니다.
*   **순수성**은 숨겨진 관찰 가능 효과가 없어야 한다는 작동 제약입니다.

표현식 수준 코드에서 RT를 얻는 흔한 방법이 순수성입니다. 그러나 RT는 여전히 의미론적 기준입니다. 치환해도 명세된 표시가 보존되어야 합니다.

따라서 표시적 설계는 RT를 “순수 코드만” 같은 스타일 꼬리표로 만들지 않습니다. 효과를 케이퍼빌리티 경계 뒤에 분리하고 명시적인 의미 등식을 요구합니다.

최소한의 의미론적 해석은 다음과 같습니다:

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

같은 `a`와 같은 `io` 입력에 대해 `f`는 같은 `(result, io')`을 산출합니다. 이는 컨텍스트로 색인한 표시적 설계 방식의 치환 추론입니다.

## 이 설명이 RT를 명확히 하는 이유 {#why-this-clarifies-rt}

많은 RT 논의는 유용한 구분을 흐립니다:

*   의미의 투명성
*   작동상의 부작용

표시적 설계는 이 계층을 구분합니다:

*   의미론적 핵심이 의미를 명시합니다
*   인터프리터가 실행 전략을 실현합니다

이 분리 덕분에 법칙 기반 추론을 잃지 않고 실제 효과를 사용할 수 있습니다.

## 표현 우선 설계의 실패 유형 {#representation-first-failure-mode}

구체적인 표현을 일찍 확정하면 RT 논의가 스타일 논쟁으로 흐릅니다:

*   “이 스타일은 순수하다”
*   “저 스타일은 불순하다”
*   “IO 래퍼로 해결된다”

이는 대부분 인코딩에 관한 논쟁입니다. 표시적 설계는 더 간단하게 묻습니다: 명세에서 어떤 등식이 유효한가요?

## 실용적인 표시적 설계 패턴 {#practical-dd-pattern}

작은 케이퍼빌리티 트레이트를 정의하고 프로그램 동작을 그 트레이트의 확장으로 작성합니다. 그런 다음 얇은 구체 인터프리터를 제공합니다.

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]`는 [`extend` 크레이트의 매크로입니다](https://docs.rs/extend/latest/extend/). `impl` 블록에서 확장 메서드를 생성해 상용구를 줄이며, 새로운 Rust 언어 기능은 아닙니다.

Scala 함수형 프로그래밍에서는 RT를 `F[A]` 타입의 값(예: `IO[A]` 또는 `F[Either[E, A]]`)을 통해 설명하는 경우가 많습니다. 여기서는 한 수준 위에서 케이퍼빌리티로 제한된 프로그램 의미로 RT를 표현합니다. 그러므로 이 Rust 메서드는 `F[A]`와 같은 인코딩 의미의 RT 값 컨테이너가 아닙니다. 명시적 케이퍼빌리티에 대해 명세된 RT 동작이며 구체 효과는 구현에 위임합니다.

확장은 케이퍼빌리티에 따른 의미 동작을 명시합니다. 구체 구현은 일괄 처리, 재시도, 전송, 병렬성, 저장 세부 사항 등 실행 전략을 결정합니다.

## 마지막 통찰 {#final-insight}

표시적 설계에서 RT는 의미론적 명세의 속성입니다. 명시된 표시 법칙을 보존한다면 구현 선택은 부차적입니다.

법칙을 유지하세요. 꼬리표에 매이지 마세요.
