<!-- reader: {"title":"مسألة التعبير"} -->

# مسألة التعبير {#expression-problem}

```admonish tip title="ذات صلة"
الرؤية الدلالية: [التصميم الدلالي](../denotational-design/design.md)، [الدلالات والتركيبية](../denotational-design/denotations.md)  
التصميم انطلاقًا من المعنى في Rust: [جبريات القدرات](../rust-dd/capability-algebras.md)، [المعنى المشتق والتركيب](../rust-dd/derived-meaning.md)  
الرؤى: [إعادة طرح مسألة التعبير](../insights/expression-problem.md)
```

```admonish note title="الموضع الدلالي"
تتناول مسألة التعبير التوسيع المعياري للتمثيلات والعمليات. ويقدم التصميم الدلالي سؤالًا أسبق: أي مفردات وتفسيرات دلالية تستحق التمثيل أصلًا؟
```

تتناول مسألة التعبير لدى فيل وادلر توسيع اللغة **بُعدين في آنٍ واحد** من دون تعديل الشيفرة القائمة:

*   **إضافة صيغ بيانات جديدة** (أشكال تعبير جديدة، أي «صياغة»).
*   **إضافة عمليات جديدة** (تفسيرات جديدة، أي «دلالات»).

موطن التوتر الأساسي:

*   في أسلوب **البرمجة الوظيفية/أنواع البيانات الجبرية**، يسهل إضافة عمليات جديدة، لكن إضافة صيغ جديدة تتطلب تعديلًا واسعًا.
*   في الأسلوب **كائني التوجه**، يسهل إضافة صيغ جديدة، لكن إضافة عمليات جديدة تتطلب تعديلًا واسعًا.

يعرض هذا القسم الجانبين بأمثلة صغيرة في Haskell وJava.

## Haskell (البرمجة الوظيفية / أنواع البيانات الجبرية) {#haskell-functional--adt}

نبدأ بنوع بيانات جبري كلاسيكي للتعبيرات وعملتين.

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

من السهل الآن **إضافة عملية جديدة**:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

لكن **إضافة صيغة جديدة** (مثل `Mul`) تفرض تعديلات في كل دالة:

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

بمصطلحات وادلر، **توسيع البيانات ليس معياريًا** في نهج أنواع البيانات الجبرية.

## Java (كائنية التوجه) {#java-object-oriented}

نبدأ بواجهة وفئات ملموسة لكل صيغة.

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

من السهل الآن **إضافة صيغة جديدة**:

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

لكن **إضافة عملية جديدة** (مثل `size`) تتطلب تعديلًا واسعًا. يجب تعديل الواجهة وكل فئة:

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

بمصطلحات وادلر، **توسيع العمليات ليس معياريًا** في نهج البرمجة كائنية التوجه.

## ملخص (فكرة وادلر) {#summary-wadlers-point}

*   يفضل أسلوب البرمجة الوظيفية/أنواع البيانات الجبرية **العمليات الجديدة** لكنه يقاوم **الصيغ الجديدة**.
*   يفضل الأسلوب كائني التوجه **الصيغ الجديدة** لكنه يقاوم **العمليات الجديدة**.
*   تسأل مسألة التعبير عن تصميم يمكن فيه توسيع **البعدين كليهما** من دون تعديل الشيفرة القائمة.

## شرح وادلر ومشهد الحلول (1998) {#wadlers-explanation-and-solution-landscape-1998}

يصوغ وادلر المشكلة هكذا: توسيع نوع بيانات **بإضافة حالات** (صيغ جديدة)، وتوسيع **دوال على ذلك النوع** (عمليات جديدة)، *من دون إعادة تجميع الشيفرة القائمة* مع الحفاظ على **سلامة الأنواع الساكنة** (من دون تحويلات نوعية).

يستخدم استعارة «الجدول»:

*   **الصفوف** = الحالات (الصيغ / المُنشئات)
*   **الأعمدة** = الدوال (العمليات / التفسيرات)

في أساليب **البرمجة الوظيفية/أنواع البيانات الجبرية**، تكون الصفوف ثابتة ويسهل إضافة الأعمدة.  
وفي أساليب **البرمجة كائنية التوجه**، تكون الأعمدة ثابتة ويسهل إضافة الصفوف.  
والتحدي هو جعل **الاتجاهين كليهما** قابلين للتوسيع.

## حل وادلر المقترح (GJ والأنواع الافتراضية) {#wadlers-proposed-solution-gj--virtual-types}

يعرض وادلر حلًا في GJ (Java العامة) باستخدام:

*   معامل مقيّد بـ `This` (`This extends LangF<This>`) لمحاكاة **ThisType**.
*   **الفئات والواجهات الداخلية** المفهرسة بـ `This` (الأنواع الافتراضية).
*   A visitor-based structure that allows:
    *   الحالات الجديدة (مثل `Plus`) عبر اشتقاق فئة «عائلة اللغة»
    *   العمليات الجديدة (مثل `Show`) عبر إضافة زوار جدد

