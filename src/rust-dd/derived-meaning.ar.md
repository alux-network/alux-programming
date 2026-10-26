<!-- reader: {"title":"المعنى المشتق والتركيب"} -->

# المعنى المشتق والتركيب {#derived-meaning-and-composition}

```admonish tip title="ذات صلة"
المنظور الدلالي: [التصميم الدلالي (Denotational Design)](../denotational-design/design.md)  
التصميم انطلاقًا من المعنى في Rust: [جبر القدرات](capability-algebras.md)، [المفسرات والآثار](interpreters.md)  
المفاهيم: [Expression Problem](../concepts/expression-problem.md)
```

```admonish note title="تمهيد"
ينتمي السلوك المشتق إلى القدرات التي يستخدمها، ويُكتب مرة واحدة بوصفه امتدادًا فوق حدودها، لا إلى أي نوع ملموس يصادف أنه يطبقها. وجملة `where` هي التصريح الصادق عما يعتمد عليه الاشتقاق.
```

توفر القدرات الأولية المفردات. وينبغي اشتقاق معظم سلوك التطبيق منها مرة واحدة ومشاركته بين جميع المفسرات.

## الامتدادات تملك الاشتقاقات {#extensions-own-derivations}

باستخدام الحزمة [`extend`](https://docs.rs/extend/latest/extend/)، يمكن اشتقاق عمليات الفروع باستقلال عن التمثيل:

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

جملة `where` هي التصريح الكامل بالتبعية الدلالية: `BranchAlg`، ولا شيء سواها. لا يملك نوع فرع ملموس هذه التعريفات.

لا تفعل الماكرو سوى إزالة الشيفرة النمطية للسمات والتنفيذات. ويمكن لسمة امتداد عادية التعبير عن التصميم نفسه. موضع التصميم الدلالي هو الحد الدلالي والاشتقاق، لا السمة التوضيحية.

## لماذا لا نضعه على البنية؟ {#why-not-put-it-on-the-struct}

````admonish warning title="لا تلحم المعنى المشتق بالبنية"
هذا تصميم يبدأ بالتمثيل. فإذا أُدخل حامل عددي للفروع، نُسخ الاشتقاق أو أعيد تنفيذه، وأصبح النوع الملموس الأول مواصفةً عن غير قصد.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

تعكس الامتدادات الملكية:

| الطبقة | المسؤولية |
| --- | --- |
| القدرة الدلالية | تملك المعنى المشتق |
| النوع الملموس | يفسر المعنى الأولي |

## ركّب باستخدام الحدود {#compose-with-bounds}

عندما يفسر مستقبِل واحد عدة قدرات، استخدم حدودًا مباشرة:

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="لا تجمع القدرات في حزمة"
لا تنشئ سمة فائقة لمجرد تقصير الحد:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

تخفي الحزمة العملية التي تستهلك كل قدرة، وتنشئ واجهة أخرى يتعين على كل مفسر تحقيقها.
````

## خمسة معانٍ مختلفة للتركيب {#five-different-composition-meanings}

اختر الصيغة التي تصف العلاقة بصدق.

| الحالة | صيغة Rust |
| --- | --- |
| مستقبِل واحد يفسر عدة قدرات | حدود مباشرة |
| قيمة منفصلة تختار السلوك | معامل سياسة صريح |
| تركيب السياسات المستقلة ساكنًا | حاصل ضرب أو بنية عادية |
| بيئة تحمل مفسرًا آخر | إسقاط `HasX` صغير |
| غلاف يحل محل مفسر داخلي | التفويض |

### سياسة صريحة {#explicit-policy}

إذا اختيرت الاستراتيجية بصورة مستقلة، فمررها صراحةً إلى الامتداد:

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

يملك الامتداد الاشتقاق المشترك، بينما تظل السياسة مدخلًا يُختار مستقلًا. فلا تُخفى داخل البيئة ولا يختارها `Default`.

### حاصل ضرب السياسات {#product-of-policies}

يمكن تركيب السياسات المستقلة من دون اختراع الوراثة:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### الإسقاط {#projection}

لا تقول السمة `HasClock` إلا إن البيئة تستطيع إسقاط قيمة ساعة منفصلة:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

تضيف العملية التي تقرأ الوقت `This::Clock: ClockAlg` في جملة `where` الخاصة بها. يعبّر الإسقاط عن الاحتواء، بينما تصرح العملية المستهلكة بالقدرة التي تحتاج إليها. استخدم هذا النمط فقط عندما يكون الفصل حقيقيًا. ولا تُدخل `HasX` لمجرد تنظيم الحقول.

### التفويض {#delegation}

يعني التفويض أن الغلاف نفسه يمكن أن يحل محل المفسر الداخلي. ويناسب الأنواع الجديدة الشفافة والمؤشرات المشتركة والمهايئات التي تحافظ على عقد القدرة كاملًا.

يقول الإسقاط «لديه»، ويقول التفويض «هو». ولا يمكن التبادل بينهما.

## القيم الافتراضية قرارات دلالية أيضًا {#defaults-are-semantic-decisions-too}

يمكن للحالات الفارغة الآلية أن تطبق `Default`. أما سياسة المجال فينبغي عادةً التصريح بها.

غالبًا ما يكون للحالات المفيدة تفسير جبري: القيمة الافتراضية هي عنصر المحايد في التركيب الطبيعي للنوع. فإلحاق مخزن مؤقت فارغ أو الدمج مع خريطة فارغة أو تجميع صفر من التشخيصات لا يضيف شيئًا. وعندما يكون هذا التركيب تجميعيًا، يشكل النوع والعملية مونويدًا، ويمكن لـ `Default` تسمية عنصره المحايد بدلًا من اختيار سياسة.

قيم افتراضية جيدة:

*   مخزن مؤقت فارغ
*   خريطة فارغة
*   صفر من التشخيصات المتراكمة

قيم افتراضية مثيرة للريبة:

*   حد النصاب
*   سياسة القائد
*   دلالات إعادة المحاولة
*   عمق التأكيد
*   تنسيق الإخراج

هذا هو الفرق المهم: لا يفرض العنصر المحايد قرارًا، بينما يختار النصاب أو استراتيجية القائد أو قاعدة إعادة المحاولة سلوك المجال. إذا غيّر تعديل القيمة الافتراضية معنى المجال، فركّب السياسة صراحةً.

## أبقِ المعنى المشتق مغلقًا {#derived-meaning-should-stay-closed}

يجب أن يستخدم الامتداد قدراته المعلنة ومدخلاته الصريحة فقط. يجعل الوصول المباشر إلى الحقول والحالة العامة والتحويل إلى نوع ملموس جملة `where` غير صادقة.

راجع المتن كما لو كان برهانًا على تصريح التبعيات:

```admonish question title="اختبر كل اشتقاق"
هل يمكن تبرير كل عملية في هذا المتن انطلاقًا من هذه الحدود؟
```

إن لم يمكن ذلك، فالحدود غير مكتملة أو أن الشيفرة تنتمي إلى طبقة أخرى.

## فحوص المراجعة {#review-checks}

*   هل يُعرّف السلوك المشتق مرة واحدة فوق القدرات؟
*   هل يتجنب الامتداد الحقول والأنواع السياقية الملموسة؟
*   هل تُستخدم حدود مباشرة لمفسر واحد؟
*   هل السياسات قيم صريحة عندما تُختار بصورة مستقلة؟
*   هل يصف الإسقاط والتفويض ما يحدث بصدق؟
*   هل تظهر القيم الافتراضية للمجال في التركيب؟
