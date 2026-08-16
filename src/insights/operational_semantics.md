# Semantics to machines

```admonish tip title="Related"
Design by Meaning in Rust: [First-order programs](../rust-dd/first-order-programs.md), [Language and compiler pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Operational semantics](../concepts/operational_semantics.md), [Free monad](../concepts/free_monad.md), [Continuation-passing style](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md)
```

## What operational semantics describes

Operational semantics specifies how a chosen program representation behaves. It defines evaluation judgments or a transition relation over configurations such as:

$$
(\mathit{program}, \mathit{state}) \longrightarrow
(\mathit{program}', \mathit{state}')
$$

The program might be source syntax, a free-monad value, a CPS term, bytecode, or a defunctionalized machine state. None of those representations *is* operational semantics. Operational semantics is the account of how values in the chosen representation evaluate or step.

This direction matters. A representation gives us something whose behavior can be described; adding an operational description does not explain what the language ought to mean.

## Free-monad programs

A free monad supplies instruction syntax together with freely generated sequencing. It does not supply the behavior of those instructions.

An operational semantics for a free-monad program can define configurations containing the current instruction, its continuation, and any machine state. Its rules then explain, for example, how a suspended instruction changes the state and passes its result to the remaining program.

That is one possible interpretation. The same free program may instead be folded into a denotational model, compiled into another language, analyzed, or rendered without being executed.

<details>
<summary><strong>From free to freer: what the research discovered</strong></summary>

Readers who encountered free monads as a general architecture for effectful programs may wonder why the conversation later moved toward freer constructions, extensible effects, and handlers. The research did not simply discard free monads. It isolated what they genuinely provide, measured where their common representations fail, and carried the useful structure forward.

Kiselyov and Ishii derive freer monads by progressively removing constraints and boilerplate from representations of effectful terms. In the freer representation, an instruction may produce an intermediate type hidden from the final program type, and an explicit continuation connects that result to the rest of the computation. The instruction signature therefore no longer needs a `Functor` instance.

That change improves expressiveness, but does not by itself solve performance. A direct freer representation still composes continuations like left-associated list append: processing a chain of $n$ requests can take $O(n^2)$ work. Exposing the continuation makes the real opportunity visible—it can be stored as a type-aligned sequence whose adjacent result and input types match by construction. Efficient concatenation of that sequence removes the association-sensitive traversal.

Open unions then let an extensible-effects interpreter add, combine, and eliminate selected request types. This addresses modular effect composition and handler structure. It still does not provide the equations of a particular domain or decide when two effectful programs mean the same thing.

The conclusion is more precise than “freer is better than free.” Free monads revealed a valuable separation between requests and interpretation. Freer encodings removed an unnecessary constraint; type-aligned queues addressed a measured performance problem; extensible effects improved composition. Each step retained knowledge from the previous one while narrowing the claim being made. Semantic interpretation remained a separate decision throughout.

See Kiselyov and Ishii, [*Freer Monads, More Extensible Effects*][freer-effects].

</details>

## CPS programs

Continuation-Passing Style (CPS) represents the rest of a computation explicitly as a continuation. An operational semantics for CPS describes behavior such as:

- evaluating the current CPS expression;
- passing a produced value to its continuation;
- transferring control when that continuation is applied.

CPS exposes control in a form that is convenient to describe operationally, but it is a representation or program transformation—not an operational semantics. Relating a direct-style program to its CPS translation requires stated source and target semantics plus a preservation argument.

<details>
<summary><strong>Beyond CPS: when continuations must be inspected</strong></summary>

CPS is a standard cure for association-sensitive append and bind. Instead of repeatedly traversing a left-associated structure, it represents the remaining computation through function composition. When the only operation on that continuation is eventual application, this representation can be efficient.

Van der Ploeg and Kiselyov identify the boundary: some consumers must examine or modify an intermediate result before continuing. Nondeterministic search, iteratees, free monads, and extensible effects can all require such access. CPS hides the conceptual sequence inside a function, so recovering intermediate structure requires reflection back into data and can erase the performance advantage.

Their alternative represents the hidden sequence directly as a type-aligned data structure. It supports efficient composition regardless of association while preserving efficient access to intermediate results. The types ensure that each stored computation produces the input expected by the next one.

The broader conclusion is not that type-aligned sequences defeat CPS. It is that CPS is excellent for *applying* continuations and less suitable when a consumer must *inspect* them. Research on delimited control sharpens the lesson further: instead of treating the whole future as one undifferentiated continuation, delimiters state which portion of the surrounding computation may be captured and manipulated.

These ideas did not disappear. Their lessons continue in effect handlers, abstract-machine derivations, typed control operators, and efficient effect representations. What changed was the expectation that CPS alone should be the final abstraction.