تتمثل الحيلة في الإشارة إلى `This.Exp` و`This.Visitor` بحيث تظل كل مرحلة توسعة آمنة الأنواع وقابلة للتجميع المستقل.

### تنبيه (الواجهات الداخلية في Java) {#caveat-java-inner-interfaces}

يلاحظ وادلر أن Java تتعامل مع الواجهات الداخلية بوصفها **ساكنة**، ما يفسد حيلة الفهرسة.  
ويقترح أن تخفيف هذا القيد سيجعل الحل ممكنًا؛ لكن ذلك لم يتغير حتى في Java الحديثة (فالواجهات المتداخلة تظل ساكنة ضمنيًا).

## اتجاهات حلول أخرى مذكورة {#other-solution-directions-mentioned}

1.  نهج كوركي كارترايت يتطلب **توسيعًا معاكسًا للتغاير**: السماح لنوع التعبير الأساسي بأن يحل محل نوع ممتد. وهذا يفسر استخدام النقاط الثابتة: فعائلة اللغة الممتدة *ليست* نوعًا فرعيًا من الأصلية.
    
2.  نهج كيم بروس يتطلب **مُنشئات أنواع من الرتبة الأعلى** (أي جعل نوع ما معاملًا لمنشئ نوع). لا يدعم GJ ذلك مباشرة، لكن وادلر يرى أن الأنواع الافتراضية يمكنها محاكاته.
    
3.  نهج كريشنامورثي وآخرين (نمط الزائر الممتد) يعمل عبر تصميم زائر ممتد. **ليس ذا أنواع ساكنة** في بيئتهم (Pizza)، لذا تلزم تحويلات نوعية ديناميكية.
    
4.  توسيعات لغوية مخصصة يذكر وادلر حلين يعتمدان على ميزات صُممت خصيصًا للمشكلة. وهما أقل عمومية من نهج الأنواع الافتراضية.
    

## نقطتا وادلر {#wadlers-two-points}

توضح رسالة وادلر نقطتين:

1.  مسألة التعبير **توتر بنيوي** بين توسيع البيانات وتوسيع العمليات.
2.  Solutions are possible, but they tend to require either:
    *   ميزات نظام الأنواع التي تحاكي **الأنواع الافتراضية**، أو
    *   توسيعات لغوية مخصصة، أو
    *   مساومة على سلامة الأنواع الساكنة أو التجميع المستقل.

## حل Featherweight Go (2020) {#featherweight-go-solution-2020}

صاغ وادلر المشكلة وسمّاها عام 1998. وقدمت Featherweight Go (FG) وامتدادها العام FGG (Featherweight Generic Go) لاحقًا حلًا ملموسًا ساكنًا بالكامل في لغة شبيهة بـ Go تستخدم الواجهات البنيوية والأنواع العامة.

يتضمن حل الورقة (الشكل 8، بصورة مبسطة) بنيتين، `Num` و`Plus`، وعملتين، `Eval` و`String`:

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

الآلية:

*   **تمثيل تكراري عام.** لأبناء `Plus` معامل نوع `a` لا يقيّده سوى `Any`. ولا ترتبط البنية بواجهة مغلقة تسرد كل العمليات، ما يتيح إضافة عمليات لاحقًا.
*   **قيود خاصة بكل عملية.** يحدد إعلان كل أسلوب قيد `a` بصورة مستقلة: `Plus(type a Evaler)` لـ `Eval` و`Plus(type a Stringer)` لـ `String`. ويعتمد ذلك على *المستقبِلات المتغايرة* في FGG: فقد يكون قيد مستقبل الأسلوب أقوى من القيد في إعلان النوع.
*   **واجهات بنيوية.** تنفذ البنية واجهة بامتلاك أساليبها؛ لذلك يمكن تقديم `Expr` بعد `Num` و`Plus` دون المساس بها. ولا تُحدد مجموعة العمليات كاملة إلا عند إنشاء قيمة (`Plus(Expr){...}`).

الحالات الجديدة هي بنى جديدة؛ والعمليات الجديدة واجهات وأساليب جديدة. ولا يتطلب أي منهما تغيير الإعلانات القائمة أو إعادة تجميعها، ولا حاجة إلى تأكيدات الأنواع.

## المراجع {#references}

*   وادلر، P. (1998). *The Expression Problem*. مذكرة في قائمة مراسلات Java-Genericity. صياغة المشكلة وتسميتها.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   غريسمير، R.، هو، R.، كوكي، W.، لانغه، J.، تايلور، I. L.، تونينيو، B.، وادلر، P.، يوشيدا، N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). حل لغوي ملموس لاحق، القسم 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
