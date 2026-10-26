<!-- reader: {"title":"Проблема виразів"} -->

# Проблема виразів {#expression-problem}

```admonish tip title="Пов’язані матеріали"
Семантичний погляд: [Денотаційне проєктування](../denotational-design/design.md), [Денотації та композиційність](../denotational-design/denotations.md)  
Проєктування від значення в Rust: [Алгебри можливостей](../rust-dd/capability-algebras.md), [Похідне значення та композиція](../rust-dd/derived-meaning.md)  
Інсайти: [Проблема виразів: новий погляд](../insights/expression-problem.md)
```

```admonish note title="Семантичне місце"
Проблема виразів стосується модульного розширення представлень і операцій. Денотаційне проєктування порушує попереднє запитання: яку семантичну термінологію та які інтерпретації взагалі варто представляти?
```

Проблема виразів Філа Ведлера стосується **одночасного** розширення мови у двох вимірах без зміни наявного коду:

*   **Додавати нові варіанти даних** (нові форми виразів, тобто «синтаксис»).
*   **Додавати нові операції** (нові інтерпретації, тобто «семантику»).

Основна суперечність:

*   У **функційному стилі / ADT** легко додавати нові операції, але додавання варіантів потребує втручання.
*   В **об’єктно-орієнтованому стилі** легко додавати нові варіанти, але додавання операцій потребує втручання.

У цьому розділі обидва боки показано на невеликих прикладах Haskell і Java.

## Haskell (функційний стиль / ADT) {#haskell-functional--adt}

Почнімо з класичного ADT для виразів і двох операцій.

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

Тепер **додати нову операцію** легко:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

Але **додавання нового варіанта**, наприклад `Mul`, змушує змінювати кожну функцію:

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

За формулюванням Ведлера, у підході ADT **розширення даних не є модульним**.

## Java (об’єктно-орієнтований стиль) {#java-object-oriented}

Почнімо з інтерфейсу й конкретних класів для кожного варіанта.

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

Тепер **додати новий варіант** легко:

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

Але **додавання нової операції**, наприклад `size`, потребує втручання. Потрібно змінити інтерфейс і кожен клас:

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

За формулюванням Ведлера, у підході OO **розширення операцій не є модульним**.

## Підсумок (думка Ведлера) {#summary-wadlers-point}

*   Функційний стиль / ADT сприяє **новим операціям**, але протистоїть **новим варіантам**.
*   OO-стиль сприяє **новим варіантам**, але протистоїть **новим операціям**.
*   Проблема виразів запитує, як спроєктувати систему, у якій **обидва** виміри можна розширювати без зміни наявного коду.

## Пояснення Ведлера та огляд можливих рішень (1998) {#wadlers-explanation-and-solution-landscape-1998}

Ведлер формулює проблему так: розширювати тип даних **додаванням варіантів** і розширювати **функції над цим типом** новими операціями, *не перекомпілюючи наявний код* і зберігаючи **статичну типобезпеку** (без приведень типів).

Він використовує метафору «таблиці»:

*   **Рядки** = випадки (варіанти / конструктори)
*   **Стовпці** = функції (операції / інтерпретації)

**У** функційному стилі / ADT рядки фіксовані, а стовпці легко додавати.  
У **OO**\-стилі фіксовані стовпці, а рядки легко додавати.  
Завдання полягає в тому, щоб розширювати **обидва напрямки**.

## Запропоноване Ведлером рішення (GJ + віртуальні типи) {#wadlers-proposed-solution-gj--virtual-types}

Ведлер пропонує рішення в GJ (Generic Java), використовуючи:

*   Параметр з обмеженням `This` (`This extends LangF<This>`) для імітації **ThisType**.
*   **Внутрішні класи й інтерфейси**, індексовані через `This` (віртуальні типи).
*   A visitor-based structure that allows:
    *   Нові випадки, наприклад `Plus`, додаються успадкуванням від «сімейства мови».
    *   Нові операції, наприклад `Show`, додаються як нові відвідувачі.