See van der Ploeg and Kiselyov, [*Reflection without Remorse*][reflection-remorse]. For the wider control setting, see Kiselyov’s [continuations and delimited-control collection][delimited-control].

</details>

## Defunctionalized machines

Defunctionalization replaces a known family of function values, such as CPS continuations, with first-order constructors and an `apply` operation. Operational semantics can then describe transitions between the resulting explicit configurations.

Under a concrete CPS transformation followed by defunctionalization, those transitions can derive an abstract machine. This is a powerful derivation, but not a definition of operational semantics in general: operational rules need not originate in CPS, and an arbitrary first-order machine is not thereby a defunctionalized continuation machine.

<details>
<summary><strong>Reynolds: where defunctionalization began</strong></summary>

John C. Reynolds introduced defunctionalization in his 1972 study of definitional interpreters. His starting point was not a first-order virtual machine but a higher-order interpreter: functions in the defining language represented environments, continuations, and other parts of the language being defined.

The transformation observes the finite family of function abstractions that can occur in the whole program. It replaces each abstraction with a first-order constructor carrying the values of its free variables, then replaces function application with one `apply` operation that dispatches on those constructors. What had been implicit in the defining language becomes an explicit algebra of closures or continuations.

Applied to a continuation-based interpreter, this move exposes a machine: continuation constructors become control states, captured variables become stored machine data, and `apply` becomes the transition dispatcher. The machine is not guessed first; it is derived from a higher-order evaluator.

Reynolds also emphasized the cost of this clarity. The resulting machine contains representation choices that are correct but not unique. Different constructor choices or prior transformations can produce different collections of machine-like “cogs and wheels” while preserving the same behavior. Defunctionalization therefore reveals an operational structure, not the one inevitable meaning of the language.

Danvy and Nielsen later systematized Reynolds’s technique as a whole-program transformation and studied refunctionalization as its inverse. Their deeper conclusion is that the transformation is a bridge: it can transfer specifications and correctness arguments between higher-order definitions and first-order machines, and it can reveal that apparently unrelated programs are two representations of the same structure.

This research lineage gives the technique its proper authority. Defunctionalization is more than replacing closures with an enum, but less than a universal foundation: it is a semantics-preserving passage between representations whose correspondence must be established.

See Reynolds, [*Definitional Interpreters for Higher-Order Programming Languages*][reynolds-definitional], and Danvy and Nielsen, [*Defunctionalization at Work*][defunctionalization-at-work].

</details>

## The operational representation cycle

A recurring mistake is to search for one operational representation that solves every programming problem. Each representation recovers something hidden by the previous one, but makes another concern harder:

$$
\text{higher-order program}
\longrightarrow \text{free syntax}
\longrightarrow \text{CPS}
\longrightarrow \text{first-order machine}
\longrightarrow \text{higher abstraction}
$$

The arrows do not claim a necessary compiler pipeline. They show a recurring design movement: expose what the current representation hides, then hide the machinery introduced by that exposure.

| Representation | What it makes available | Pressure it introduces |
| --- | --- | --- |
| Higher-order functions | Direct composition and host-language abstraction | A generic consumer can call a function, but cannot inspect its hidden structure |
| Free syntax with sequencing | Programs as data that can be composed and interpreted | Domain equations, normalization, efficient evaluation, and inspection of stored functions are not provided by freeness |
| CPS | Evaluation order and the rest of the computation become explicit | A whole-program CPS encoding threads continuations through nearly every interface |
| Defunctionalized, first-order control | Continuations become inspectable, serializable cases | Constructors, stored arguments, transition states, and an `apply` operation must be maintained explicitly |
| A higher abstraction over the machine | The machinery becomes easier to use | The structure is hidden again when a compiler, scheduler, debugger, or optimizer needs to inspect it |

The pressures are structural. Inspection requires data. Turning behavior into data introduces constructors and an interpreter. Hiding those constructors restores convenient abstraction but removes the very access required by consumers that analyze or transform programs.

The free-monad tradeoff is especially instructive. A free monad solves one precise problem: it generates sequencing for an instruction functor without imposing equations beyond the monad laws. That guarantee is also its limit. It does not know the laws of the domain. If two writes to the same cell should be equivalent to the final write, the free program still contains both instructions until a domain-specific normalization or interpretation identifies them. Optimization, canonical form, and semantic equality must therefore come from somewhere else.

Nor does reifying instructions make the entire program uniformly inspectable. In common encodings, a suspended instruction is visible but its continuation is a host-language function. A generic analyzer cannot inspect the future structure behind that function without supplying a result and applying it. Reifying the continuation restores inspection by moving toward a first-order or defunctionalized representation—and returns us to the next part of the cycle.

