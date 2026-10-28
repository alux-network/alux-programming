<!-- reader: {"title":"표현식 문제","sourceHash":"sha256:095010cccfe7dcb155f2ad304d334ffd7d3d56212b3b67168e4f5b04da397ee6"} -->

# 표현식 문제 {#expression-problem}

```admonish tip title="관련 항목"
의미론적 관점: [표시적 설계](../denotational-design/design.md), [표시와 합성성](../denotational-design/denotations.md)  
Rust에서 의미로 설계하기: [케이퍼빌리티 대수](../rust-dd/capability-algebras.md), [파생 의미와 합성](../rust-dd/derived-meaning.md)  
통찰: [표현식 문제 다시 보기](../insights/expression-problem.md)
```

```admonish note title="의미론적 위치"
표현식 문제는 표현과 연산을 모듈식으로 확장하는 문제입니다. 표시적 설계는 한 단계 앞선 질문을 던집니다. 어떤 의미 어휘와 해석을 애초에 표현할 가치가 있나요?
```

Phil Wadler의 표현식 문제는 기존 코드를 수정하지 않고 언어를 두 방향으로 **동시에** 확장하는 문제입니다:

*   **새 데이터 변형 추가** (새 표현식 형식, 즉 “구문”).
*   **새 연산 추가** (새 해석, 즉 “의미론”).

핵심적인 긴장 관계:

*   **함수형/ADT** 방식은 연산을 추가하기 쉽지만 변형 추가에는 많은 수정이 필요합니다.
*   **객체 지향** 방식은 변형을 추가하기 쉽지만 연산 추가에는 많은 수정이 필요합니다.

이 절에서는 작은 Haskell 및 Java 예시로 양쪽을 보여 줍니다.

## Haskell (함수형/ADT) {#haskell-functional--adt}

표현식과 연산 두 개를 위한 고전적인 ADT에서 시작하겠습니다.

```haskell
data Expr
  = Lit Int
  | Add Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
```

이제 **새 연산 추가**는 쉽습니다:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

하지만 **새 변형 추가** (예: `Mul`)를 하려면 모든 함수를 수정해야 합니다:

```haskell
data Expr
  = Lit Int
  | Add Expr Expr
  | Mul Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b
eval (Mul a b)   = eval a * eval b  -- ✏️ UPDATE: new case

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
pretty (Mul a b) = "(" ++ pretty a ++ " * " ++ pretty b ++ ")"  -- ✏️ UPDATE: new case

size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
size (Mul a b) = 1 + size a + size b  -- ✏️ UPDATE: new case
```

Wadler의 용어로 말하면 ADT 방식에서는 **데이터 확장이 모듈식이 아닙니다**.

## Java (객체 지향) {#java-object-oriented}

인터페이스와 각 변형의 구체 클래스로 시작하겠습니다.

```java
// Expression variants
interface Expr {
    int eval();
    String pretty();
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) {
        this.n = n;
    }

    public int eval() {
        return n;
    }

    public String pretty() {
        return Integer.toString(n);
    }
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() + b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " + " + b.pretty() + ")";
    }
}
```

이제 **새 변형 추가**는 쉽습니다:

```java
final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() * b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " * " + b.pretty() + ")";
    }
}
```

하지만 **새 연산 추가** (예: `size`)는 많은 수정을 요구합니다. 인터페이스와 모든 클래스를 수정해야 합니다:

```java
interface Expr {
    int eval();
    String pretty();
    int size(); // ✏️ UPDATE: new operation added here
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) { this.n = n; }

    public int eval() { return n; }
    public String pretty() { return Integer.toString(n); }
    public int size() { return 1; } // ✏️ UPDATE: new method in every class
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() + b.eval(); }
    public String pretty() { return "(" + a.pretty() + " + " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}

final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() * b.eval(); }
    public String pretty() { return "(" + a.pretty() + " * " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}
```

Wadler의 용어로 말하면 객체 지향 방식에서는 **연산 확장이 모듈식이 아닙니다**.

## 요약 (Wadler의 지적) {#summary-wadlers-point}

*   함수형/ADT 방식은 **새 연산**을 선호하지만 **새 변형**에는 약합니다.
*   객체 지향 방식은 **새 변형**을 선호하지만 **새 연산**에는 약합니다.
*   표현식 문제는 기존 코드를 수정하지 않고 **두** 방향을 모두 확장할 수 있는 설계를 찾습니다.

## Wadler의 설명과 해결책의 흐름 (1998) {#wadlers-explanation-and-solution-landscape-1998}

Wadler는 데이터형을 **사례별로** 확장하고 (새 변형), 그 데이터형에 대한 **함수도 확장하되** (새 연산), *기존 코드를 재컴파일하지 않고* **정적 타입 안전성**(캐스트 없음)을 유지하는 문제로 설명합니다.

그는 “표”라는 비유를 사용합니다:

*   **행** = 사례 (변형/생성자)
*   **열** = 함수 (연산/해석)

**함수형/ADT** 환경에서는 행이 고정되고 열을 쉽게 추가할 수 있습니다.  
**객체 지향** 환경에서는 열이 고정되고 행을 쉽게 추가할 수 있습니다.  
과제는 **양쪽**을 모두 확장 가능하게 만드는 것입니다.

## Wadler의 제안 (GJ + 가상 타입) {#wadlers-proposed-solution-gj--virtual-types}

Wadler는 GJ (Generic Java)에서 다음을 이용한 해결책을 제시합니다:

