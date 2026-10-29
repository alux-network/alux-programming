<!-- reader: {"title":"إعادة طرح مسألة التعبير","sourceHash":"sha256:c0c35ab091b01a221419f7a315cdd37146fc4858d3335fa406996ecadc3148e8"} -->

# إعادة طرح مسألة التعبير {#expression-problem-reloaded}

```admonish tip title="ذات صلة"
الرؤية الدلالية: [التصميم الدلالي](../denotational-design/design.md)  
التصميم انطلاقًا من المعنى في Rust: [جبريات القدرات](../rust-dd/capability-algebras.md)، [المعنى المشتق والتركيب](../rust-dd/derived-meaning.md)، [المفسرات والآثار](../rust-dd/interpreters.md)  
المفاهيم: [مسألة التعبير](../concepts/expression-problem.md)
```

تعرض هذه الصفحة حلًا عمليًا لمسألة التعبير قائمًا على السمات: كيفية إضافة صيغ تعبير وعمليات جديدة من دون إعادة كتابة الشيفرة القائمة مرارًا. التصميم **على نمط كونال** في فكرته، وترميزه **من نمط tagless-final/جبريات الكائنات**. عمليًا: نحدد المعنى التركيبي أولًا (واجهات قدرات صغيرة ومواصفات برامج على مستوى الامتدادات)، ثم نوفر مفسرات ملموسة. وينتمي الترميز الملموس إلى عائلة أسلوب **tagless-final** لدى أوليغ كيسليوف و**جبريات الكائنات**: تحدد واجهات المُنشئات (`LitAlg`، `AddAlg`، `MulAlg`) توقيع اللغة، وتكتب البرامج بصورة متعددة الأشكال اعتمادًا على تلك الواجهات، وتوفر التطبيقات الملموسة (مثل `Eval` أو `Pretty`) التفسيرات. وهذا يتجنب الالتزام بشجرة AST مغلقة واحدة مع الحفاظ على الأنواع الساكنة وقابلية التوسيع في البعدين. وتقدم هذه الصفحة حلًا عمليًا لـ *مسألة التعبير*.

نهج أوليغ دلالي صراحة: يسند المعنى التركيبي أولًا، ثم يحقق الآثار والمفسرات كطبقات دلالية معيارية. وفي مسألة التعبير، لهذا يكون التوافق مع التصميم الدلالي متوقعًا لا عرضيًا. فصياغة كونال للتصميم الدلالي تقرر الأولوية نفسها مباشرة: حدد المعنى تركيبيًا أولًا، وتعامل مع استراتيجيات التنفيذ الملموسة بوصفها ثانوية وقابلة للاستبدال.

في مثال لغة التعبير، يعني هذا الترميز ما يلي:

*   **تُمثّل مفردات المُنشئات** بسمات جبرية صغيرة ومستقلة.
*   **التفسيرات** هي تطبيقات لتلك السمات.
*   تضيف الصياغة الجديدة سمة جديدة وتترك الشيفرة القديمة دون تغيير.
*   تضيف الدلالات الجديدة نوع مفسر جديدًا وتترك الشيفرة القديمة دون تغيير.

`lit` و`add` عمليتان دلاليتان وليستا مُنشئين لشجرة AST مميزة. فشجرة AST تفسير واحد ضمن عدة تفسيرات.

```admonish example title="جبريات الكائنات في C#"
هذا الترميز ليس خاصًا بـ Rust. تطور [`object-algebras`](https://github.com/tgrospic/object-algebras) النمط في C# وتتجاوز الحامل الثابت المستخدم هنا. في هذه الصفحة يختار كل مفسر `Self::Expr` ملموسًا واحدًا، أي نوعًا عاديًا. أما جبريات C# فتجردها على نوع *منشئ* `F` — `FunctorAlg<F>`، `MonadAlg<F>`، `BankingDsl<F>` — يحمل النتائج على هيئة `App<F, a>` بدلًا من `F<a>` غير القانوني.

لا تتضمن C# أنواعًا من الرتبة الأعلى من الدرجة الأولى، لذا يقوم `App<F, a>` مقام التطبيق `F(a)`، الذي تستعيده أغلفة الحقن/الإسقاط. وهذه `App`حيلة [هي بالضبط إزالة الدوال](../concepts/defunctionalization.md): يتحول التجريد الذي لا تستطيع اللغة التعبير عنه إلى بيانات من الرتبة الأولى تُطبّق عند الطلب. وتواجه Rust الحد نفسه؛ إذ تفتقر هي أيضًا إلى أنواع من الرتبة الأعلى من الدرجة الأولى.
```

