<!-- reader: {"title":"القوانين والسيناريوهات والأدلة"} -->

# القوانين والسيناريوهات والأدلة {#laws-scenarios-and-evidence}

```admonish tip title="ذات صلة"
المنظور الدلالي: [القوانين والتفسيرات](../denotational-design/laws-and-interpretations.md)  
التصميم انطلاقًا من المعنى في Rust: [المفسرات والآثار](interpreters.md)، [جبر القدرات](capability-algebras.md)  
المفاهيم: [التشعب والتلاقي](../concepts/branching.md)، [الشفافية المرجعية](../concepts/referential_transparency.md)
```

```admonish note title="تمهيد"
الاختبارات دليل على المواصفة. أكّد الملاحظات العامة والقوانين التي يدعمها المجال المختار، لا خطوات التنفيذ الخاصة، واجعل القوانين عامة بالنسبة إلى القدرة كي تُلزم كل المفسرات بها.
```

تحتاج الشيفرة التي تبدأ بالمعنى إلى اختبارات تبدأ بالمعنى. اختبر الملاحظات العامة والقوانين بدلًا من خطوات التنفيذ الخاصة.

## اختبر سطح المواصفة {#test-the-specification-surface}

````admonish warning title="اختبار مرتبط بالتمثيل"
يمتد هذا التأكيد إلى حقول حامل واحد، لذلك لا يستطيع أي مفسر آخر مشاركته:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

اختبار دلالي:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

قد يكون الاختبار الأول مناسبًا لوحدة تسلسل يكون موضوعها ترميز البتات. لكنه دليل ضعيف على جبر الفروع لأن التمثيلات البديلة لا تستطيع مشاركته.

## امتدادات قوانين قابلة لإعادة الاستخدام {#reusable-law-extensions}

عندما تنطبق خاصية على كل مفسر متوافق، اكتبها مرة واحدة:

```rust,noplayground
use anyhow::{Result, bail, ensure};
use extend::ext;

#[ext(name = BranchLawsExt)]
pub impl<This> This
where
    This: BranchAlg,
    This::Branch: Clone + Eq,
{
    fn check_branch_root_round_trip(&self, directions: &[Direction]) -> Result<()> {
        let root = self.branch_root();
        let branch = directions.iter().copied().fold(root.clone(), |branch, direction| self.branch_grow(&branch, direction));

        let Some(path) = self.branch_path(&root, &branch) else {
            bail!("grown branch has no path from root");
        };
        ensure!(path == directions, "root path did not round-trip");
        Ok(())
    }
}
```

يشغّل كل مفسر أداة التحقق نفسها. يحمل `anyhow::Result` النتيجة؛ ويبلّغ `bail!` عن الملاحظة المفقودة، بينما يتحقق `ensure!` من قانون الذهاب والإياب. وتميز الأداة بين الإخفاقين من دون الاعتماد على تمثيل فرع واحد.

## عائلات قوانين مفيدة {#useful-law-families}

ابحث عن الخصائص التي توحي بها البنية الدلالية:

*   الهوية
*   التجميعية
*   التبادلية، عندما تكون مقصودة فعلًا
*   الإدمبوتية
*   الذهاب والإياب
*   التوحيد المعياري
*   التنقيح
*   الرتابة
*   الاستبدال
*   اتفاق التفسيرات

```admonish warning title="لا تدّعِ سوى القوانين التي يدعمها المجال"
لا تضف مصطلحات جبرية مألوفة لمجرد أنها تبدو رياضية. اذكر القوانين التي يدعمها المجال المختار فقط.
```

## القوانين مقابل الثوابت التمثيلية {#laws-versus-representation-invariants}

أبقِها متميزة:

*   **قانون دلالي:** إعادة بناء فرع من مسار جذره تدل على الفرع نفسه.
    
*   **ثابت تمثيلي:** البتات العليا غير المستخدمة تساوي صفرًا.
    
*   **قانون التسلسل:**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **قانون التنسيق المعياري:**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

قد تكون جميعها مهمة، لكنها تنتمي إلى مواصفات مختلفة.

## سيناريوهات مشتركة {#shared-scenarios}

السيناريو تفاعل قابل لإعادة الاستخدام مكتوب على أساس القدرات العامة. ويمثل إطار اختبار ALUX السيناريوهات بهذه الطريقة: تبني شيفرة التأليف قيمة عبر قدرات `Scenario` و`DeployerIds` و`PlayAst` و`ScenarioSchedule` من دون تسمية مشغّل ملموس.

```rust,noplayground
#[ext(name = HelloScenarioExt)]
pub impl<This> This
where
    This: StandaloneScenario,
    This::Step: PlayAst<Ast = RProc>,
{
    fn hello(self) -> This::Scenario {
        self.scenario()
            .under_comprehensive(100)
            .step(
                self.play_ast(
                    self.deployer(0),
                    tolang! {
                        let x in {
                            x ! "hello" |
                            ? (a <- x) a.log()
                        }
                    },
                )
                .expect_log(r#""hello""#),
            )
    }
}
```

يصف كل استدعاء المعنى المؤلَّف لا آليات المشغّل. ويتطلب `under_comprehensive(100)` السجل المتوقع في تشغيل تسلسلي واحد، و100 تشغيل متزامن بحرية، وحتى 100 تشغيل بترتيبات مختلفة. يثبت السيناريو الملاحظة بينما يغيّر المشغّل ترتيب التنفيذ.

ينطبق المبدأ نفسه بين المفسرات: عندما تنفذ عدة مشغلات القدرات التي يستخدمها سيناريو ما، يستطيع كل منها تفسير التفاعل المؤلَّف نفسه. ويبقى الإعداد الخاص بالمشغل وفحص الحدود خارج السيناريو.

## الاتفاق بين المفسرات {#cross-interpreter-agreement}

عندما يكشف مفسران الملاحظة نفسها، قارنهما:

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

يكشف هذا الانحراف الذي تفوته اللقطات المستقلة. وهو قيّم بوجه خاص لتعريفات API ومراحل المترجم وتمثيلات البيانات البديلة.

## الدليل المحدود ليس برهانًا {#finite-evidence-is-not-proof}

يثبت الاختبار الناجح السلوك للمدخلات والتنفيذات المختبرة، لكنه لا يثبت قانونًا لكل القيم.

عزّز الثقة عمدًا:

1.  اختبارات الأمثلة
2.  اختبارات سيناريو قابلة لإعادة الاستخدام
3.  اختبارات خصائص مولّدة
4.  فحوص شاملة على المجالات المنتهية
5.  مقارنة النماذج
6.  آثار البراهين

اختر المستوى بحسب المخاطر وقوة الادعاء.

## ينبغي لأسماء الاختبارات أن تصرح بالمعنى {#test-names-should-state-meaning}

فضّل:

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

وتجنب الأسماء التي تسرد التنفيذ فحسب:

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

تظل الاختبارات التشغيلية صالحة عندما يكون ترتيب العمليات محددًا هو نفسه. سمِّ الملاحظة التي تجعل الترتيب ذا معنى.

## فحوص المراجعة {#review-checks}

*   هل لكل عملية دلالية جديدة قانون أو تأكيد محدد الهدف؟
*   هل الالتزامات القابلة لإعادة الاستخدام عامة بالنسبة إلى القدرات العامة؟
*   هل السيناريوهات منفصلة عن المشغلات الملموسة؟
*   هل تُميّز القوانين الدلالية عن الثوابت التمثيلية؟
*   هل تُقارن مفسرات متعددة متى كان ذلك عمليًا؟
*   هل يتجنب التوثيق وصف الاختبارات المحدودة بأنها براهين؟
