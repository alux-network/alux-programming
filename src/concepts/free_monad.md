# Free monad

```admonish tip title="Related"
Design by Meaning in Rust: [First-order programs](../rust-dd/first-order-programs.md), [Interpreters and effects](../rust-dd/interpreters.md)  
Concepts: [Continuation-passing style](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [EVM algebra](../insights/evm-alg.md)
```

```admonish note title="Semantic placement"
A free monad is a representation of instruction syntax with freely generated sequencing. The instruction functor already chooses a vocabulary; an interpreter then maps that syntax into a semantic domain. It is one powerful encoding, not the definition of Denotational Design.
```

## What is a free monad (Rust version)

A **free monad** lets you:

* **Describe** a program as *data* - not by running it right away.
* **Interpret** that program later in one or more ways.

Think of it as:

> An AST of effectful operations + `bind`/`flat_map` to chain them.

You split:

* **Syntax** → enum of instructions.
* **Interpretation** → a structure-preserving map into a chosen semantic domain.

“Free” means that the monad structure is generated from a functor `F` without adding equations beyond the monad laws. Choosing `F` already chooses instruction syntax; interpreting the resulting program supplies a particular denotation.

## Rust implementation

```admonish warning title="Schematic encoding"
Rust lacks direct higher-kinded type parameters, so a production free-monad encoding needs additional type-level machinery or a specialized instruction functor. The following code illustrates the intended shape; it is not a drop-in generic implementation.
```

### Free monad type

```rust,noplayground
#[derive(Clone)]
enum Free<F, A> {
    Pure(A),
    Suspend(F),
    FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>),
}

impl<F: Clone + 'static, A: 'static> Free<F, A> {
    fn pure(a: A) -> Self {
        Free::Pure(a)
    }

    fn flat_map<B: 'static, G>(self, f: G) -> Free<F, B>
    where
        G: Fn(A) -> Free<F, B> + 'static,
        F: 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            Free::Suspend(op) => {
                Free::FlatMap(Box::new(Free::Suspend(op)), Box::new(f))
            }
            Free::FlatMap(inner, g) => {
                Free::FlatMap(inner, Box::new(move |x| g(x).flat_map(f.clone())))
            }
        }
    }
}
```

### DSL: console operations

```rust,noplayground
#[derive(Clone)]
enum Console<A> {
    Print(String, A),
    ReadLine(fn(String) -> A),
}

// Smart constructors
fn print_line(s: &str) -> Free<Console<()>, ()> {
    Free::Suspend(Console::Print(s.to_string(), ()))
}

fn read_line() -> Free<Console<String>, String> {
    Free::Suspend(Console::ReadLine(|input| Free::Pure(input)))
}
```

### Interpreter

```rust,noplayground
fn run_console<A>(mut prog: Free<Console<A>, A>) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(Console::Print(s, next)) => {
                println!("{}", s);
                prog = Free::Pure(next);
            }
            Free::Suspend(Console::ReadLine(f)) => {
                let mut buf = String::new();
                std::io::stdin().read_line(&mut buf).unwrap();
                prog = f(buf.trim().to_string());
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op), // minimal handling
                _ => unimplemented!(),
            },
        }
    }
}
```

### Usage

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## Takeaway

* **Syntax** = `enum Console` (possible instructions)
* **Program** = `Free<Console, A>` (data describing steps)
* **Concrete interpretation** = `run_console`
* Benefit: You can write multiple interpreters for the same program — e.g., run in real IO, log to a file, or compile to another language.

## Correlation to continuations and CPS

**Continuation-Passing Style (CPS)** is a way of writing programs where functions never return values directly but instead pass results to another function (the _continuation_) that represents “the rest of the program.”

A **free monad** is basically a **program as a sequence of steps**, where each step says:

> "Do this, then continue with the rest."

That “rest of the program” is exactly a **continuation** — a function from the current result to the next step.

