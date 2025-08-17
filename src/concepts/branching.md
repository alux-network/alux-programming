# Branching and Confluence

We encounter **branching** constantly in everyday life.
Imagine:

* You wake up and decide: ☕ coffee **or** 🍵 tea.
* If coffee: sugar or no sugar?
* If tea: green or black?

Each decision **branches** into alternatives, like a little decision tree.
But in the end, you don’t live in two universes — you end up with **one drink in your hand**.
That’s **confluence**: although choices branch, they merge back into one reality.

## Branching in Rust Programs

The same pattern appears in programs. A sequential program may branch internally, but execution always continues as a **single flow**.

### `if`

```rust
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

* **Branching:** program splits into one of three paths.
* **Confluence:** for a given input value, the same branch condition will always be chosen. Each input deterministically follows exactly one path, and evaluation of conditions happens in a fixed order (first check `x > 0`, then `x < 0`, else default). Regardless of which path is taken, the result is always determined from the input, and execution continues in a single, unified flow.

### `match`

```rust
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

* **Branching:** many alternatives.
* **Confluence:** for a given input value, the program deterministically selects exactly one matching branch. The essential property is that the *trace* of evaluation is deterministic: the same input always leads down the same path. In this simple example each branch yields the same type (`&str`), but even in settings with dependent types—where result types vary with input—the execution remains confluent because identical inputs always produce the same path and outcome.


### Loops with Early Exit

```rust
fn find_even(nums: &[i32]) -> Option<i32> {
    for &n in nums {
        if n % 2 == 0 {
            return Some(n); // branch: exit early
        }
    }
    None // confluence: reached if loop completes
}
```

* **Branching:** may exit during iteration.
* **Confluence:** one thread of control — either returns early or finishes and continues.

## Sequential Confluence Illustrated

```
Start
 ├─ branch A → ...
 └─ branch B → ...
           ↘
            Confluence → continues as one flow
```

Just like your morning drink decision, a program doesn’t split into parallel worlds.
Branches are **local alternatives**, but **sequential confluence** ensures only one actual path is taken, and execution rejoins into one future.

⚡ **Key idea:**
Branching explores alternatives, confluence merges them back.
In sequential programs, **confluence is guaranteed**: there’s always one final thread of execution.


## Confluence Beyond Determinism

Confluence is often explained as the guarantee that the same input always produces the same output. But its essence is deeper: **the trace of evaluation itself is deterministic**. This means the path through the program is uniquely determined by the input, independent of external factors. In Rust, both `if` and `match` enforce deterministic traces. More broadly, confluence is what allows reasoning about programs algebraically, since the same input always reduces in a predictable way.

## Trace Equivalence

**Trace equivalence** means that two programs, given the same input, follow evaluation paths that yield the **same observable behavior**: the same result and the same observable effects. In pure code (no effects), this reduces to producing the same result for all inputs. With side effects, equivalence also requires that the same conditions are evaluated in the same order.

**Example of not trace‑equivalent (side effect changes trace):**

```rust
fn is_admin() -> bool {
    println!("checked admin"); // side effect
    true
}
fn is_user() -> bool {
    println!("checked user"); // side effect
    true
}

fn classify_role(x: i32) -> &'static str {
    if is_admin() {
        "admin"
    } else if is_user() {
        "user"
    } else {
        "other"
    }
}
```

Here both `is_admin` and `is_user` return `true`, so the result is always `"admin"`. But the **trace differs**: if `is_admin` is checked first, only that prints; if conditions are reordered, `is_user` prints instead. The outcome is the same, but the traces differ, so the programs are **not trace‑equivalent**.

**Trace‑equivalent reorder (pure, disjoint, total):**

```rust
fn classify_a(x: i32) -> &'static str {
    if x < 0 { "neg" } else if x == 0 { "zero" } else { "pos" }
}
fn classify_b(x: i32) -> &'static str {
    if x == 0 { "zero" } else if x < 0 { "neg" } else { "pos" }
}
```

The predicates are disjoint and cover all integers; both versions return the same label for every input. With no side effects, these are **trace‑equivalent**.

## Bridge to Trees

Branching in programs naturally connects to tree structures. A sequence of decisions can be visualized as a decision tree: each internal node is a branching point, and each leaf is a possible outcome. Restricting to two alternatives at each branch gives **binary trees**, which are a cornerstone of computer science. This perspective shifts branching from a control-flow mechanism into a structural representation of possibilities.

Conal Elliott has described memory addressing as a kind of **perfect binary leaf trees**, where each memory cell corresponds to a leaf reached by a sequence of left/right choices. This view links the abstract branching structure of programs to the very way data is organized and accessed.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Bridge to Semantics

Confluence is also a fundamental property in programming language semantics. In lambda calculus, for example, the **Church–Rosser theorem** states that if an expression can be reduced in different ways, all reduction paths will converge to a common result. This reflects the same guarantee as sequential confluence in Rust: different branches don’t lead to diverging realities but ultimately rejoin into one meaning. This bridge from everyday branching to formal semantics helps build intuition for deeper topics in programming theory.

## Bridge to Bisimulation

Another important concept related to branching is **bisimulation**, used in process calculi and concurrency theory. Two systems are bisimilar if they can simulate each other’s steps: whenever one makes a move, the other can make a corresponding move, and the resulting states remain related. Unlike simple trace equivalence, bisimulation is sensitive to the structure of branching, not just final results. It ensures that two programs behave the same way under every possible interaction, making it a powerful tool for reasoning about equivalence in concurrent and interactive systems.

There are different **flavors** of bisimulation:

* **Strong bisimulation** – requires that every single step of one process can be matched by an identical step in the other, including internal or invisible actions.
* **Weak bisimulation** – abstracts away from internal or silent actions (often denoted τ). Two systems can be weakly bisimilar if they match on observable behavior, even if one performs extra internal steps.
* **Branching bisimulation** – a refinement of weak bisimulation that preserves the branching structure more carefully: even when ignoring internal actions, the branching points must align so that the choice structure is respected.

These distinctions are crucial in concurrency theory: strong bisimulation is very strict, weak bisimulation allows flexibility with internal computation, and branching bisimulation balances the two by maintaining the essential shape of choices while abstracting from unobservable details.

## Confluence and Bisimulation Compared

Although confluence and bisimulation both deal with branching and outcomes, they apply in different contexts:

* **Confluence** is about **deterministic evaluation**: for the same input, all reduction paths lead to the same result. It is mainly used in sequential semantics (e.g., lambda calculus) to prove consistency and simplify reasoning.
* **Bisimulation** is about **behavioral equivalence** between two possibly concurrent systems: whenever one system can make a step, the other can match it. It is mainly used in process calculi and concurrency theory to establish that two processes behave the same under all possible interactions.

In short:

* Confluence → guarantees **one meaning** for each program.
* Bisimulation → guarantees **two programs mean the same** in terms of behavior.

These notions complement each other: confluence helps ensure determinism in sequential computation, while bisimulation provides a robust notion of equivalence in concurrent or interactive computation.
