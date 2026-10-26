<!-- reader: {"title":"Алгебра EVM"} -->

# Алгебра EVM {#evm-algebra}

```admonish tip title="Пов’язані матеріали"
Проєктування від значення в Rust: [Інтерпретатори й ефекти](../rust-dd/interpreters.md), [Програми першого порядку](../rust-dd/first-order-programs.md), [Мова й конвеєри компілятора](../rust-dd/compiler-pipelines.md)  
Поняття: [Операційна семантика](../concepts/operational_semantics.md), [Вільна монада](../concepts/free_monad.md), [Стиль передавання продовжень](../concepts/cps.md), [Дефункціоналізація](../concepts/defunctionalization.md)
```

**Віртуальна машина Ethereum (EVM)** — це віртуальний процесор на основі стека, який виконує **байткод Ethereum** — скомпільовану форму смартконтрактів, написаних мовою Solidity, Vyper чи іншою сумісною з EVM мовою.

На найнижчому рівні:

*   EVM обробляє **опкоди** (ADD, PUSH, JUMP, SSTORE тощо).
*   Execution state includes:
    *   **Стек**: стек даних для операндів за принципом LIFO.
    *   **Пам’ять**: тимчасовий масив байтів для проміжних значень.
    *   **Сховище**: постійне сховище пар «ключ — значення» для кожного контракту.
    *   **Лічильник команд**: вказує на наступний опкод.
    *   **Газ**: облік витрат за кроки виконання.

## EVM як патерн інтерпретатора {#evm-as-an-interpreter-pattern}

Клієнт EVM — це інтерпретатор мови інструкцій:

*   **Набір інструкцій** = опкоди EVM (перелік варіантів).
*   **Програма** = послідовність інструкцій.
*   **Інтерпретатор** = правило, за яким кожен опкод змінює стан машини.
*   **Кілька інтерпретаторів** = специфікація EVM фіксована, але Geth, Nethermind, Besu та Erigon є альтернативними реалізаціями цього інтерпретатора.

Це наскрізна тема трьох методів у цій книжці — **вільних монад**, **стилю передавання продовжень** і **дефункціоналізації**, — які відрізняються лише способом представлення *решти програми*.

## Три кодування однієї машини {#three-encodings-of-one-machine}

У кожному наведеному нижче кодуванні виконується та сама фіксована програма:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

і кожне дає те саме спостереження:

```text
stack:   [5, 5]
storage: {1: 5}
```

Відрізняється лише спосіб представлення керування — «що робити далі».

<details>
<summary><strong>Вільна монада</strong> — програма є даними, а інтерпретатор надає їй значення</summary>

Функтор інструкцій породжує дерево програми. `and_then` — монадичне зв’язування, а `run` — один з інтерпретаторів; другий інтерпретатор (компілятор у байткод) може згорнути те саме дерево. Узагальнений `Free<A>` спеціалізовано для цього набору інструкцій, щоб він компілювався у стабільному Rust.

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
<summary><strong>Стиль передавання продовжень (CPS)</strong> — кожен опкод викликає «решту програми»</summary>

Кожен обробник виконує свою роботу, а потім викликає продовження `k`. `sload` передає завантажене значення продовженню, яке на нього очікує. Керування явне й представлене вкладеними продовженнями; структури даних програми взагалі немає.

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
<summary><strong>Дефункціоналізований</strong> — виклики операцій стають даними, які виконує один <code>apply</code></summary>

Там, де версії з вільною монадою та CPS *викликають* операції (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) — невелику алгебру, що майже читається як специфікація, — дефункціоналізація перетворює кожен виклик на дані першого порядку. Потім одна функція `apply` інтерпретує ці дані, а продовження також згортаються: «решта програми» стає наступним індексом (`pc`). Це алгебра операцій, записана як дані, з єдиним інтерпретатором `apply`.

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

## Від продовжень до байткоду {#from-continuations-to-bytecode}

Ці три кодування показують те саме обчислення на різній відстані від машини:

*   **Вільна монада** алгебраїчно будує програму *як дані*, а потім інтерпретує її. Те саме дерево можуть згорнути різні інтерпретатори: один запускає його, інший форматує, ще інший компілює.
*   **CPS** усуває структуру даних і робить керування явним: «виконай цей опкод, а тоді виклич продовження». Завантажене значення передається продовженню, якому воно потрібне.
*   **Дефункціоналізація** перетворює *виклики* операцій на дані першого порядку й знову зчитує їх однією функцією `apply`, а продовження згортаються в `pc` над `Vec<Op>`. Цикл-драйвер — це трамплін CPS без замикань.

```admonish note title="Аналогія, а не виведення"
EVM можна аналізувати як абстрактну машину першого порядку, явний лічильник команд якої нагадує дефункціоналізоване представлення керування. Однак сама ця структурна аналогія не доводить, що байткод EVM отримано перетворенням CPS із подальшою дефункціоналізацією.
```

## Основне осяяння {#key-insight}

| Поняття | Світ вільних монад | Реальна EVM |
| --- | --- | --- |
| Тип інструкцій | Перелік опкодів | Фіксовані опкоди EVM |
| Представлення програми | Дерево, побудоване з `Free<A>` | Лінійний масив байткоду |
| Продовження | Замикання у вузлі інструкції | Лічильник команд (`pc`) |
| Інтерпретатор | Зіставлення програми з шаблоном | Вибір опкоду й зміна стану віртуальної машини |
| Кілька інтерпретаторів | Різні згортання тієї самої програми | Кілька реалізацій клієнта Ethereum |

## Як це відповідає реальній EVM {#how-this-maps-to-the-real-evm}

*   **Набір інструкцій** (варіанти `Free` або перелік `Op`) відповідає набору опкодів EVM.
*   **Програма** (дерево `Free`, вкладені продовження чи `Vec<Op>`) — це контракт до й після компіляції.
*   **Інтерпретатор** (`run`, обробники CPS чи `apply`) реалізує клієнт на кшталт Geth, Besu чи Nethermind.
*   **Стан машини** (`stack`, `storage`) охоплює стек, пам’ять і сховище EVM.
*   Справжній байткод EVM є дефункціоналізованою формою: пласким масивом інструкцій з індексом-лічильником команд, точно як наведене вище дефункціоналізоване кодування.
