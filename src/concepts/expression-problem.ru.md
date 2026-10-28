<!-- reader: {"title":"Проблема выражения","sourceHash":"sha256:095010cccfe7dcb155f2ad304d334ffd7d3d56212b3b67168e4f5b04da397ee6"} -->

# Проблема выражения {#expression-problem}

```admonish tip title="Связанные материалы"
«Семантический взгляд»: [Денотационное проектирование](../denotational-design/design.md), [Денотации и композиционность](../denotational-design/denotations.md)  
«Проектирование на основе смысла в Rust»: [Алгебры возможностей](../rust-dd/capability-algebras.md), [Производный смысл и композиция](../rust-dd/derived-meaning.md)  
«Идеи»: [Проблема выражения: новый взгляд](../insights/expression-problem.md)
```

```admonish note title="Семантическое место"
Проблема выражения касается модульного расширения представлений и операций. Денотационное проектирование задаёт более ранний вопрос: какой семантический словарь и какие интерпретации вообще стоит представлять?
```

Проблема выражения, сформулированная Филом Уодлером, касается **одновременного** расширения языка по двум измерениям без изменения существующего кода:

*   **Добавление новых вариантов данных** (новых форм выражений, то есть «синтаксиса»).
*   **Добавление новых операций** (новых интерпретаций, то есть «семантики»).

Основное противоречие:

*   В **функциональном стиле/стиле ADT** легко добавлять операции, но добавление вариантов требует существенных изменений.
*   В **объектно-ориентированном стиле** легко добавлять варианты, но добавление операций требует существенных изменений.

В этом разделе обе стороны показаны на небольших примерах Haskell и Java.

## Haskell (функциональный стиль / ADT) {#haskell-functional--adt}

Начнём с классического ADT для выражений и двух операций.

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

Теперь легко **добавить новую операцию**:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

Но **добавление нового варианта** (например, `Mul`) требует изменить каждую функцию:

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

В терминологии Уодлера, в подходе ADT **расширение данных не является модульным**.

## Java (объектно-ориентированный стиль) {#java-object-oriented}

Начнём с интерфейса и конкретного класса для каждого варианта.

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

Теперь легко **добавить новый вариант**:

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

Но **добавление новой операции** (например, `size`) требует больших изменений. Нужно отредактировать интерфейс и каждый класс:

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

В терминологии Уодлера, в ОО-подходе **расширение операций не является модульным**.

## Итог (позиция Уодлера) {#summary-wadlers-point}

*   Функциональный стиль/ADT упрощает добавление **новых операций**, но затрудняет добавление **новых вариантов**.
*   ОО-стиль упрощает добавление **новых вариантов**, но затрудняет добавление **новых операций**.
*   Проблема выражения ставит вопрос о проектировании, при котором **оба** измерения расширяются без изменения существующего кода.

## Объяснение Уодлера и пространство решений (1998) {#wadlers-explanation-and-solution-landscape-1998}

Уодлер описывает задачу так: расширять тип данных **случаями** (новыми вариантами) и расширять **функции над этим типом данных**, *не перекомпилируя существующий код* и сохраняя **статическую типобезопасность** (без приведений типов).

Он использует метафору «таблицы»:

*   **Строки** — случаи (варианты / конструкторы)
*   **Столбцы** — функции (операции / интерпретации)

В **функциональном стиле/стиле ADT** строки фиксированы, а столбцы добавлять легко.  
В **ОО-подходе** столбцы фиксированы, а строки добавлять легко.  
Задача — сделать расширяемыми **оба направления**.

## Предложенное Уодлером решение (GJ и виртуальные типы) {#wadlers-proposed-solution-gj--virtual-types}

Уодлер предлагает решение на языке GJ (Generic Java), используя:

*   Параметр с ограничением вида `This` (`This extends LangF<This>`) для имитации **ThisType**.
*   **Внутренние классы и интерфейсы**, индексированные через `This` (виртуальные типы).
*   A visitor-based structure that allows:
    *   Новые случаи (например, `Plus`) добавляются наследованием от «семейства языка».
    *   Новые операции (например, `Show`) добавляются новыми посетителями.