*   `This`로 제한된 매개변수(`This extends LangF<This>`)로 **ThisType**을 모사합니다.
*   **`This`(가상 타입)으로 색인된 내부 클래스와 인터페이스**.
*   A visitor-based structure that allows:
    *   “언어 계열”을 서브클래싱해 새 사례 추가 (예: `Plus`)
    *   새 방문자를 추가해 새 연산 추가 (예: `Show`)

각 확장 단계가 타입 안전성을 유지하고 독립적으로 컴파일되도록 `This.Exp`와 `This.Visitor`를 참조하는 것이 핵심입니다.

### 주의 (Java 내부 인터페이스) {#caveat-java-inner-interfaces}

Wadler는 Java가 내부 인터페이스를 **정적**으로 취급하여 색인화 기법을 깨뜨린다고 지적합니다.  
이 제한을 완화하면 해결책이 가능해질 것이라고 제안했지만, 현대 Java에서도 달라지지 않았습니다(중첩 인터페이스는 여전히 암묵적으로 정적입니다).

## 언급된 다른 해결 방향 {#other-solution-directions-mentioned}

1.  Corky Cartwright의 접근법 **반공변 확장**이 필요합니다. 기본 표현식 타입이 확장된 타입을 대신할 수 있게 합니다. 이것이 고정점을 사용하는 이유를 설명합니다. 확장된 언어 계열은 원래 타입의 서브타입이 *아닙니다*.
    
2.  Kim Bruce의 접근법 **고차 타입 생성자**(타입 생성자를 인수로 받는 타입)가 필요합니다. GJ는 이를 직접 지원하지 않지만 Wadler는 가상 타입으로 모사할 수 있다고 주장합니다.
    
3.  Krishnamurthi 외 (확장 방문자 패턴) 확장 방문자 설계로 동작합니다. 그들의 환경(Pizza)에서는 **정적 타입 검사를 받지 않으므로** 동적 캐스트가 필요합니다.
    
4.  특수 목적 언어 확장 Wadler는 이 문제를 위해 특별히 설계된 언어 기능에 의존하는 해결책 두 가지를 소개합니다. 가상 타입 접근법보다 일반성이 낮습니다.
    

## Wadler가 강조한 두 가지 {#wadlers-two-points}

Wadler의 이메일에서는 두 가지 점이 분명합니다:

1.  표현식 문제는 데이터 확장과 연산 확장 사이의 **구조적 긴장 관계**입니다.
2.  Solutions are possible, but they tend to require either:
    *   **가상 타입**을 모사하는 타입 시스템 기능, 또는
    *   특수 목적 언어 확장, 또는
    *   정적 타입 안전성이나 독립 컴파일을 일부 포기하는 방법이 필요합니다.

## Featherweight Go 해결책 (2020) {#featherweight-go-solution-2020}

Wadler는 1998년에 문제를 정식화하고 이름 붙였습니다. 이후 Featherweight Go(FG)와 제네릭 확장인 FGG(Featherweight Generic Go)는 구조적 인터페이스와 제네릭을 갖춘 Go 계열 언어에서 구체적이고 완전한 정적 해결책을 제시했습니다.

논문의 해결책(그림 8, 단순화)은 구조 `Num`와 `Plus`, 연산 `Eval`와 `String`을 사용합니다:

```go
type Evaler interface { Eval() int }
type Stringer interface { String() string }

type Num struct { value int }
type Plus(type a Any) struct { left a; right a }

func (e Num) Eval() int { return e.value }
func (e Plus(type a Evaler)) Eval() int { return e.left.Eval() + e.right.Eval() }

func (e Num) String() string { return fmt.Sprintf("%d", e.value) }
func (e Plus(type a Stringer)) String() string {
    return fmt.Sprintf("(%s+%s)", e.left.String(), e.right.String())
}

type Expr interface { Evaler; Stringer }

var e Expr = Plus(Expr){Num{1}, Num{2}}
```

기제:

*   **제네릭 재귀 표현.** `Plus`의 자식은 `Any`만을 바운드로 갖는 타입 매개변수 `a`을 사용합니다. 구조는 가능한 모든 연산을 나열하는 하나의 닫힌 인터페이스에 묶이지 않으므로 이후 연산을 추가할 수 있습니다.
*   **연산별 제약.** 각 메서드 선언은 `a`을 독립적으로 제한합니다. `Eval`에는 `Plus(type a Evaler)`을, `String`에는 `Plus(type a Stringer)`을 사용합니다. 이는 FGG의 *공변 수신자*에 의존합니다. 메서드의 수신자 바운드가 타입 선언의 바운드보다 강할 수 있습니다.
*   **구조적 인터페이스.** 구조는 필요한 메서드를 갖추면 인터페이스를 구현하므로, `Num`과 `Plus`를 수정하지 않고도 `Expr`를 나중에 도입할 수 있습니다. 전체 연산 집합은 값이 만들어질 때에만 고정됩니다(`Plus(Expr){...}`).

새 사례는 새 구조가 되고, 새 연산은 새 인터페이스와 메서드가 됩니다. 기존 선언을 변경하거나 재컴파일할 필요가 없으며, 타입 단언도 필요하지 않습니다.

## 참고 문헌 {#references}

*   Wadler, P. (1998). *The Expression Problem*. Java-Genericity 메일링 리스트 문서. 문제의 정식화와 명명.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P., Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). 후속 언어의 구체적 해결책, 2.3절.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
