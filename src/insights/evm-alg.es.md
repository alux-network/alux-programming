<!-- reader: {"title":"Álgebra EVM"} -->

# Álgebra EVM {#evm-algebra}

```admonish tip title="Relacionado"
Diseño basado en el significado en Rust: [Intérpretes y efectos](../rust-dd/interpreters.md), [Programas de primer orden](../rust-dd/first-order-programs.md), [Lenguaje y procesos de compilación](../rust-dd/compiler-pipelines.md)  
Conceptos: [Semántica operacional](../concepts/operational_semantics.md), [Mónada libre](../concepts/free_monad.md), [Estilo de paso de continuaciones](../concepts/cps.md), [Defuncionalización](../concepts/defunctionalization.md)
```

La **máquina virtual de Ethereum (EVM)** es una CPU virtual basada en pila que ejecuta el **bytecode de Ethereum**, la forma compilada de los contratos inteligentes escritos en Solidity, Vyper u otro lenguaje compatible con la EVM.

En el nivel más bajo:

*   La EVM procesa **códigos de operación** (ADD, PUSH, JUMP, SSTORE, etc.).
*   Execution state includes:
    *   **Pila**: pila de datos LIFO para operandos.
    *   **Memoria**: matriz transitoria de bytes para valores temporales.
    *   **Almacenamiento**: almacén persistente de pares clave-valor para cada contrato.
    *   **Contador de programa**: apunta al siguiente código de operación.
    *   **Gas**: medición que cobra por los pasos de ejecución.

## La EVM como patrón Intérprete {#evm-as-an-interpreter-pattern}

Un cliente de la EVM es un intérprete de un lenguaje de instrucciones:

*   **Conjunto de instrucciones** = códigos de operación de la EVM (una enumeración de variantes).
*   **Programa** = una secuencia de instrucciones.
*   **Intérprete** = la regla que indica cómo cada código de operación modifica el estado de máquina.
*   **Varios intérpretes** = la especificación de la EVM es fija, pero Geth, Nethermind, Besu y Erigon son implementaciones alternativas del mismo intérprete.

Este es el hilo conductor de tres técnicas de este libro: **mónadas libres**, **estilo de paso de continuaciones** y **defuncionalización**, que solo difieren en cómo representan el *resto del programa*.

## Tres codificaciones de una máquina {#three-encodings-of-one-machine}

Cada codificación de abajo ejecuta el mismo programa fijo:

```text
push 2; push 3; add; sstore 1 5; load 1 -> v; push v
```

y todas producen la misma observación:

```text
stack:   [5, 5]
storage: {1: 5}
```

Solo difieren en la representación del control (es decir, «qué hacer a continuación»)

<details>
<summary><strong>Mónada libre</strong> — el programa son datos; un intérprete les da significado</summary>

El functor de instrucciones genera un árbol de programa. `and_then` es el bind monádico y `run` es un intérprete; un segundo intérprete (un compilador a bytecode) podría plegar el mismo árbol. El genérico `Free<A>` se especializa para este conjunto de instrucciones a fin de compilar con Rust estable.

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
<summary><strong>Estilo de paso de continuaciones (CPS)</strong> — cada código de operación llama al «resto del programa»</summary>

Cada manejador realiza su trabajo y luego invoca la continuación `k`. `sload` pasa el valor cargado a una continuación que lo espera. El control queda explícito mediante continuaciones anidadas, sin ninguna estructura de datos de programa.

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
<summary><strong>Defuncionalizado</strong> — las llamadas a operaciones se convierten en datos ejecutados por un único <code>apply</code></summary>

Mientras las versiones de mónada libre y CPS *llaman* a las operaciones (`push(2)`, `add()`, `sstore(1, 5)`, `sload(1)`) —un álgebra pequeña que casi parece una especificación—, la defuncionalización reifica cada llamada como datos de primer orden. Después, una sola función `apply` interpreta esos datos, y las continuaciones también se reducen: el «resto del programa» pasa a ser el siguiente índice (`pc`). Léelo como el álgebra de operaciones expresada en datos, con `apply` como su único intérprete.

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

## De las continuaciones al bytecode {#from-continuations-to-bytecode}

Las tres codificaciones representan el mismo cálculo desde distintas distancias respecto a la máquina:

*   **La mónada libre** construye algebraicamente el programa *como datos* y luego lo interpreta. El mismo árbol puede plegarse con varios intérpretes: uno que lo ejecuta, otro que lo imprime de forma legible y otro que lo compila.
*   **CPS** elimina la estructura de datos y hace explícito el control: «ejecuta este código de operación y luego llama a la continuación». El valor cargado llega a la continuación que lo necesita.
*   **La defuncionalización** convierte las *llamadas* a operaciones en datos de primer orden y las interpreta con un único `apply`, mientras que las continuaciones se reducen a un `pc` sobre un `Vec<Op>`. El bucle controlador es un trampoline CPS sin cierres.

```admonish note title="Analogía, no derivación"
La EVM se puede analizar como una máquina abstracta de primer orden cuyo contador de programa explícito se asemeja a una representación de control defuncionalizada. Esta analogía estructural no demuestra por sí misma que el bytecode de la EVM se haya obtenido mediante una transformación CPS seguida de defuncionalización.
```

## Idea clave {#key-insight}

| Concepto | En el modelo de mónada libre | Realidad de la EVM |
| --- | --- | --- |
| Tipo de instrucción | Enumeración de códigos de operación | Códigos de operación fijos de la EVM |
| Representación del programa | Árbol construido con `Free<A>` | Matriz lineal de bytecode |
| Continuación | Cierre en el nodo de instrucción | Contador de programa (`pc`) |
| Intérprete | Coincidencia de patrones sobre el programa | Selección según el código de operación y modificación del estado de la máquina virtual |
| Varios intérpretes | Distintos pliegues del mismo programa | Varias implementaciones de clientes de Ethereum |

## Correspondencia con la EVM real {#how-this-maps-to-the-real-evm}

*   El **conjunto de instrucciones** (las variantes de `Free` o la enumeración `Op`) refleja el conjunto de códigos de operación de la EVM.
*   El **programa** (un árbol `Free`, continuaciones anidadas o un `Vec<Op>`) es el contrato antes y después de la compilación.
*   El **intérprete** (`run`, los manejadores CPS o `apply`) es lo que implementa un cliente como Geth, Besu o Nethermind.
*   El **estado de máquina** (`stack`, `storage`) comprende la pila, la memoria y el almacenamiento de la EVM.
*   El bytecode real de la EVM tiene forma defuncionalizada: es una matriz plana de instrucciones indexada por un contador de programa, justo como en la codificación defuncionalizada anterior.