Evaluation cost is likewise representation-dependent. A naïve tree of left-associated binds can require repeated traversal and quadratic work. A transformation that duplicates residual subprograms can cause exponential growth. Codensity-style, freer, or specialized encodings can improve particular costs, but they do so by choosing different representations and tradeoffs. Exponential growth is possible; it is not an intrinsic law of free monads.

This is why a free monad is not a universal solution. It provides syntax with lawful sequencing, not the intended domain equations, a canonical normal form, complete structural visibility, or an automatically efficient implementation. Likewise, CPS need not spread through an entire system when used locally, and defunctionalization is cumbersome only in proportion to the family of functions and captured values it must reify.

The cycle appears when each new encoding is asked to become the universal foundation. It solves the previous operational inconvenience, then becomes the next source of accidental complexity.

This is why debates over the “best abstraction” do not converge when they remain entirely operational. Higher-order functions, free syntax, CPS, and first-order machines are compared as though one must dominate the others. But *better* has no meaning until the comparison states what must be preserved and who must consume the result:

- direct execution rewards ordinary calls and hidden representation;
- transformation and analysis require inspectable structure;
- serialization requires first-order data;
- extensibility may favor adding interpretations or adding syntax, but rarely both equally;
- concurrency may require observations that deliberately ignore many scheduling choices.

These are different requirements, not successive proofs that one abstraction is universally superior. Operational properties can help choose an implementation for a stated purpose; they cannot supply the purpose or decide which distinctions are meaningful.

The same caution applies to sequential thinking. Operational semantics can describe concurrent and nondeterministic systems, but a single sequence of machine steps is only one possible representation of their behavior. If schedule order is made authoritative too early, equivalent executions become different merely because their mechanics were interleaved differently. The semantic model must first decide which observations distinguish concurrent programs; operational schedules can then be judged against that decision.

## Real example: the EVM

The Ethereum Virtual Machine (EVM) can be understood operationally:

- **State**: program counter, stack, memory, storage, gas
- **Transition rules**: one for each opcode (`ADD`, `PUSH`, `SSTORE`, etc.)
- **Execution**: repeatedly apply small-step rules until halting

EVM bytecode is first-order instruction data. An operational account specifies how an EVM configuration changes for each opcode; a concrete client implements that behavior.

Its dispatch loop and program counter may resemble a defunctionalized abstract machine. Calling them defunctionalized continuations, however, requires a concrete higher-order source, transformation, and correspondence—not merely a similar-looking loop.

## Breaking the cycle: meaning before machinery

Operational and denotational accounts answer different questions:

$$
\begin{aligned}
\llbracket p \rrbracket &\in D
&& \text{what does the program mean?} \\
c &\longrightarrow c'
&& \text{how does this representation step?}
\end{aligned}
$$

A meaning-first development chooses the semantic domain, composition, observations, and laws before committing to a machine representation. Once a transition system is chosen, its correctness obligation connects the two layers. For a suitably defined meaning of complete configurations, a typical silent-step preservation claim has the form:

$$
c \longrightarrow c'
\quad \Longrightarrow \quad
\operatorname{meaning}(c) = \operatorname{meaning}(c')
$$

The exact relation may instead use observational equivalence, traces, or bisimilarity. What matters is that the machine is accountable to the intended meaning.

Denotational Design does not choose a winner from the cycle. It establishes a stable source of authority outside it:

1. Define the semantic domain, operations, composition, and laws.
2. Write programs in terms of that meaning.
3. Choose a representation for a concrete consumer: direct execution, inspection, compilation, scheduling, serialization, or analysis.
4. Relate every chosen representation and transformation back to the same meaning.

A higher-order interpreter and a first-order program may therefore coexist. Neither has to be the language definition. The first can serve direct execution; the second can serve consumers that need structure. Their agreement is a semantic obligation rather than an assumption that their mechanics are identical.

```admonish note title="No final operational abstraction"
Every operational representation exposes some structure and hides another. Meaning is the stable point from which appropriate representations can be chosen and related.
```

## Summary

- Operational semantics describes evaluation or transitions for a chosen representation.
- Free monads provide instruction syntax and sequencing whose behavior still requires an interpretation.
- CPS exposes continuations; operational rules may describe how CPS programs pass values and control.
- Defunctionalization can turn a particular higher-order program into a first-order machine whose transitions can be stated operationally.
- Treating any one of these encodings as universal creates a cycle of reifying and hiding structure.
- Denotational meaning determines what those transitions must preserve.

[freer-effects]: https://okmij.org/ftp/Haskell/extensible/more.pdf
[reflection-remorse]: https://okmij.org/ftp/Haskell/zseq.pdf
[delimited-control]: https://okmij.org/ftp/continuations/index.html
[reynolds-definitional]: https://homepages.inf.ed.ac.uk/wadler/papers/papers-we-love/reynolds-definitional-interpreters-1972.pdf
[defunctionalization-at-work]: https://tidsskrift.dk/brics/article/view/21684
