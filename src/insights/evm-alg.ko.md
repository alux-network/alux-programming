<!-- reader: {"title":"EVM 대수","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# EVM 대수 {#evm-algebra}

```admonish tip title="관련 항목"
Rust에서 의미로 설계하기: [인터프리터와 효과](../rust-dd/interpreters.md), [일차 프로그램](../rust-dd/first-order-programs.md), [언어와 컴파일러 파이프라인](../rust-dd/compiler-pipelines.md)  
개념: [작동 의미론](../concepts/operational_semantics.md), [자유 모나드](../concepts/free_monad.md), [연속 전달 스타일](../concepts/cps.md), [디펑셔널라이제이션](../concepts/defunctionalization.md)
```

<strong>이더리움 가상 머신(EVM)</strong>은 **이더리움 바이트코드**를 실행하는 스택 기반 가상 CPU입니다. Solidity, Vyper 또는 다른 EVM 호환 언어로 작성한 스마트 계약을 컴파일한 형식입니다.

가장 낮은 수준에서:

*   EVM은 **연산 코드**(ADD, PUSH, JUMP, SSTORE 등)를 처리합니다.
*   Execution state includes:
    *   **스택**: 피연산자를 담는 후입선출 데이터 스택.
    *   **메모리**: 임시 값을 위한 휘발성 바이트 배열.
    *   **저장소**: 각 계약을 위한 영속 키-값 저장소.
    *   **프로그램 카운터**: 다음 연산 코드의 위치.
    *   **가스**: 실행 단계마다 비용을 부과하는 계량 장치

## 인터프리터 패턴으로서의 EVM {#evm-as-an-interpreter-pattern}

EVM 클라이언트는 명령어 언어를 해석하는 인터프리터입니다:

*   **명령어 집합** = EVM 연산 코드 (변형의 열거형).
*   **프로그램** = 명령어 시퀀스.
*   **인터프리터** = 각 연산 코드가 기계 상태를 바꾸는 규칙.
*   **여러 인터프리터** = EVM 명세는 고정되어 있지만 Geth, Nethermind, Besu, Erigon은 같은 인터프리터의 대안 구현입니다.

이 책의 세 기법 **자유 모나드**, **연속 전달 스타일**, **디펑셔널라이제이션**을 관통하는 주제는 같습니다. *프로그램의 나머지*를 표현하는 방식만 다릅니다.

## 하나의 기계, 세 가지 인코딩 {#three-encodings-of-one-machine}

아래 각 인코딩은 같은 고정 프로그램을 실행합니다:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

그리고 모두 같은 관찰 결과를 냅니다:

```text
stack:   [5, 5]
storage: {1: 5}
```

제어, 즉 “다음에 할 일”을 표현하는 방식만 다릅니다.

<details>
<summary><strong>자유 모나드</strong> — 프로그램은 데이터이며 인터프리터가 의미를 부여합니다</summary>

명령어 펑터가 프로그램 트리를 생성합니다. `and_then`는 모나드 바인드이고 `run`는 인터프리터 하나입니다. 두 번째 인터프리터(바이트코드 컴파일러)가 같은 트리를 폴드할 수도 있습니다. 제네릭 `Free<A>`는 안정화 Rust에서 컴파일되도록 이 명령어 집합에 맞게 특수화되어 있습니다.

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
<summary><strong>연속 전달 스타일(CPS)</strong> — 각 연산 코드가 “프로그램의 나머지”를 호출합니다</summary>

각 핸들러는 작업을 한 다음 연속 실행 `k`를 호출합니다. `sload`은 로드한 값을 그 값을 기대하는 연속 실행에 전달합니다. 프로그램 데이터 구조 없이 중첩된 연속 실행으로 제어를 명시합니다.

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
<summary><strong>디펑셔널라이즈됨</strong> — 연산 호출이 데이터가 되고 하나의 <code>apply</code>가 실행합니다</summary>

자유 모나드와 CPS 버전은 연산(`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`)을 *호출*합니다. 이는 명세처럼 읽히는 작은 대수입니다. 디펑셔널라이제이션은 각 호출을 일차 데이터로 재구화합니다. 하나의 `apply` 함수가 데이터를 해석하고 연속 실행도 단순해집니다. “프로그램의 나머지”가 다음 인덱스(`pc`)가 됩니다. 이를 연산 대수를 데이터로 작성하고 `apply`라는 단일 인터프리터로 해석하는 것으로 읽어 보세요.

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

## 연속 실행에서 바이트코드까지 {#from-continuations-to-bytecode}

세 인코딩은 같은 계산을 기계와의 거리를 달리해 보여 줍니다:

*   **자유 모나드**는 프로그램을 데이터로 *대수적으로* 구성한 다음 해석합니다. 실행, 예쁘게 출력, 컴파일 등 여러 인터프리터가 같은 트리를 폴드할 수 있습니다.
*   **CPS**는 데이터 구조를 없애고 제어를 명시합니다. “이 연산 코드를 실행한 다음 연속 실행을 호출”하는 방식입니다. 로드된 값은 이를 필요로 하는 연속 실행에 전달됩니다.
*   **디펑셔널라이제이션**은 연산 *호출*을 일차 데이터로 바꾸고 하나의 `apply`로 이를 다시 읽습니다. 연속 실행은 `pc`을 통해 `Vec<Op>`로 합쳐집니다. 드라이버 루프는 클로저가 없는 CPS 트램펄린입니다.

```admonish note title="도출이 아닌 유사성"
EVM은 명시적인 프로그램 카운터가 디펑셔널라이즈된 제어 표현과 닮은 일차 추상 기계로 분석할 수 있습니다. 그러나 이런 구조적 유사성만으로 EVM 바이트코드가 CPS 변환 뒤 디펑셔널라이제이션을 거쳐 만들어졌다는 점이 증명되지는 않습니다.
```

## 핵심 통찰 {#key-insight}

| 개념 | 자유 모나드 세계 | EVM의 실제 모습 |
| --- | --- | --- |
| 명령어 타입 | 연산 코드 열거형 | 고정된 EVM 연산 코드 |
| 프로그램 표현 | `Free<A>`에서 구성한 트리 | 선형 바이트코드 배열 |
| 연속 실행 | 명령어 노드의 클로저 | 프로그램 카운터 (`pc`) |
| 인터프리터 | 프로그램 패턴 매칭 | 연산 코드 분기와 VM 상태 변경 |
| 여러 인터프리터 | 같은 프로그램을 서로 다르게 폴드 | 여러 이더리움 클라이언트 구현 |

## 실제 EVM에 대응시키기 {#how-this-maps-to-the-real-evm}

*   **명령어 집합** (`Free`의 변형 또는 `Op` 열거형)은 EVM 연산 코드 집합과 대응합니다.
*   **프로그램** (`Free` 트리, 중첩 연속 실행 또는 `Vec<Op>`)은 컴파일 전후의 계약입니다.
*   **인터프리터** (`run`, CPS 핸들러 또는 `apply`)는 Geth, Besu, Nethermind 같은 클라이언트가 구현하는 것입니다.
*   **기계 상태** (`stack`, `storage`)는 EVM의 스택, 메모리, 저장소입니다.
*   실제 EVM 바이트코드는 디펑셔널라이즈된 형태입니다. 프로그램 카운터로 색인하는 평면 명령어 배열로, 앞서 본 디펑셔널라이즈 인코딩과 정확히 같습니다.
