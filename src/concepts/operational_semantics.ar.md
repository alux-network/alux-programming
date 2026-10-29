<!-- reader: {"title":"الدلالات التشغيلية","sourceHash":"sha256:b0fd7a80a655265ccf484572fd71d0f46ba654a5b34cf4e5fd573d569b4198ed"} -->

# الدلالات التشغيلية {#operational-semantics}

```admonish tip title="ذات صلة"
الرؤية الدلالية: [التصميم الدلالي](../denotational-design/design.md)  
التصميم انطلاقًا من المعنى في Rust: [مسارات اللغة والمترجم](../rust-dd/compiler-pipelines.md)  
المفاهيم: [الموناد الحر](free_monad.md)، [أسلوب تمرير الاستمرار](cps.md)، [إزالة الدوال](defunctionalization.md)  
الرؤى: [من الدلالات إلى الآلات](../insights/operational_semantics.md)
```

## التعريف {#definition}

تصف **الدلالات التشغيلية** سلوك البرنامج بواسطة أحكام التقييم أو الانتقالات بين **تهيئات**. وقد تحتوي التهيئة على جزء من البرنامج مع بيئة أو مخزن أو استمرارية أو حالة أخرى للآلة المجردة.

الوصف رياضي؛ فهو يحدد التقييمات أو الانتقالات الصحيحة. وقد ينفذ مفسر أو آلة افتراضية تلك القواعد، لكن تنفيذًا بعينه ليس التعريف نفسه.

```admonish note title="الموضع الدلالي"
الدلالات التشغيلية دقيقة، وليست مجرد تفاصيل تنفيذ غير رسمية. فهي تشرح السلوك عبر قواعد التقييم أو الانتقال. ويسأل [التصميم الدلالي](../denotational-design/design.md) سؤالًا تصميميًا مكملًا وأسبق: أي المعاني والمعادلات التركيبية ينبغي لتلك القواعد الحفاظ عليها؟
```

## أنماط الدلالات التشغيلية {#styles-of-operational-semantics}

### الخطوات الصغيرة (الدلالات التشغيلية البنيوية) {#small-step-structural-operational-semantics}

تجزّأ العملية الحسابية إلى انتقالات ذرية:

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

مفيدة لنمذجة التزامن والتداخل والتنفيذ الجزئي.

### الخطوات الكبيرة (الدلالات الطبيعية) {#big-step-natural-semantics}

يصف التقييم من حيث النتائج النهائية:

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

غالبًا ما تكون أوضح للاستدلال على البرامج المنتهية.

## القواعد الصورية {#formal-rules}

تُعطى الدلالات التشغيلية عادةً بواسطة **قواعد استدلال**. للغة حسابية بسيطة:

$$ E ::= n \mid E + E $$

يلزم ثلاث قواعد للتقييم من اليسار إلى اليمين:

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

تختار القاعدتان الأوليان التعبير الفرعي التالي القابل للاختزال. وتنفذ القاعدة الثالثة الجمع بعد أن يصبح المعاملان قيمتين.

مسار التقييم:

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## لماذا يهم {#why-it-matters}

*   يوفر **نموذجًا دقيقًا شبيهًا بالآلة** للتنفيذ.
*   أساس للمفسرات والآلات الافتراضية.
*   يدعم الاستدلال على الصحة واستخدام الموارد والسلامة.

## علاقته بالمفاهيم الأخرى {#relation-to-other-concepts}

*   يوفر **الموناد الحر** صياغة التعليمات وتسلسلها. ويمكن للقواعد التشغيلية وصف تقييم برنامج بهذه الصيغة.
*   يجعل **أسلوب تمرير الاستمرار** بقية الحساب صريحة في صورة دالة استمرار. ويمكن للقواعد التشغيلية وصف كيفية تمرير القيم إلى تلك الدوال.
*   تستبدل **إزالة الدوال** عائلة معلومة من الدوال ببيانات من الرتبة الأولى وعملية `apply`. ويمكن للقواعد التشغيلية وصف حالات الآلة الصريحة الناتجة.

هذه كيانات وتحويلات قد تُعطى دلالات تشغيلية؛ لكنها ليست الدلالات التشغيلية نفسها.

## عمليًا {#in-practice}

يمكن للقواعد التشغيلية توجيه المفسر وتوفير نموذج دقيق لمقارنته به:

*   يمكن نمذجة **آلة EVM** طبيعيًا كنظام انتقال حالات بخطوات صغيرة، كما يمكن ربط تنفيذ كامل منتهٍ بحكم خطوات كبيرة.
*   غالبًا ما تقابل قواعد الخطوات الصغيرة أذرع `match` في مفسر Rust.

$$ n_1 + n_2 \to n_3 $$

يمكن تمثيل العلاقة الكاملة من اليسار إلى اليمين بشيفرة Rust:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

تنفذ هذه الدالة انتقالًا واحدًا. ويؤدي تكرار التطبيق إلى المسار المعروض؛ وتعني إعادة `None` أن التعبير قيمة بالفعل.

## الأسئلة التشغيلية والدلالية {#operational-and-denotational-questions}

يمكن للقواعد التشغيلية إثبات السلامة والتقدم وحدود الموارد والتوافق مع التنفيذات. ويظهر القيد عندما تُختار الآليات التشغيلية قبل المعنى المجرد المقصود؛ فقد تتحول خيارات التنفيذ إلى التزامات دلالية عرضية.

لا يرفض التصميم الدلالي الدلالات التشغيلية. بل يدعونا إلى تحديد المجال الدلالي والتركيب والقوانين أولًا، ثم ربط النموذج التشغيلي بها.

| المنظور | السؤال |
| --- | --- |
| الدلالي | ما معنى البرنامج كله؟ |
| التشغيلي | بأي انتقالات يُقيّم؟ |
| الصحة | هل تحافظ تلك الانتقالات على المعنى المقصود؟ |

توضح المقاطع التالية خطر التعامل مع الأوصاف التشغيلية بوصفها المصدر الوحيد للفهم.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>الوصف التشغيلي ليس المعنى كله (1 من 2)</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>الوصف التشغيلي ليس المعنى كله (2 من 2)</figcaption></figure>
