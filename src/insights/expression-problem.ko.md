<!-- reader: {"title":"표현식 문제 다시 보기","sourceHash":"sha256:4700e3db9f897416ecd8effa743648b9f65fe37268af14187948ecf790df44fe"} -->

# 표현식 문제 다시 보기 {#expression-problem-reloaded}

```admonish tip title="관련 항목"
의미론적 관점: [표시적 설계](../denotational-design/design.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](../rust-dd/capability-algebras.md), [파생 의미와 합성](../rust-dd/derived-meaning.md), [인터프리터와 효과](../rust-dd/interpreters.md)  
개념: [표현식 문제](../concepts/expression-problem.md)
```

이 페이지에서는 *표현식 문제*에 대한 실용적인 트레이트 기반 해결책을 소개합니다. 기존 코드를 반복해서 다시 쓰지 않고 표현식 형식과 연산을 어떻게 추가할 수 있을까요? 이 해결책은 설계 면에서 **Conal식**이고 인코딩 면에서 **태그리스 파이널/객체 대수** 방식입니다. 구체적으로는 합성 의미를 먼저 명세하고(작은 케이퍼빌리티 인터페이스와 확장 수준의 프로그램 명세), 그다음 구체 인터프리터를 제공합니다. 구체 인코딩은 Oleg Kiselyov의 **태그리스 파이널** 방식 및 **객체 대수**와 같은 계열입니다. 생성자 인터페이스(`LitAlg`, `AddAlg`, `MulAlg`)가 언어 시그니처를 정의하고, 프로그램은 그 인터페이스에 대해 다형적으로 작성되며, 구체 구현(`Eval` 또는 `Pretty` 등)이 해석을 제공합니다. 이 방식은 닫힌 AST 하나에 고정하지 않으면서 두 차원에서 정적 타입과 확장성을 유지합니다.

Oleg의 접근은 명시적으로 표시적입니다. 먼저 합성 의미를 부여하고 효과 및 인터프리터를 모듈식 의미 계층으로 실현합니다. 표현식 문제에서 표시적 설계와 정렬되는 것은 우연이 아니라 당연합니다. Conal의 표시적 설계 정식화도 같은 우선순위를 분명히 합니다. 의미를 합성적으로 먼저 명세하고 구체 실행 전략은 부차적이고 교체 가능한 것으로 취급합니다.

표현식 언어 예에서 이 인코딩은 다음을 뜻합니다:

*   **생성자 어휘**는 작고 독립적인 대수 트레이트로 모델링합니다.
*   **해석**은 이러한 트레이트의 구현입니다.
*   새 구문을 추가할 때 새 트레이트를 만들고 기존 코드는 그대로 둡니다.
*   새 의미론을 추가할 때 새 인터프리터 타입을 만들고 기존 코드는 그대로 둡니다.

`lit`와 `add`은 특권 AST의 생성자가 아니라 의미론적 연산입니다. AST는 여러 해석 중 하나입니다.

```admonish example title="C#의 객체 대수"
이 인코딩은 Rust에만 국한되지 않습니다. [`object-algebras`](https://github.com/tgrospic/object-algebras)에서는 C#으로 이 패턴을 발전시키고 여기서 사용하는 고정 기반 집합을 넘어섭니다. 이 페이지에서 각 인터프리터는 일반 타입인 구체적인 `Self::Expr` 하나를 선택합니다. C# 대수는 대신 타입 *생성자* `F` — `FunctorAlg<F>`, `MonadAlg<F>`, `BankingDsl<F>` — 를 추상화하고, 사용할 수 없는 `F<a>` 대신 결과를 `App<F, a>`로 전달합니다.

C#에는 일급 고차 종류 타입이 없으므로 `App<F, a>`가 애플리케이션 `F(a)`을 대신하고, 주입/투영 래퍼를 통해 되찾습니다. 이 `App` 기법이 바로 [디펑셔널라이제이션](../concepts/defunctionalization.md)입니다. 언어로 표현할 수 없는 추상화가 일차 데이터가 되어 필요할 때 적용됩니다. Rust도 일급 고차 종류 타입이 없으므로 같은 한계에 부딪힙니다.
```

## 작은 구문 케이퍼빌리티 명세하기 {#specify-tiny-syntax-capabilities}

각 생성자는 작은 트레이트가 됩니다. 이것이 <strong>명세(spec)</strong>입니다.

