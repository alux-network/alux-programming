<!-- reader: {"title":"جبر القدرات","sourceHash":"sha256:0c3fefabad08ae4d7f39d28d5855e2983e2c46d3acba947e186a304d1e91139e"} -->

# جبر القدرات {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="ذات صلة"
المنظور الدلالي: [التصميم الدلالي (Denotational Design)](../denotational-design/design.md)، [الدلالات والتركيبية](../denotational-design/denotations.md)  
التصميم انطلاقًا من المعنى في Rust: [الأنواع الدلالية في Rust](semantic-types.md)، [المعنى المشتق والتركيب](derived-meaning.md)  
المفاهيم: [Expression Problem](../concepts/expression-problem.md)، [التشعب والتلاقي](../concepts/branching.md)
```

```admonish note title="تمهيد"
سمة القدرة جبر صغير: تسمي الملاحظات والتحويلات الأولية التي يتطلبها معنى ما، وتترك التمثيل للمفسر. صمّم المفردات انطلاقًا من المعنى، لا من الحقول التي يصادف أن يحتفظ بها أول تنفيذ.
```

لا تتضمن Rust بنية مدمجة باسم «التصميم الدلالي». نرّمز المفردات الدلالية باستخدام ميزات اللغة العادية. والسمات الصغيرة للقدرات إحدى الترميزات المفيدة.

تعني اللاحقة `Alg` في هذا الكتاب **جبرًا**: مجموعة متماسكة من العمليات الأولية على حوامل يختارها المفسر.

## ابدأ بالمعنى {#start-from-meaning}

يمكن التعبير عن معنى موضع الفرع من الجزء السابق هكذا:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Left,
    Right,
}

pub trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>>;
}
```

تصرّح السمة بثلاثة معانٍ أولية:

*   إنشاء الجذر
*   تمديد فرع في اتجاه واحد
*   ملاحظة المسار النسبي عند وجوده

ولا تكشف موضع تخزين الفروع أو طريقة ترميز المسارات.

## القدرات ليست إسقاطات للحقول {#capabilities-are-not-field-projections}

````admonish warning title="إسقاطات الحقول ليست قدرات دلالية"
قارن:

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

تخفي هذه السمة بنيةً خلف الأساليب، لكنها تظل تكشف تمثيلها. فيرتبط أي منطق مشتق بالمتجهات والقيم المنطقية والملكية واستراتيجية التعديل.
````

تكشف القدرة الدلالية الملاحظة أو التحويل الذي يتطلبه المعنى اللاحق. اسأل:

```admonish question title="ما الذي ينبغي سؤاله عن كل قدرة"
لو استخدم التنفيذ قاعدة بيانات أو حدًا رمزيًا أو عددًا صحيحًا مدمجًا أو خدمة بعيدة، فهل تظل هذه العملية ذات معنى؟
```

إن كان الجواب نعم، فقد تنتمي العملية إلى القدرة. أما إذا احتاج المستدعون إلى تخطيط الحقول الحالي، فالأرجح أنها لا تنتمي إليها.

## معنى أولي واحد لكل سمة {#one-primitive-meaning-per-trait}

تُظهر السمات الصغيرة التبعيات:

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

يمكن لعملية مشتقة تحتاج إلى الوقت والموعد النهائي أن تتطلب السمتين معًا. ولا تحتاج إلى `ApplicationContext` يجمع التسجيل والتخزين والشبكات والإعداد والجدولة.

لا يعني «صغير» الاقتصار آليًا على أسلوب واحد. اجمع العمليات عندما تكوّن بنية دلالية واحدة لا تنفصل. وافصلها عندما تعبّر عن معانٍ مستقلة أو تقبل مفسرات مستقلة.

## تختار الأنواع المرتبطة الحوامل {#associated-types-select-carriers}

استخدم الأنواع المرتبطة عندما يختار المفسر التمثيل:

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

لا تشترط `String` أو `std::io::Error` أو شجرة صياغة ملموسة، إلا إذا كانت مفردات دلالية مستقرة عند هذا الحد.

وعلى العكس، القيم الدلالية الملموسة مقبولة:

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

القاعدة ليست «اجعل كل نوع مجردًا»، بل «لا تخلط آليات المفسر بالمفردات الدلالية».

## ضع الحدود حيث تُستخدم {#put-bounds-where-they-are-used}

أبقِ العملية الأولية خالية من القيود التي لا تحتاجها:

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="لا تضف حدودًا استباقية"
لا تقيّد النوع المرتبط لمجرد أن خوارزمية مستقبلية قد تحتاج إليه:

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

قد تتطلب عملية ترتيب المرشحين `Ord`، بينما قد تتطلب عملية وضعهم في مجموعة تجزئة `Hash`.
````

تحافظ الحدود عند موضع الاستخدام على قابلية إعادة استخدام المعاني الأولية، وتكشف العقد الحقيقي للسلوك المشتق.

## قد تكون الآثار معنى أوليًا {#effects-can-be-primitive-meaning}

لا تستلزم سمات القدرات تنفيذًا نقيًا:

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

النشر أثر جانبي، لكنه قد يظل عملية دلالية أولية عند الحد الحالي. وقد يستخدم المفسر الملموس HTTP أو قائمة انتظار أو ملفًا أو مخزنًا مؤقتًا للاختبار.

ينبغي ألا تفرض الطبقة الدلالية إعادة المحاولة أو ملكية المقبس أو إطلاق المهام أو مجمعات الاتصالات إلا إذا كانت تلك الفروق جزءًا من المعنى المقصود.

## تسمية الحد {#naming-the-boundary}

صُغ القدرات من المنظور الدلالي للمستهلك:

| متمحور حول المعنى | متمحور حول التمثيل |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

التسمية جزء من التصميم. والاسم الآلي يدعو إلى ارتباط آلي.

## فحوص المراجعة {#review-checks}

*   هل تكشف السمة عن معنى أولي واحد متماسك؟
*   هل يستطيع مفسر مستقل تنفيذها دون نسخ التمثيل الأول؟
*   هل تكون الأنواع المرتبطة مجردة فقط حيث يختارها المفسر فعلًا؟
*   هل الأنواع الملموسة مفردات دلالية مستقرة؟
*   هل تبقى الحدود غائبة حتى تستخدمها عملية؟
*   هل تتجنب السمة إرجاع المديرين والسياقات والتخزين الخام؟