Трюк полягає в посиланнях на `This.Exp` та `This.Visitor`, завдяки яким кожен етап розширення залишається типобезпечним і компілюється незалежно.

### Застереження (внутрішні інтерфейси Java) {#caveat-java-inner-interfaces}

Ведлер зауважує, що Java вважає внутрішні інтерфейси **статичними**, через що трюк з індексуванням не працює.  
Він припускає, що послаблення цього обмеження зробило б рішення придатним, але в сучасній Java його досі не змінили (вкладені інтерфейси залишаються неявно статичними).

## Інші згадані напрямки розв’язання {#other-solution-directions-mentioned}

1.  Підхід Коркі Картрайта Потребує **контраваріантного розширення**: базовий тип виразу має бути прийнятним замість розширеного. Це пояснює використання нерухомих точок: розширене сімейство мов *не* є підтипом початкового.
    
2.  Підхід Кіма Брюса Потребує **конструкторів типів вищого порядку** (параметризації типу конструктором типів). GJ не підтримує це безпосередньо, але Ведлер стверджує, що віртуальні типи можуть імітувати таку можливість.
    
3.  Підхід Крішнамурті та співавторів (розширений патерн Visitor) Використовує розширений патерн Visitor. У їхній системі (Pizza) **немає статичної типізації**, тому потрібні динамічні приведення типів.
    
4.  Спеціалізовані розширення мови Ведлер згадує два рішення, що спираються на функції мови, створені саме для цієї проблеми. Вони менш універсальні за підхід із віртуальними типами.
    

## Дві тези Ведлера {#wadlers-two-points}

З листа Ведлера чітко випливають дві тези:

1.  Проблема виразів — це **структурна суперечність** між розширенням даних і розширенням операцій.
2.  Solutions are possible, but they tend to require either:
    *   Функції системи типів, що імітують **віртуальні типи**, або
    *   спеціалізовані розширення мови, або
    *   компроміс щодо статичної типобезпеки чи незалежної компіляції.

## Рішення Featherweight Go (2020) {#featherweight-go-solution-2020}

Ведлер сформулював проблему й дав їй назву 1998 року. Пізніше Featherweight Go (FG) та його узагальнене розширення FGG (Featherweight Generic Go) запропонували конкретне повністю статичне рішення для мови на кшталт Go зі структурними інтерфейсами й узагальненнями.

У статті описано спрощене рішення (рис. 8) із двома структурами, `Num` та `Plus`, і двома операціями, `Eval` та `String`:

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

Механізм:

*   **Узагальнене рекурсивне представлення.** Дочірні елементи `Plus` мають параметр типу `a`, обмежений лише `Any`. Структура не прив’язана до одного закритого інтерфейсу, де перелічено всі операції, тож можна додавати нові.
*   **Обмеження для окремих операцій.** Кожне оголошення методу незалежно обмежує `a`: `Plus(type a Evaler)` для `Eval` і `Plus(type a Stringer)` для `String`. Це спирається на *коваріантні отримувачі* у FGG: обмеження отримувача методу може бути сильнішим за обмеження в оголошенні типу.
*   **Структурні інтерфейси.** Структура реалізує інтерфейс, якщо має потрібні методи, тож `Expr` можна оголосити після `Num` і `Plus`, не змінюючи їх. Повний набір операцій фіксується лише там, де створюють значення (`Plus(Expr){...}`).

Нові випадки задаються новими структурами, а нові операції — новими інтерфейсами й методами. Не потрібно змінювати чи перекомпілювати наявні оголошення, і жодні перевірки типів під час виконання не потрібні.

## Джерела {#references}

*   Ведлер, П. (1998). *The Expression Problem*. Повідомлення в поштовому списку Java-Genericity. Формулювання проблеми та надання їй назви.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Гриземер, Р., Ху, Р., Кокке, В., Ланге, Й., Тейлор, А. Л., Тоніньо, Б., Ведлер, П. та Йошида, Н. (2020). *Featherweight Go*. Праці ACM з мов програмування 4 (OOPSLA). Пізніше конкретне рішення для мови, розділ 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