* In our Rust free monad:

  ```rust,noplayground
  Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
  ```

  the `Box<dyn Fn(A) -> Free<F, A>>` **is the continuation**.

* When you interpret a free monad, you are **running in CPS**:

  * Instead of returning values directly, you pass them into the next continuation.
  * You end up in a loop of:
    `current_instruction -> feed result into continuation -> next instruction`

* **CPS relation**:

  * Free monads *encode CPS in a data structure*.
  * CPS *is the runtime control flow representation* of the same idea.

**Quick mapping**:

| Concept      | In CPS                   | In Free Monad AST          |
| ------------ | ------------------------ | -------------------------- |
| Step result  | Argument to continuation | `A` in `Fn(A) -> Free`     |
| Continuation | Function `(A) -> R`      | `Box<dyn Fn(A) -> Free>`   |
| Program      | Nested continuations     | Nested `FlatMap` variants  |
| Execution    | Calling functions        | Pattern matching + calling |

## GoF (Gang of Four) design patterns mapping

Free monads are **not** in GoF because they’re from functional programming theory, but they **subsume** or **emulate** several patterns:

| GoF Pattern     | How Free Monad Relates | 
| --------------- | --- |
| **Interpreter** | The whole “AST + run” is literally Interpreter pattern — free monads just give you the AST + combinators for free. |
| **Command**     | Each `enum` variant in the DSL is a Command object. The free monad chains them like a macro-command.               |
| **Composite**   | The AST structure (nested instructions) is a Composite of commands.                                                |
| **Builder**     | The `.flat_map` chain is a fluent builder for programs.                                                            |
| **Visitor**     | The interpreter is essentially a visitor over the instruction set.                                                 |

## Why free monad > these patterns

* GoF patterns are **manual OOP work** - you define interfaces, classes, and compose them.
* Free monads are **algebraic** - you define *data* for instructions and *functions* to interpret them.
* You automatically get:

  * Sequencing (`flat_map`)
  * Composition
  * Multiple interpreters without touching core logic

**Summary Table**:

| Free Monad FP concept | Equivalent GoF/OOP pattern |
| --------------------- | -------------------------- |
| Instruction enum      | Command                    |
| Program AST           | Composite                  |
| `flat_map` builder    | Builder                    |
| Interpreter fn        | Interpreter / Visitor      |
| Multiple interpreters | Strategy                   |


## Relation to defunctionalization

**Defunctionalization** is a program transformation that replaces higher-order functions with a first-order data structure that represents the possible functions, plus an interpreter that applies them.

In CPS, continuations are higher-order functions. Defunctionalizing a CPS program replaces those continuations with an enum of continuation cases and an `apply` function to run them.

A free monad can, for suitable encodings, be related to defunctionalized continuations inside a CPS-transformed program:

1. Start with a CPS version of your program. The "rest of the program" is carried in continuation functions.
2. Defunctionalize those continuation functions into a finite set of cases in a data type.
3. The resulting first-order data type can have the same instruction-and-continuation shape as a free-monad representation.

**Key similarities**

* Both free monads and defunctionalization produce a data representation of computation and require an interpreter to give meaning to that data.
* The `FlatMap` case in a free monad holds the continuation; defunctionalization replaces that closure with a case in a data type.

**Key differences**

| Aspect  | Defunctionalization | Free Monad |
| ------- | --- | --- |
| Purpose | Mechanical compiler technique to remove higher-order functions | Algebraic construction to separate syntax from semantics |
| Input   | Any higher-order program, often in CPS form                    | A functor F describing possible instructions             |
| Output  | Enum of function cases plus apply function                     | `Free<F, A>` AST plus interpreters                       |
| Monad?  | Not necessarily                                                | Always a monad by construction                           |
| Scope   | General transformation                                         | Specific functional programming pattern                  |

**Summary**
Defunctionalization is a transformation technique. Free monads are an algebraic construction. They are closely related in some representations, but neither construction generally implies the other without additional assumptions.