```rust,noplayground
trait LitAlg {
    type Expr;

    fn lit(&self, n: i64) -> Self::Expr;
}

trait AddAlg {
    type Expr;

    fn add(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}
```

프로그램은 대수 트레이트에 대한 **확장**으로 작성합니다. 이 확장도 명세의 일부이며 작은 명세를 재사용 가능한 프로그램 수준 명세로 합성합니다:

```rust,noplayground
#[ext(name = ExprPrograms)]
impl<This> This
where
    This: LitAlg + AddAlg,
{
    fn expr_basic(&self) -> This::Expr {
        self.add(self.lit(2), self.lit(3))
    }
}
```

`#[ext(...)]`는 [`extend` 크레이트의 매크로입니다](https://docs.rs/extend/latest/extend/). `impl` 블록에서 확장 메서드를 생성해 상용구를 줄이며, 새로운 Rust 언어 기능은 아닙니다.

## 새 해석 추가 {#add-new-interpretation}

인터프리터가 명세를 구현합니다. 구문을 바꿀 필요는 없습니다.

```rust,noplayground
struct Eval;

impl LitAlg for Eval {
    type Expr = i64;

    fn lit(&self, n: i64) -> i64 { n }
}

impl AddAlg for Eval {
    type Expr = i64;

    fn add(&self, a: i64, b: i64) -> i64 { a + b }
}

struct Pretty;

impl LitAlg for Pretty {
    type Expr = String;

    fn lit(&self, n: i64) -> String { n.to_string() }
}

impl AddAlg for Pretty {
    type Expr = String;

    fn add(&self, a: String, b: String) -> String {
        format!("({a} + {b})")
    }
}
```

이제 같은 표현식을 여러 방식으로 해석할 수 있습니다:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## 새 구문 추가 (새 케이퍼빌리티 트레이트) {#add-new-syntax-new-capability-trait}

`Mul`를 추가하려면 새 트레이트를 정의하세요. 기존 코드는 그대로 둡니다.

```rust,noplayground
trait MulAlg {
    type Expr;

    fn mul(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}

#[ext(name = ExprProgramsMul)]
impl<This> This
where
    This: LitAlg + AddAlg + MulAlg,
{
    fn expr_with_mul(&self) -> This::Expr {
        self.mul(self.add(self.lit(2), self.lit(3)), self.lit(4))
    }
}
```

기존 인터프리터는 예전 표현식에서 계속 작동합니다.  
새 구문도 지원하려면 새 트레이트를 구현합니다:

```rust,noplayground
impl MulAlg for Eval {
    type Expr = i64;

    fn mul(&self, a: i64, b: i64) -> i64 { a * b }
}

impl MulAlg for Pretty {
    type Expr = String;

    fn mul(&self, a: String, b: String) -> String {
        format!("({a} * {b})")
    }
}
```

## 이것이 표현식 문제를 해결하는 이유 {#why-this-solves-the-expression-problem}

전통적인 표현식 문제에는 표현을 기준으로 두 축이 있습니다:

*   새 변형(사례) 추가
*   새 연산 추가

표시적 설계는 축을 다시 설명합니다:

*   **의미 어휘 확장**: 새 케이퍼빌리티 트레이트(`MulAlg`)를 정의합니다.
*   **그 어휘에 대한 새 해석 추가**: 새 인터프리터 타입(`Eval`, `Pretty`, AST 빌더, 코드 생성기)을 정의합니다.

두 축은 독립적으로 합성됩니다:

*   새 케이퍼빌리티가 필요하지 않다면 기존 프로그램을 바꿀 필요가 없습니다. `expr_basic`는 여전히 `LitAlg + AddAlg`만 요구합니다.
*   새 케이퍼빌리티를 해석하기로 하지 않는 한 기존 인터프리터를 바꾸지 않아도 됩니다. `impl MulAlg`가 없는 `Eval`도 `mul`를 사용하지 않는 모든 프로그램을 계속 실행합니다.

구현 행렬이 사라지는 것은 아닙니다. `Eval`와 `Pretty`가 모두 `mul`를 해석해야 한다면 둘 다 `impl MulAlg`가 필요합니다. 달라지는 점은 행렬을 구성하는 방식입니다. 각 칸이 *의미 연산 × 해석*이며 특권 표현을 중심으로 구성된 칸이 없고, 각 프로그램은 사용하는 케이퍼빌리티에만 의존합니다.

## 법칙은 명세에 속합니다 {#laws-belong-to-the-specification}

의미론적 대수는 기반 집합, 연산, 법칙으로 이루어집니다. 기반 집합(`type Expr`)은 해석이 선택하지만 연산과 법칙은 명세에 속합니다. 예를 들어 산술의 의미인 `LitAlg + AddAlg`은 다음을 명시합니다:

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval`는 이 법칙을 만족합니다. `Pretty`는 만족하지 않습니다. `"(2 + 3)"`는 `"5"`이 아닙니다. 둘 다 구문 시그니처의 유효한 인터프리터지만, `Eval`만 산술 명세의 모델입니다. 법칙은 트레이트를 대상으로 한 번 명시하여 어떤 인터프리터가 적합한지 결정합니다. 어느 인터프리터도 법칙을 소유하지 않습니다.

## 마지막 통찰: Featherweight Go와 표시적 설계 {#final-insight-featherweight-go-vs-denotational-design}

Wadler는 정적 타입과 모듈식 확장에서 행과 열의 문제로 언어 기제 수준의 표현식 문제를 진단했습니다. [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020)는 구체적인 해결책을 제공합니다. `Plus(type a Any)`로 재귀 표현을 제네릭하게 유지하고 각 연산은 `a`을 독립적으로 제한합니다(`Eval`에는 `Plus(type a Evaler)`, `String`에는 `Plus(type a Stringer)`). 표현이 닫힌 표현식 인터페이스 하나에 묶이지 않으므로 두 축이 모두 열려 있습니다.

전통적인 해결책은 표현에서 시작해 확장 두 축을 모두 열어 두는 방법을 묻습니다. Featherweight Go는 재귀 표현을 제네릭하고 구조적으로 확장 가능하게 만들어 놀라울 만큼 멀리 나아갑니다. 표시적 설계는 경계를 한 단계 더 앞당깁니다. 표현이 모델은 아닙니다. 모델은 대수와 그 법칙이며 표현은 가능한 해석 중 하나입니다.

**Featherweight Go는 표현을 확장 가능하게 합니다. 표시적 설계는 표현을 선택 사항으로 만듭니다.**

|  | Featherweight Go | 표시적 설계 |
| --- | --- | --- |
| 의미의 중심 | 확장 가능한 표현 | 대수와 법칙 |
| `Num`/`Plus`, `lit`/`add` | 구조 (표현 형식) | 의미론적 연산 |
| `Eval`, `String`/`Pretty` | 메서드와 인터페이스 | 해석 |
| 재귀 구조 | 제네릭하고 열린 표현 (`Plus(a)`) | 필요 없음 |
| 기반 집합 | 표현된 표현식 타입 | 인터프리터가 선택 (`type Expr`) |
| AST | 표현이 계속 중심에 있음 | 선택 사항이며 여러 해석 중 하나 |
| 행렬의 한 칸 | 사례 × 연산 → 메서드 | 의미론적 연산 × 해석 → `impl` |
| 새 동작 | 메서드와 인터페이스 추가 | 케이퍼빌리티 추가 또는 합성 |
| 새 구현 | 새 구조적 실현 | 새 인터프리터 |

Wadler는 표현의 두 축을 확장하는 법을 묻습니다. 표시적 설계는 왜 표현이 어느 축이든 소유해야 하는지 묻습니다.

합성 가능한 의미를 먼저 정의하고 인코딩을 선택하세요. 그러면 표현식 문제는 개념적 교착 상태가 아니라 인코딩 사이에서 내리는 엔지니어링 선택이 됩니다.

**언어의 의미는 기계라는 개념과 독립적이어야 합니다.**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>언어의 의미는 기계와 독립적이어야 합니다</figcaption></figure>

## 참고 문헌 {#references}

*   Elliott, C. *Denotational design with type class morphisms*.  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *Compiling to categories*.  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *Tagless-final style* (파이널 인코딩 및 확장 가능한 타입 인터프리터에 관한 개요, 튜토리얼, 논문).  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *Having an Effect* (효과와 확장 가능한 인터프리터에 대한 정의적/표시적 관점).  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P., Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). 2.3절에서 위와 비교한 제네릭 구조적 해결책을 설명합니다.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S., Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
