<!-- reader: {"title":"جبر EVM","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# جبر EVM {#evm-algebra}

```admonish tip title="ذات صلة"
التصميم انطلاقًا من المعنى في Rust: [المفسرات والآثار](../rust-dd/interpreters.md)، [برامج من الرتبة الأولى](../rust-dd/first-order-programs.md)، [مسارات اللغة والمترجم](../rust-dd/compiler-pipelines.md)  
المفاهيم: [الدلالات التشغيلية](../concepts/operational_semantics.md)، [الموناد الحر](../concepts/free_monad.md)، [أسلوب تمرير الاستمرار](../concepts/cps.md)، [إزالة الدوال](../concepts/defunctionalization.md)
```

**آلة Ethereum الافتراضية (EVM)** وحدة معالجة افتراضية مكدسية تنفذ **شيفرة Ethereum البايتية**، أي الصيغة المجمعة للعقود الذكية المكتوبة بـ Solidity أو Vyper أو لغة أخرى متوافقة مع EVM.

على المستوى الأدنى:

*   تعالج EVM **شفرات العمليات** (ADD وPUSH وJUMP وSSTORE وغيرها).
*   Execution state includes:
    *   **المكدس**: مكدس بيانات أخير ما يدخل أول ما يخرج للمعاملات.
    *   **الذاكرة**: مصفوفة بايتات مؤقتة للقيم المؤقتة.
    *   **التخزين**: مخزن دائم أزواج مفتاح/قيمة لكل عقد.
    *   **عداد البرنامج**: يشير إلى شفرة العملية التالية.
    *   **الغاز**: قياس يفرض تكلفة على خطوات التنفيذ.

## EVM بوصفها نمط مفسر {#evm-as-an-interpreter-pattern}

عميل EVM مفسر للغة تعليمات:

*   **مجموعة التعليمات** = شفرات عمليات EVM (تعداد لصيغ متعددة).
*   **البرنامج** = تسلسل من التعليمات.
*   **المفسر** = قاعدة كيفية تغيير كل شفرة عملية لحالة الآلة.
*   **المفسرات المتعددة** = مواصفة EVM ثابتة، لكن Geth وNethermind وBesu وErigon تطبيقات بديلة للمفسر نفسه.

هذا هو الخيط الواصل بين ثلاث تقنيات في هذا الكتاب — **المونادات الحرة** و**أسلوب تمرير الاستمرار** و**إزالة الدوال** — التي لا تختلف إلا في طريقة تمثيلها *بقية البرنامج*.

## ثلاثة ترميزات لآلة واحدة {#three-encodings-of-one-machine}

ينفذ كل ترميز أدناه البرنامج الثابت نفسه:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

وتنتج عنها جميعًا الملاحظة نفسها:

```text
stack:   [5, 5]
storage: {1: 5}
```

لا تختلف إلا في تمثيل التحكم — «ما الذي ينبغي فعله تاليًا».

<details>
<summary><strong>الموناد الحر</strong> — البرنامج بيانات؛ ويمنحه مفسر معنى</summary>

ينشئ فونكتور التعليمات شجرة برنامج. و`and_then` هو الربط المونادي، و`run` مفسر واحد — ويمكن لمفسر ثانٍ (مترجم إلى الشيفرة البايتية) طي الشجرة نفسها. ويُخصص `Free<A>` العام لمجموعة التعليمات هذه لكي يُجمَّع في Rust المستقرة.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// The free monad over the EVM instruction set: a program is data — a tree of
// instructions ending in `Pure`, each carrying its continuation.
enum Free<A> {
    Pure(A),
    Push(u64, Box<Free<A>>),
    Add(Box<Free<A>>),
    SStore(u64, u64, Box<Free<A>>),
    SLoad(u64, Box<dyn FnOnce(u64) -> Free<A>>),
}

impl<A: 'static> Free<A> {
    // Monadic bind: graft `k` onto every leaf of the program.
    fn and_then<B: 'static>(self, k: impl FnOnce(A) -> Free<B> + 'static) -> Free<B> {
        match self {
            Free::Pure(a) => k(a),
            Free::Push(v, next) => Free::Push(v, Box::new(next.and_then(k))),
            Free::Add(next) => Free::Add(Box::new(next.and_then(k))),
            Free::SStore(x, y, next) => Free::SStore(x, y, Box::new(next.and_then(k))),
            Free::SLoad(key, cont) => Free::SLoad(key, Box::new(move |v| cont(v).and_then(k))),
        }
    }
}