Приём состоит в использовании `This.Exp` и `This.Visitor` таким образом, чтобы каждый этап расширения оставался типобезопасным и компилировался независимо.

### Ограничение (внутренние интерфейсы Java) {#caveat-java-inner-interfaces}

Уодлер отмечает, что Java считает внутренние интерфейсы **статическими**, что нарушает приём индексирования.  
Он предполагает, что снятие этого ограничения сделало бы решение применимым; в современной Java это не изменилось (вложенные интерфейсы по-прежнему неявно статические).

## Другие упомянутые направления решения {#other-solution-directions-mentioned}

1.  Подход Корки Картрайта Требует **контравариантного расширения**: базовый тип выражения должен подменять расширенный. Этим объясняется применение неподвижных точек: расширенное семейство языков *не* является подтипом исходного.
    
2.  Подход Кима Брюса Требует **конструкторов типов высшего порядка** (тип параметризуется конструктором типов). GJ не поддерживает это напрямую, но Уодлер утверждает, что виртуальные типы могут это имитировать.
    
3.  Кришнамурти и соавторы (расширенный паттерн Visitor) Используется расширенный паттерн Visitor. В их среде (Pizza) типизация **не статическая**, поэтому необходимы динамические приведения.
    
4.  Специализированные расширения языка Уодлер приводит два решения, основанных на возможностях, специально разработанных для этой задачи. Они менее универсальны, чем подход с виртуальными типами.
    

## Два положения Уодлера {#wadlers-two-points}

В письме Уодлера ясно сформулированы две мысли:

1.  Проблема выражения — это **структурное противоречие** между расширением данных и расширением операций.
2.  Solutions are possible, but they tend to require either:
    *   Возможности системы типов, имитирующие **виртуальные типы**, либо
    *   специализированные расширения языка, либо
    *   компромисс между статической типобезопасностью и независимой компиляцией.

## Решение на Featherweight Go (2020) {#featherweight-go-solution-2020}

Уодлер сформулировал проблему и дал ей название в 1998 году. Позднее Featherweight Go (FG) и его обобщённое расширение FGG (Featherweight Generic Go) предложили конкретное полностью статическое решение для языка в духе Go со структурными интерфейсами и обобщёнными типами.

В решении статьи (рис. 8, упрощённо) используются две структуры `Num` и `Plus` и две операции `Eval` и `String`:

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

Механизм:

*   **Обобщённое рекурсивное представление.** Дочерние элементы `Plus` имеют параметр типа `a` с единственным ограничением `Any`. Структура не привязана к одному закрытому интерфейсу, перечисляющему все операции, поэтому позднее можно добавлять новые операции.
*   **Ограничения для отдельных операций.** Объявление каждого метода независимо ограничивает `a`: `Plus(type a Evaler)` для `Eval` и `Plus(type a Stringer)` для `String`. Это опирается на *ковариантные получатели* в FGG: ограничение получателя метода может быть сильнее ограничения в объявлении типа.
*   **Структурные интерфейсы.** Структура реализует интерфейс, если у неё есть его методы, поэтому `Expr` можно ввести после `Num` и `Plus`, не изменяя их. Полный набор операций фиксируется лишь при создании значения (`Plus(Expr){...}`).

Новые случаи добавляются новыми структурами, а новые операции — интерфейсами и методами. Для этого не нужно менять или перекомпилировать существующие объявления и не требуются проверки типов во время выполнения.

## Источники {#references}

*   Уодлер, П. (1998). *The Expression Problem*. Заметка в списке рассылки Java-Genericity. Формулировка проблемы и введение названия.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Гриземер, Р., Ху, Р., Кокке, В., Ланге, Й., Тейлор, И. Л., Тониньо, Б., Уодлер, П. и Ёсида, Н. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Позднейшее конкретное решение на уровне языка, раздел 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