## حدد قدرات صياغة صغيرة {#specify-tiny-syntax-capabilities}

يصبح كل مُنشئ سمة صغيرة. وهذا هو **المواصفة**.

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

تكتب البرامج بوصفها **امتدادات** فوق السمات الجبرية؛ وهذه الامتدادات جزء من المواصفة أيضًا، وتجمع المواصفات الصغيرة في مواصفات برامج قابلة لإعادة الاستخدام:

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

`#[ext(...)]` ماكرو من الحزمة [`extend`، وتقلل الشيفرة النمطية بإنشاء أساليب الامتداد من كتلة `impl`؛ وليست ميزة جديدة في لغة Rust.](https://docs.rs/extend/latest/extend/)

## أضف تفسيرًا جديدًا {#add-new-interpretation}

تنفذ المفسرات المواصفة. ولا حاجة إلى تغيير الصياغة.

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

يمكن الآن تفسير التعبير نفسه بطرق مختلفة:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## أضف صياغة جديدة (سمة قدرة جديدة) {#add-new-syntax-new-capability-trait}

لإضافة `Mul`، عرّف سمة جديدة. وتبقى الشيفرة القائمة دون تغيير.

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

تظل المفسرات القائمة صالحة للتعبيرات القديمة.  
وإذا أرادت دعم الصياغة الجديدة، فلتنفذ السمة الجديدة:

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

## لماذا يحل هذا مسألة التعبير {#why-this-solves-the-expression-problem}

لمسألة التعبير التقليدية محوران على تمثيل:

*   إضافة صيغ جديدة (حالات)
*   إضافة عمليات جديدة

يعيد التصميم الدلالي صياغة المحورين:

*   **وسّع المفردات الدلالية**: عرّف سمة قدرة جديدة (`MulAlg`).
*   **أضف تفسيرًا جديدًا** لهذه المفردات: عرّف نوع مفسر جديدًا (`Eval` أو `Pretty` أو منشئ شجرة AST أو مولد شيفرة).

يركب المحوران بصورة مستقلة:

*   لا تتغير البرامج القائمة ما لم تتطلب القدرة الجديدة. يظل `expr_basic` يطلب `LitAlg + AddAlg` فقط.
*   لا تتغير المفسرات القائمة ما لم تختر تفسير القدرة الجديدة. ويستمر `Eval` بلا `impl MulAlg` في تشغيل كل برنامج لا يستخدم `mul`.

لا يلغي هذا مصفوفة التنفيذ. فإذا كان ينبغي لـ `Eval` و`Pretty` تفسير `mul`، احتاج كلاهما إلى `impl MulAlg`. لكن تنظيم المصفوفة يتغير: كل خلية *عملية دلالية × تفسير*، ولا تتمحور أي خلية حول تمثيل مميز، ولا يعتمد كل برنامج إلا على القدرات التي يستخدمها.

## القوانين جزء من المواصفة {#laws-belong-to-the-specification}

يتكوّن الجبر الدلالي من حامل وعمليات وقوانين. يختار التفسير الحامل (`type Expr`)، بينما تنتمي العمليات والقوانين إلى المواصفة. مثلًا، تحدد دلالة حسابية لـ `LitAlg + AddAlg` ما يلي:

```text
add(lit(m), lit(n)) = lit(m + n)
```

تحقق `Eval` هذا القانون، ولا تحققه `Pretty`: فـ `"(2 + 3)"` ليست `"5"`. وكلاهما مفسر صالح لتوقيع الصياغة، لكن `Eval` وحده نموذج للمواصفة الحسابية. يُذكر القانون مرة واحدة مقابل السمات، وهو الذي يحدد المفسرات المؤهلة. لا يملكه أي مفسر.

## الرؤية الختامية: Featherweight Go في مقابل التصميم الدلالي {#final-insight-featherweight-go-vs-denotational-design}

شخّص وادلر مسألة التعبير على مستوى آليات اللغة: الصفوف في مقابل الأعمدة في ظل الأنواع الساكنة والتوسعة المعيارية. ويقدم [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020) حلًا ملموسًا: يبقي `Plus(type a Any)` التمثيل التكراري عامًا، ويقيّد كل عملية `a` باستقلال (`Plus(type a Evaler)` لـ `Eval` و`Plus(type a Stringer)` لـ `String`). ولا يرتبط التمثيل بواجهة تعبير مغلقة واحدة، لذا يظل المحوران مفتوحين.

تبدأ الحلول التقليدية بالتمثيل وتسأل كيف تبقي محوري التوسعة مفتوحين. ويتقدم Featherweight Go بعيدًا على نحو لافت بجعل التمثيل التكراري عامًا وقابلًا للتوسيع البنيوي. أما التصميم الدلالي فينقل الحد خطوة إلى الخلف: التمثيل ليس النموذج. النموذج هو الجبر وقوانينه؛ والتمثيل أحد التفسيرات الممكنة.

**يجعل Featherweight Go التمثيل قابلًا للتوسيع، ويجعل التصميم الدلالي التمثيل اختياريًا.**

|  | Featherweight Go | التصميم الدلالي |
| --- | --- | --- |
| المركز الدلالي | تمثيل قابل للتوسيع | الجبر والقوانين |
| `Num`/`Plus`, `lit`/`add` | البنى (صيغ التمثيل) | العمليات الدلالية |
| `Eval`, `String`/`Pretty` | الأساليب والواجهات | التفسيرات |
| البنية التكرارية | تمثيل عام ومفتوح (`Plus(a)`) | غير مطلوب |
| الحامل | نوع التعبير المُمثَّل | يختاره المفسر (`type Expr`) |
| شجرة AST | يبقى التمثيل محوريًا | اختياري، تفسير واحد من بين تفسيرات كثيرة |
| خلية المصفوفة | حالة × عملية → أسلوب | عملية دلالية × تفسير → `impl` |
| سلوك جديد | إضافة أساليب وواجهات | إضافة القدرات أو تركيبها |
| تنفيذ جديد | تجسيدات بنيوية جديدة | مفسر جديد |

يسأل وادلر كيف يمكن توسيع المحورين في تمثيل. أما التصميم الدلالي فيسأل لماذا ينبغي للتمثيل أن يملك أيًا من المحورين.

حدد المعنى التركيبي أولًا ثم اختر الترميزات. تصبح مسألة التعبير خيارًا هندسيًا بين الترميزات، لا مأزقًا مفاهيميًا.

**ينبغي أن يكون معنى اللغة مستقلًا عن فكرة الآلة.**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>ينبغي أن يكون معنى اللغة مستقلًا عن الآلة</figcaption></figure>

## المراجع {#references}

*   إليوت، C. *Denotational design with type class morphisms*.  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   إليوت، C. *Compiling to categories*.  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   كيسليوف، O. *Tagless-final style* (عرض ودروس وأوراق بحثية عن الترميزات النهائية والمفسرات ذات الأنواع القابلة للتوسيع).  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   كيسليوف، O. *Having an Effect* (عرض تعريفي/دلالي للآثار والمفسرات القابلة للتوسيع).  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   غريسمير، R.، هو، R.، كوكي، W.، لانغه، J.، تايلور، I. L.، تونينيو، B.، وادلر، P.، ويوشيدا، N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). يعرض القسم 2.3 الحل البنيوي العام المقارن أعلاه.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   أوليفيرا، B. C. d. S.، وكوك، W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
