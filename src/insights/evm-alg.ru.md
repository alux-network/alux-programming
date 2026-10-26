<!-- reader: {"title":"Алгебра EVM","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# Алгебра EVM {#evm-algebra}

```admonish tip title="Связанные материалы"
«Проектирование на основе смысла в Rust»: [Интерпретаторы и эффекты](../rust-dd/interpreters.md), [Программы первого порядка](../rust-dd/first-order-programs.md), [Язык и конвейеры компилятора](../rust-dd/compiler-pipelines.md)  
«Понятия»: [Операционная семантика](../concepts/operational_semantics.md), [Свободная монада](../concepts/free_monad.md), [Стиль передачи продолжений](../concepts/cps.md), [Дефункционализация](../concepts/defunctionalization.md)
```

**Виртуальная машина Ethereum (EVM)** — это стековый виртуальный процессор, который исполняет **байткод Ethereum** — скомпилированное представление смарт-контрактов, написанных на Solidity, Vyper или другом совместимом с EVM языке.

На самом низком уровне:

*   EVM обрабатывает **опкоды** (ADD, PUSH, JUMP, SSTORE и т. д.).
*   Execution state includes:
    *   **Стек**: стек данных LIFO для операндов.
    *   **Память**: временный массив байтов для промежуточных значений.
    *   **Хранилище**: постоянное хранилище пар «ключ — значение» каждого контракта.
    *   **Счётчик команд**: указывает на следующую операцию.
    *   **Газ**: единица учёта, в которой оплачиваются шаги выполнения.

## EVM как паттерн интерпретатора {#evm-as-an-interpreter-pattern}

Клиент EVM — интерпретатор языка инструкций:

*   **Набор инструкций** = опкоды EVM (перечисление вариантов).
*   **Программа** = последовательность инструкций.
*   **Интерпретатор** = правило изменения состояния машины для каждой операции.
*   **Несколько интерпретаторов** = спецификация EVM неизменна, но Geth, Nethermind, Besu и Erigon — альтернативные реализации одного интерпретатора.

В этом и состоит связь трёх методов книги — **свободных монад**, **стиля передачи продолжений** и **дефункционализации**, — различающихся только представлением *оставшейся части программы*.

## Три кодирования одной машины {#three-encodings-of-one-machine}

Каждое кодирование ниже выполняет одну и ту же фиксированную программу:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

и каждое выдаёт одно и то же наблюдение:

```text
stack:   [5, 5]
storage: {1: 5}
```

Различается только способ представления управления — «что делать дальше».

<details>
<summary><strong>Свободная монада</strong> — программа является данными; интерпретатор придаёт им смысл</summary>

Функтор инструкций порождает дерево программы. `and_then` — монадическая операция bind, а `run` — один из интерпретаторов; второй интерпретатор (компилятор в байткод) может свернуть то же дерево. Обобщённый `Free<A>` специализируется для этого набора инструкций, чтобы компилироваться в стабильном Rust.

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
<summary><strong>Стиль передачи продолжений (CPS)</strong> — каждая операция вызывает «оставшуюся часть программы»</summary>

Каждый обработчик выполняет свою работу, а затем вызывает продолжение `k`. `sload` передаёт загруженное значение продолжению, которое его ожидает. Управление явно представлено вложенными продолжениями; структуры данных программы нет.

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
<summary><strong>Дефункционализированная форма</strong> — вызовы операций становятся данными, которые выполняет один <code>apply</code></summary>

В версиях со свободной монадой и CPS операции *вызываются* (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) — это небольшая алгебра, почти похожая на спецификацию. Дефункционализация реифицирует каждый вызов в данные первого порядка. Затем один метод `apply` интерпретирует эти данные, а продолжения тоже сворачиваются: «оставшаяся часть программы» становится следующим индексом (`pc`). Это алгебра операций, записанная в виде данных, и её единственный интерпретатор `apply`.

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

## От продолжений к байткоду {#from-continuations-to-bytecode}

Три кодирования — одна и та же программа, показанная на разном расстоянии от машины:

*   **Свободная монада** строит программу *алгебраически* в виде данных, а затем интерпретирует её. То же дерево могут сворачивать разные интерпретаторы: один запускает его, другой форматирует, третий компилирует.
*   **CPS** убирает структуру данных и делает управление явным: «выполни эту операцию, затем вызови продолжение». Загруженное значение передаётся нужному продолжению.
*   **Дефункционализация** превращает *вызовы* операций в данные первого порядка и считывает их одной операцией `apply`; продолжения сворачиваются в `pc` на `Vec<Op>`. Цикл-драйвер — это трамплин CPS без замыканий.

```admonish note title="Аналогия, а не вывод"
EVM можно рассматривать как абстрактную машину первого порядка с явным счётчиком команд, напоминающим дефункционализированное представление управления. Эта структурная аналогия сама по себе не доказывает, что байткод EVM получен CPS-преобразованием с последующей дефункционализацией.
```

## Основная мысль {#key-insight}

| Понятие | Мир свободных монад | Реальность EVM |
| --- | --- | --- |
| Тип инструкции | Перечисление операций | Фиксированный набор операций EVM |
| Представление программы | Дерево, построенное из `Free<A>` | Линейный массив байткода |
| Продолжение | Замыкание внутри узла инструкции | Счётчик команд (`pc`) |
| Интерпретатор | Сопоставление с образцом для программы | Выбор операции и изменение состояния виртуальной машины |
| Несколько интерпретаторов | Разные свёртки одной программы | Несколько реализаций клиента Ethereum |

## Связь с настоящей EVM {#how-this-maps-to-the-real-evm}

*   **Набор инструкций** (варианты `Free` или перечисление `Op`) отражает набор операций EVM.
*   **Программа** (дерево `Free`, вложенные продолжения или `Vec<Op>`) — это контракт до и после компиляции.
*   **Интерпретатор** (`run`, обработчики CPS или `apply`) — то, что реализует клиент вроде Geth, Besu или Nethermind.
*   **Состояние машины** (`stack`, `storage`) — это стек, память и хранилище EVM.
*   Настоящий байткод EVM — дефункционализированная форма: плоский массив инструкций с индексом-счётчиком команд, в точности как в кодировании выше.