fn push(v: u64) -> Free<()> { Free::Push(v, Box::new(Free::Pure(()))) }
fn add() -> Free<()> { Free::Add(Box::new(Free::Pure(()))) }
fn sstore(k: u64, v: u64) -> Free<()> { Free::SStore(k, v, Box::new(Free::Pure(()))) }
fn sload(k: u64) -> Free<u64> { Free::SLoad(k, Box::new(|v| Free::Pure(v))) }

// Interpreter: give the program data meaning against the machine state.
fn run(mut prog: Free<()>, st: &mut State) {
    loop {
        prog = match prog {
            Free::Pure(()) => return,
            Free::Push(v, next) => { st.stack.push(v); *next }
            Free::Add(next) => {
                let b = st.stack.pop().unwrap();
                let a = st.stack.pop().unwrap();
                st.stack.push(a + b);
                *next
            }
            Free::SStore(k, v, next) => { st.storage.insert(k, v); *next }
            Free::SLoad(k, cont) => { let v = *st.storage.get(&k).unwrap_or(&0); cont(v) }
        };
    }
}

fn main() {
    let program = push(2)
        .and_then(|_| push(3))
        .and_then(|_| add())
        .and_then(|_| sstore(1, 5))
        .and_then(|_| sload(1))
        .and_then(|v| push(v));

    let mut st = State { stack: vec![], storage: HashMap::new() };
    run(program, &mut st);
    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

<details>
<summary><strong>أسلوب تمرير الاستمرار (CPS)</strong> — تستدعي كل شفرة عملية «بقية البرنامج»</summary>

ينفذ كل معالج عمله ثم يستدعي الاستمرارية `k`. و`sload` يمرر القيمة المحملة إلى استمرارية تتوقعها. ويصبح التحكم صريحًا عبر استمراريات متداخلة، من دون أي بنية بيانات للبرنامج.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// Each opcode does its work, then calls the continuation `k` = "the rest of
// the program". `sload` passes the loaded value on to its continuation.
fn push(st: &mut State, v: u64, k: impl FnOnce(&mut State)) {
    st.stack.push(v);
    k(st);
}
fn add(st: &mut State, k: impl FnOnce(&mut State)) {
    let b = st.stack.pop().unwrap();
    let a = st.stack.pop().unwrap();
    st.stack.push(a + b);
    k(st);
}
fn sstore(st: &mut State, key: u64, val: u64, k: impl FnOnce(&mut State)) {
    st.storage.insert(key, val);
    k(st);
}
fn sload(st: &mut State, key: u64, k: impl FnOnce(&mut State, u64)) {
    let v = *st.storage.get(&key).unwrap_or(&0);
    k(st, v);
}

fn main() {
    let mut st = State { stack: vec![], storage: HashMap::new() };

    push(&mut st, 2, |st| {
        push(st, 3, |st| {
            add(st, |st| {
                sstore(st, 1, 5, |st| {
                    sload(st, 1, |st, v| {
                        push(st, v, |_st| {});
                    });
                });
            });
        });
    });

    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

<details>
<summary><strong>أزيلت دواله</strong> — تصبح استدعاءات العمليات بيانات يشغلها <code>apply</code> واحد</summary>

بينما *تستدعي* نسختا الموناد الحر وCPS العمليات (`push(2)` و`add()` و`sstore(1, 5)` و`sload(1)`) — وهو جبر صغير يكاد يُقرأ كمواصفة — تجسّد إزالة الدوال كل استدعاء في بيانات من الرتبة الأولى. ثم تفسر تلك البيانات `apply` دالة واحدة، وتنهار الاستمراريات أيضًا: تصبح «بقية البرنامج» الفهرس التالي (`pc`). اقرأها بوصفها جبر العمليات مكتوبًا كبيانات، مع `apply` مفسره الوحيد.

```rust
use std::collections::HashMap;

struct State { stack: Vec<u64>, storage: HashMap<u64, u64> }

// The EVM algebra reified: where the other encodings CALL `push(2)`, `add()`,
// `sstore(1, 5)`, `sload(1)`, each such call becomes a first-order value — a
// tag with its arguments.
enum Op {
    Push(u64),
    Add,
    SStore(u64, u64),
    SLoad(u64),
}

// `apply` is the single interpreter for the reified operations: it gives each
// tag its meaning against the machine state.
fn apply(op: &Op, st: &mut State) {
    match op {
        Op::Push(v) => st.stack.push(*v),
        Op::Add => {
            let b = st.stack.pop().unwrap();
            let a = st.stack.pop().unwrap();
            st.stack.push(a + b);
        }
        Op::SStore(k, v) => { st.storage.insert(*k, *v); }
        Op::SLoad(k) => {
            let v = *st.storage.get(k).unwrap_or(&0);
            st.stack.push(v);
        }
    }
}

fn main() {
    // The program is now data: a flat list of reified operation calls.
    let code = vec![
        Op::Push(2),
        Op::Push(3),
        Op::Add,
        Op::SStore(1, 5),
        Op::SLoad(1),
    ];

    // `pc` is the defunctionalized continuation: "the rest of the program" is
    // just the next index.
    let mut st = State { stack: vec![], storage: HashMap::new() };
    let mut pc = 0;
    while pc < code.len() {
        apply(&code[pc], &mut st);
        pc += 1;
    }

    println!("stack:   {:?}", st.stack);
    println!("storage: {:?}", st.storage);
}
```

</details>

## من الاستمراريات إلى الشيفرة البايتية {#from-continuations-to-bytecode}

الترميزات الثلاثة هي الحساب نفسه على مسافات مختلفة من الآلة:

*   ينشئ **الموناد الحر** البرنامج *جبريًا* كبيانات، ثم يفسره. ويمكن طي الشجرة نفسها عبر عدة مفسرات: لتشغيلها أو طباعتها الجميلة أو تجميعها.
*   يزيل **أسلوب تمرير الاستمرار (CPS)** بنية البيانات ويجعل التحكم صريحًا: «نفذ شفرة العملية هذه ثم استدعِ الاستمرارية». وتتدفق القيمة المحملة إلى الاستمرارية التي تحتاج إليها.
*   يحوّل **إزالة الدوال** *استدعاءات* العمليات إلى بيانات من الرتبة الأولى، ويقرأها بدالة `apply` واحدة، بينما تنهار الاستمراريات إلى `pc` على `Vec<Op>`. حلقة القيادة هي منحدر CPS بلا إغلاقات.

```admonish note title="تشبيه، لا اشتقاق"
يمكن تحليل EVM بوصفها آلة مجردة من الرتبة الأولى يشبه عداد برنامجها الصريح تمثيلًا للتحكم أزيلت دواله. لكن هذا التشابه البنيوي لا يثبت وحده أن شيفرة EVM البايتية نتجت عن تحويل CPS أعقبته إزالة للدوال.
```

## الرؤية الأساسية {#key-insight}

| المفهوم | عالم الموناد الحر | واقع EVM |
| --- | --- | --- |
| نوع التعليمة | تعداد لشفرات العمليات | شفرات عمليات EVM ثابتة |
| تمثيل البرنامج | شجرة مبنية من `Free<A>` | مصفوفة شيفرة بايتية خطية |
| الاستمرارية | إغلاق في عقدة التعليمة | عداد البرنامج (`pc`) |
| المفسر | مطابقة أنماط البرنامج | تبديل شفرة العملية وتعديل حالة الآلة الافتراضية |
| مفسرات متعددة | طيات مختلفة للبرنامج نفسه | تطبيقات متعددة لعملاء Ethereum |

## كيفية انطباق ذلك على EVM الحقيقية {#how-this-maps-to-the-real-evm}

*   تعكس **مجموعة التعليمات** (صيغ `Free` أو تعداد `Op`) مجموعة شفرات عمليات EVM.
*   يمثل **البرنامج** (شجرة `Free` أو استمراريات متداخلة أو `Vec<Op>`) العقد قبل التجميع وبعده.
*   يمثل **المفسر** (`run` أو معالجات CPS أو `apply`) ما ينفذه عميل مثل Geth أو Besu أو Nethermind.
*   تمثل **حالة الآلة** (`stack` و`storage`) المكدس والذاكرة والتخزين في EVM.
*   شيفرة EVM البايتية الحقيقية هي الصيغة التي أزيلت دوالها: مصفوفة تعليمات مسطحة مفهرسة بعداد برنامج، تمامًا مثل الترميز منزوع الدوال أعلاه.
