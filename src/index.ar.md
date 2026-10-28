<!-- reader: {"title":"برمجة ALUX","parts":{"Welcome":"مرحبًا","The Semantic View":"المنظور الدلالي","Design by Meaning in Rust":"التصميم انطلاقًا من المعنى في Rust","Concepts":"المفاهيم","Insights":"رؤى","Contributing":"المساهمة"},"sourceHash":"sha256:81b904efbe52746e7c430050f24b67bda84b62fab618ace269ce404c69b04146"} -->

```admonish warning title="مشروع ALUX"
قاعدة شيفرة ALUX قيد التطوير النشط، ولم تُنشر بعد للعامة.
```

# <img src="/alux-logo.png" style="margin-right: 10px; width: 60px;">إرشادات برمجة ALUX {#alux-programming-guidelines}

```admonish note title="ملاحظة"
يؤسس هذا الكتاب للمعرفة اللازمة لفهم قاعدة شيفرة ALUX التي تبدأ بالمعنى والمساهمة فيها. وينطلق من مبدأ محوري في [التصميم الدلالي (Denotational Design)](denotational-design/design.md): عرّف معنى البرامج قبل أن تقرر كيفية عملها.

اقتداءً بـ Conal Elliott، يتعامل الكتاب مع الحوسبة بوصفها كيانًا رياضيًا واضحًا، لا سلسلة خطوات معتمة.

تُعبَّر المواصفات عن [سمات القدرة البسيطة والتركيبية](rust-dd/capability-algebras.md) التي تصف *ما* يعنيه البرنامج. ويوفر [المفسرون](rust-dd/interpreters.md) طرائق متبادلة *لتحقيق* تلك المعاني.

والنتيجة برمجيات يسهل فهم قواعد تركيبها، ومتطلبات تنفيذها، و[معادلاتها الصحيحة](denotational-design/laws-and-interpretations.md) واختبارها.
```

```admonish quote title="الآليات والمعنى"
تشرح [المفاهيم](concepts/index.md) و[الرؤى](insights/index.md) آليات برمجية مفيدة. أما [التصميم الدلالي (Denotational Design)](denotational-design/design.md) فيشرح كيفية تحديد ما ينبغي لهذه الآليات الحفاظ عليه.
```

## كيفية قراءة هذا الكتاب {#how-to-read-this-book}

اقرأ الكتاب عبر ثلاث طبقات:

*   يقدّم [**المنظور الدلالي**](denotational-design/semantic-view.md) مفهومي [الدلالات والتركيبية](denotational-design/denotations.md)، و[القوانين والتفسيرات](denotational-design/laws-and-interpretations.md)، والعلاقة بين المعنى والتمثيل.
*   يحوّل [**التصميم انطلاقًا من المعنى في Rust**](rust-dd/capability-algebras.md) ذلك المنظور إلى [قدرات صغيرة](rust-dd/capability-algebras.md)، و[امتدادات مشتقة](rust-dd/derived-meaning.md)، و[برامج من الرتبة الأولى](rust-dd/first-order-programs.md)، و[مفسرات خفيفة](rust-dd/interpreters.md).
*   تشرح [**المفاهيم**](concepts/index.md) و[**الرؤى**](insights/index.md) نماذج التنفيذ والترميزات والتحويلات والروابط المهمة.

المبادئ الدلالية مستقلة عن اللغة. لغة التنفيذ الأساسية هي Rust، ويربط [مسار لغوي متزامن](rust-dd/compiler-pipelines.md) هذه المبادئ بـ Tolang.

## لمن هذا الكتاب {#who-this-book-is-for}

*   المبرمجون الذين يريدون أن تظل البرمجيات المعقدة، مع تطورها، **وحداتية وقابلة للتركيب والاختبار والصيانة**.
*   المطورون الساعون إلى **ربط نظرية الفئات وأنظمة الأنواع وتصميم البرامج**.
*   القراء الملمّون بتقنيات التمثيل والتنفيذ، مثل [**المونادات الحرة**](concepts/free_monad.md)، و[**أسلوب تمرير الاستمرار (CPS)**](concepts/cps.md)، و[**إزالة الدوال**](concepts/defunctionalization.md)، والراغبون في فهم كيف تخدم تلك الآليات التصميم الذي يبدأ بالمعنى بدلًا من أن تحدده.
*   القراء الملمّون بـ [**الأنواع التابعة**](denotational-design/dependent-types.md) والبرمجة الموجّهة نحو البراهين، والراغبون في تطبيق هذا التصور عند كتابة Rust عالية الأداء.
*   المساهمون الذين يحتاجون إلى قراءة [مواصفات Rust التي تبدأ بالمعنى](rust-dd/capability-algebras.md) وفهم كيفية [ترجمة لغة متزامنة](rust-dd/compiler-pipelines.md) من دون جعل المترجم تعريفًا للغة.
