<!-- reader: {"title":"EVM-Algebra","sourceHash":"sha256:da120bbcd539c9554e41570500a952022780145a38a60d99226ed7f248d561ca"} -->

# EVM-Algebra {#evm-algebra}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Interpreter und Effekte](../rust-dd/interpreters.md), [Programme erster Ordnung](../rust-dd/first-order-programs.md), [Sprach- und Compiler-Pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Operationale Semantik](../concepts/operational_semantics.md), [Freie Monade](../concepts/free_monad.md), [Continuation-Passing Style](../concepts/cps.md), [Defunktionalisierung](../concepts/defunctionalization.md)
```

Die **Ethereum Virtual Machine (EVM)** ist eine stapelbasierte virtuelle CPU, die **Ethereum-Bytecode** ausführt, also die kompilierte Form von Smart Contracts in Solidity, Vyper oder einer anderen EVM-kompatiblen Sprache.

Auf der untersten Ebene:

*   Die EVM verarbeitet **Opcodes** (ADD, PUSH, JUMP, SSTORE usw.).
*   Execution state includes:
    *   **Stapel**: LIFO-Datenstapel für Operanden.
    *   **Speicher**: vorübergehendes Byte-Array für temporäre Werte.
    *   **Persistenter Speicher**: dauerhafter Schlüssel-Wert-Speicher für jeden Vertrag.
    *   **Programmzähler**: verweist auf den nächsten Opcode.
    *   **Gas**: misst die Ausführungskosten der einzelnen Schritte.

## Die EVM als Interpreter-Muster {#evm-as-an-interpreter-pattern}

Ein EVM-Client ist ein Interpreter für eine Instruktionssprache:

*   **Instruktionsmenge** = EVM-Opcodes (ein Enum mit Varianten).
*   **Programm** = eine Folge von Instruktionen.
*   **Interpreter** = die Regel, nach der jeder Opcode den Maschinenzustand ändert.
*   **Mehrere Interpreter** = Die EVM-Spezifikation ist festgelegt; Geth, Nethermind, Besu und Erigon sind alternative Implementierungen desselben Interpreters.

Drei Techniken ziehen sich durch dieses Buch — **freie Monaden**, **Continuation-Passing Style** und **Defunktionalisierung** — und unterscheiden sich nur darin, wie sie *den Rest des Programms* darstellen.

## Drei Kodierungen einer Maschine {#three-encodings-of-one-machine}

Jede der folgenden Kodierungen führt dasselbe festgelegte Programm aus:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

und jede erzeugt dieselbe Beobachtung:

```text
stack:   [5, 5]
storage: {1: 5}
```

Sie unterscheiden sich nur darin, wie die Steuerung — „was als Nächstes zu tun ist“ — dargestellt wird.

<details>
<summary><strong>Freie Monade</strong> — das Programm sind Daten; ein Interpreter gibt ihnen Bedeutung</summary>

Der Instruktionsfunktor erzeugt einen Programmbaum. `and_then` ist monadisches Binden, und `run` ist ein Interpreter — ein zweiter Interpreter (ein Compiler zu Bytecode) könnte denselben Baum falten. Das generische `Free<A>` ist auf diese Instruktionsmenge spezialisiert, damit es mit stabilem Rust kompiliert.

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
<summary><strong>Continuation-Passing Style (CPS)</strong> — jeder Opcode ruft den „Rest des Programms“ auf</summary>

Jeder Handler erledigt seine Arbeit und ruft dann die Fortsetzung `k` auf. `sload` übergibt den geladenen Wert an eine Fortsetzung, die ihn erwartet. Die Steuerung ist als verschachtelte Fortsetzungen explizit; eine Programmdatenstruktur gibt es nicht.

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
<summary><strong>Defunktionalisiert</strong> — Operationsaufrufe werden zu Daten, die von einem <code>apply</code> ausgeführt werden</summary>

Während freie Monaden und CPS-Versionen Operationen (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) *aufrufen* — eine kleine Algebra, die fast wie eine Spezifikation zu lesen ist —, reifiziert die Defunktionalisierung jeden Aufruf als Daten erster Ordnung. Eine einzige `apply`\-Funktion interpretiert diese Daten; auch die Fortsetzungen werden zusammengezogen: Der „Rest des Programms“ wird zum nächsten Index (`pc`). Man kann es als Operationsalgebra lesen, die als Daten geschrieben ist und `apply` als einzigen Interpreter verwendet.

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

## Von Fortsetzungen zu Bytecode {#from-continuations-to-bytecode}

Die drei Kodierungen stellen dieselbe Berechnung dar, jeweils in unterschiedlicher Nähe zur Maschine:

*   **Freie Monade** konstruiert das Programm *algebraisch* als Daten und interpretiert es anschließend. Derselbe Baum kann von mehreren Interpretern gefaltet werden: einem, der ihn ausführt, einem Pretty-Printer und einem Compiler.
*   **CPS** entfernt die Datenstruktur und macht die Steuerung explizit: „Führe diesen Opcode aus und rufe dann die Fortsetzung auf.“ Der geladene Wert fließt zur Fortsetzung, die ihn benötigt.
*   **Defunktionalisierung** verwandelt Operations*aufrufe* in Daten erster Ordnung und liest sie mit einem `apply` wieder aus; Fortsetzungen werden zu einem `pc` über einem `Vec<Op>` zusammengeführt. Die Treiberschleife ist ein CPS-Trampolin ohne Closures.

```admonish note title="Analogie, keine Herleitung"
Die EVM lässt sich als abstrakte Maschine erster Ordnung mit explizitem Programmzähler analysieren, der einer defunktionalisierten Steuerungsrepräsentation ähnelt. Diese strukturelle Analogie beweist für sich genommen nicht, dass EVM-Bytecode aus einer CPS-Transformation mit anschließender Defunktionalisierung hervorgegangen ist.
```

## Zentrale Erkenntnis {#key-insight}

| Konzept | Welt der freien Monade | EVM-Wirklichkeit |
| --- | --- | --- |
| Instruktionstyp | Enum der Opcodes | Festgelegte EVM-Opcodes |
| Programmdarstellung | Baum aus `Free<A>` aufgebaut | Lineares Bytecode-Array |
| Fortsetzung | Closure im Instruktionsknoten | Programmzähler (`pc`) |
| Interpreter | Pattern Matching über das Programm | Nach Opcode verzweigen und VM-Zustand verändern |
| Mehrere Interpreter | Verschiedene Faltungen desselben Programms | Mehrere Implementierungen von Ethereum-Clients |

## Übertragung auf die reale EVM {#how-this-maps-to-the-real-evm}

*   Die **Instruktionsmenge** (die Varianten von `Free` oder das Enum `Op`) spiegelt die Menge der EVM-Opcodes wider.
*   Das **Programm** (ein `Free`\-Baum, verschachtelte Fortsetzungen oder eine `Vec<Op>`) ist der Vertrag vor und nach der Kompilierung.
*   Der **Interpreter** (`run`, CPS-Handler oder `apply`) wird von einem Client wie Geth, Besu oder Nethermind implementiert.
*   Der **Maschinenzustand** (`stack`, `storage`) besteht aus Stapel, Speicher und persistentem Speicher der EVM.
*   Realer EVM-Bytecode ist die defunktionalisierte Form: ein flaches Instruktionsarray mit Programmzählerindex, genau wie die oben gezeigte defunktionalisierte Kodierung.
