# Branching and confluence

```admonish tip title="Related"
The Semantic View: [Denotations and compositionality](../denotational-design/denotations.md), [Laws and interpretations](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Laws, scenarios, and evidence](../rust-dd/laws.md)  
Concepts: [Operational semantics](operational_semantics.md)
```

Branching, determinism, confluence, trace equivalence, and bisimulation all concern alternatives in computation. They are not the same property.

```admonish note title="Semantic placement"
Control-flow branching is operational structure. Confluence is a property of a reduction relation. Trace equivalence and bisimulation compare behaviors. Denotational equality compares meanings in a chosen semantic domain. A sound design states which equality it needs rather than moving between these notions informally.
```

## Behavioral equivalence

Concurrent and interactive programs rarely have only one final result. A standard starting point is a **labeled transition system**:

$$
\mathcal{L} = (S, A_{\tau}, \to)
$$

where $S$ is a set of states, $A_{\tau}$ is a set of observable action labels together with an internal action $\tau$, and $\to\;\subseteq S \times A_{\tau} \times S$ is the transition relation. We write $p \xrightarrow{a} p'$ when state $p$ can perform action $a$ and become $p'$.

A behavioral equivalence specifies which differences between such systems are intentionally forgotten:

* **linear-time observations** follow completed or partial executions and record what happened along them
* **branching-time observations** also retain where alternatives were available and when choices were resolved

Two systems can therefore admit the same traces while differing in branching structure. One may choose between two actions before an interaction, while another postpones that choice until afterward. The action sequences agree, but their future possibilities do not.

Van Glabbeek's [linear-time–branching-time spectrum][linear-branching-spectrum] gives the standard systematic account of these behavioral equivalences. It is not a ranking from weak to strong; each point preserves a different collection of observations.

## Branching in Rust programs

An `if` selects one branch according to a condition:

```rust,noplayground
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

A `match` selects one arm according to a value:

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

For fixed inputs in a deterministic language, these constructs select a predictable control-flow path. That property is **determinism**, not confluence.

## What confluence means

A reduction relation is confluent when two reductions from the same term can be joined again:

$$
\begin{array}{ccccc}
&& a && \\
& \swarrow^{*} && \searrow^{*} & \\
b &&&& c \\
& \searrow^{*} && \swarrow^{*} & \\
&& d &&
\end{array}
$$

Formally, if:

$$
a \to^* b
\quad\text{and}\quad
a \to^* c
$$

then there must be some `d` such that:

$$
b \to^* d
\quad\text{and}\quad
c \to^* d
$$

Confluence permits more than one reduction path. It says those paths are compatible in the sense that they can reach a common successor.

## Determinism and confluence

A deterministic reduction relation has at most one next step from each state. It is therefore confluent in a straightforward sense: there are no competing one-step choices to reconcile.

The converse does not hold. A system may allow several reduction orders and still be confluent because all orders eventually agree.

Ordinary Rust `if` and `match` expressions demonstrate deterministic selection. They do not by themselves illustrate the interesting content of confluence.

## Church–Rosser

The Church–Rosser theorem states a confluence property for lambda-calculus reduction. If a term reduces to two results by different reduction paths, those results have a common reduct.

When a normal form exists, confluence implies that it is unique. This supports equational reasoning because evaluation order does not change the final normal form.

Do not generalize this result to arbitrary imperative programs. Side effects, nondeterministic scheduling, failure, and observation of intermediate states may distinguish reduction orders.

## Traces

A **trace** records a sequence of observable actions or states. Trace semantics intentionally preserves more operational information than a result-only semantics.

Two pure functions can return the same result while evaluating through different internal steps. They are equal in a result denotation if those steps are forgotten. They are not necessarily equal in a trace semantics.

With effects, reordering conditions may change observations:

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

Checking `is_admin` first and checking `is_user` first can return equivalent classifications while printing different traces.

The design question is whether those prints belong to the chosen semantic domain.

## Trace equivalence

Two systems are trace-equivalent when they admit the same observable traces under the selected trace model.

Trace equivalence can forget branching structure. Two systems may generate the same traces even when one commits to a choice earlier than the other. For interactive and concurrent systems, that distinction may matter.

## Bisimulation

Bisimulation relates two transition systems step by step. Whenever one system makes an observable move, the other must be able to match it, and the resulting states must remain related.

Common variants include:

* **strong bisimulation**, which matches individual transitions
* **weak bisimulation**, which abstracts from selected internal transitions
* **branching bisimulation**, which abstracts from internal work while preserving important choice structure

Bisimulation is often a stronger behavioral comparison than trace equivalence because it observes how alternatives remain available during interaction.

<details>
<summary><strong>Origins and formal definitions</strong></summary>

Milner developed observational equivalence for communicating processes in [*A Calculus of Communicating Systems*][milner-ccs]. Park then characterized the corresponding equivalence coinductively in [*Concurrency and Automata on Infinite Sequences*][park-bisimulation], giving the greatest-fixed-point relation and proof method now known as bisimulation. Milner adopted and developed this method as a foundation for reasoning about process behavior.

**Strong bisimulation.** For labeled transition systems, a relation $R$ is a strong bisimulation when $p\mathrel{R}q$ implies, for every action $a$:

* if $p\xrightarrow{a}p'$, then some $q'$ satisfies $q\xrightarrow{a}q'$ and $p'\mathrel{R}q'$; and
* if $q\xrightarrow{a}q'$, then some $p'$ satisfies $p\xrightarrow{a}p'$ and $p'\mathrel{R}q'$.

Two states are bisimilar when some bisimulation relates them. The definition is coinductive: after matching a transition, the successor states must satisfy the same behavioral obligation again.

**Branching bisimulation.** In a common divergence-blind presentation, a symmetric relation $R$ is a branching bisimulation when $p\mathrel{R}q$ and $p\xrightarrow{a}p'$ imply either:

* $a = \tau$ and $p'\mathrel{R}q$, or
* there are states $q_0$ and $q'$ such that

  $$
  q \xRightarrow{\tau} q_0 \xrightarrow{a} q',
  \qquad
  p\mathrel{R}q_0,
  \qquad
  p'\mathrel{R}q'
  $$

Here $\xRightarrow{\tau}$ denotes zero or more internal transitions. Requiring the intermediate state $q_0$ to remain related to $p$ is what preserves the relevant branching potential while allowing internal work to be ignored. Van Glabbeek and Weijland introduced and developed this equivalence in [*Branching Time and Abstraction in Bisimulation Semantics*][branching-bisimulation].

</details>

## Denotational equality

Denotational equality depends on the selected semantic domain:

$$
\llbracket P \rrbracket = \llbracket Q \rrbracket
$$

The domain might itself be built from traces, transition systems modulo bisimulation, sets of outcomes, or another mathematical model. Denotational Design does not prescribe one universal equality. It requires the equality to be chosen explicitly and used compositionally.

The relationship is:

1. Begin with the operational system.
2. Select the relevant observations.
3. Choose the semantic domain and equality.

## Branching as data

Branching also appears structurally in trees. A binary path can be represented as a sequence of left/right decisions. This representation is useful for tries, execution identifiers, decision diagrams, and memory addressing.

The semantic branch-position example in [Why meaning comes first](../denotational-design/semantic-view.md) deliberately separates this tree meaning from one bit-vector encoding.

Conal Elliott has described memory addressing through perfect binary leaf-tree structure. The point is not that every machine literally stores a source-level tree; it is that a compositional tree model can reveal useful structure hidden by flat numeric addresses.

<figure>
  <iframe
    width="100%"
    height="315"
    src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ"
    title="Conal Elliott — memory addressing as a perfect binary leaf tree"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
  <figcaption>Conal Elliott — memory addressing as a perfect binary leaf tree</figcaption>
</figure>

## Comparison

| Concept | Subject | Central question |
| --- | --- | --- |
| Control-flow branching | One program execution | Which continuation is selected? |
| Determinism | Transition relation | Is the next step uniquely determined? |
| Confluence | Reduction relation | Can divergent reductions be joined? |
| Trace equivalence | Observable action sequences | Do systems admit the same traces? |
| Bisimulation | Branching transition structure | Can systems match each other's moves? |
| Denotational equality | Chosen semantic domain | Do programs have the same specified meaning? |

These notions can support one another, but none should be used as a synonym for another.

## Further reading

* [*A Calculus of Communicating Systems*][milner-ccs] — Milner's foundational development of CCS and observational equivalence
* [*Concurrency and Automata on Infinite Sequences*][park-bisimulation] — Park's coinductive characterization of bisimulation
* [*Algebraic Laws for Nondeterminism and Concurrency*][hennessy-milner-laws] — Hennessy and Milner on observational congruence and algebraic laws
* [*What Is Branching Time and Why Use It?*][why-branching-time] ([compressed PDF][why-branching-time-pdf]) — a concise motivation for preserving branching structure
* [*The Linear Time–Branching Time Spectrum*][linear-branching-spectrum] — the standard taxonomy of behavioral equivalences
* [*Branching Time and Abstraction in Bisimulation Semantics*][branching-bisimulation] — the foundational treatment of branching bisimulation
* [*Three Logics for Branching Bisimulation*][three-logics] — logical characterizations through Hennessy–Milner-style logics and CTL* without next-time

[milner-ccs]: https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf
[park-bisimulation]: https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf
[hennessy-milner-laws]: https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf
[why-branching-time]: https://theory.stanford.edu/~rvg/branching/
[why-branching-time-pdf]: https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz
[linear-branching-spectrum]: https://ir.cwi.nl/pub/5685/5685.pdf
[branching-bisimulation]: https://ir.cwi.nl/pub/5564/5564D.pdf
[three-logics]: https://ir.cwi.nl/pub/1370/1370D.pdf
