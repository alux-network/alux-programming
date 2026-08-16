# Language and compiler pipelines

```admonish tip title="Related"
Design by Meaning in Rust: [First-order programs](first-order-programs.md), [Interpreters and effects](interpreters.md)  
Concepts: [Operational semantics](../concepts/operational_semantics.md), [Defunctionalization](../concepts/defunctionalization.md)  
Insights: [EVM algebra](../insights/evm-alg.md)
```

```admonish note title="Meaning is not the pipeline"
A compiler is clearest when language meaning is not identified with parser trees, passes, bytecode, or the machine loop. Correctness is one commuting law: running the compiled program agrees with the program's denotation.
```

A compiler is easiest to reason about when the language meaning is not identified with parser trees, compiler passes, bytecode, or a virtual-machine loop.

This chapter uses a simplified concurrent language shaped like Tolang, keeping the focus on the semantic architecture.

## Four distinct layers

Keep these layers separate:

1. Source syntax
2. Normalized language
3. Executable representation
4. Machine execution

A typical pipeline is:

$$
\begin{aligned}
\operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\
\operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\
\operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\
\operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation}
\end{aligned}
$$

The convenience operation is composition:

$$
\operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen}
$$

The composed helper is not the semantic definition of each stage.

## Syntax is not yet meaning

Parser output mirrors grammar choices:

* punctuation
* sugar
* precedence
* source spans
* generated parser representation

These facts matter to diagnostics and tooling, but they need not define the core language.

Normalization removes accidental syntactic variation and introduces a smaller meaning-bearing form. For example, several surface binding forms may normalize to one core restriction operation.

**Many source forms** → **one normalized constructor**

This creates one place to state later compiler and runtime laws.

## Denotational and compiled meaning

Let:

$$
\llbracket - \rrbracket : Core \to D
$$

assign meanings in semantic domain `D`.

Compilation produces executable values:

$$
compile : Core \to Executable
$$

and execution observes them:

$$
run : Executable \to D
$$

The central correctness obligation is a commuting diagram:

$$
\operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket
$$

For nondeterministic or concurrent systems, equality may be observational equivalence, a set of outcomes, trace equivalence, or bisimilarity rather than ordinary value equality. The semantic model must choose.

## Concurrent process meaning

The base reflective calculus includes ideas such as:

$$
\begin{array}{ll}
\mathbf{0} & \text{inactive process} \\
P \mid Q & \text{parallel composition} \\
x!(v) & \text{send a value on a channel} \\
?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P
\end{array}
$$

Tolang extends the base calculus compositionally. One such extension adds the surface form

$$
\mathbf{let}\ x\ \mathbf{in}\ P
\qquad
\text{fresh channel binding scoped over }P.
$$

This binding creates a fresh channel and scopes its name over $P$; process-calculus literature calls the operation *restriction*. The reflective core has no primitive restriction operator. See Meredith and Radestock’s [*A Reflective Higher-order Calculus*](https://doi.org/10.1016/j.entcs.2005.05.016).

The operational machine may implement these with a tuple space, queues, matching indexes, continuation records, and concurrent tasks. Those mechanisms are not the language definition.

The semantic layer identifies observable process behavior and structural laws. Candidate laws for the core parallel composition include:

$$
\begin{aligned}
P \mid \mathbf{0} &\equiv P \\
P \mid Q &\equiv Q \mid P \\
(P \mid Q) \mid R &\equiv P \mid (Q \mid R)
\end{aligned}
$$

Laws for this fresh-binding extension are separate. Conventional candidate schemas include alpha-renaming, commutation of distinct bindings, and scope extrusion:

$$
\begin{aligned}
\mathbf{let}\ x\ \mathbf{in}\ P
&\equiv
\mathbf{let}\ y\ \mathbf{in}\ P\{y/x\}
&& (y \mathrel{\#} P) \\
\mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P)
&\equiv
\mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P)
&& (x \ne y) \\
\mathbf{let}\ x\ \mathbf{in}\ (P \mid Q)
&\equiv
P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q)
&& (x \notin \operatorname{FN}(P))
\end{aligned}
$$

Here $y \mathrel{\#} P$ means that $y$ is fresh for $P$, $P\{y/x\}$ is capture-avoiding renaming, and $\operatorname{FN}(P)$ is the set of free channel names in $P$. These schemas become laws only when the chosen observational equivalence validates them; they must not be assumed from the surface syntax or inferred from one bytecode layout.

## Normalization as a meaning-preserving map

If source programs `s₁` and `s₂` differ only by accepted sugar, normalization should make their common meaning explicit:

$$
s_1 \equiv_{\mathsf{sugar}} s_2
\implies
\operatorname{normalize}(s_1) = \operatorname{normalize}(s_2)
$$

Other useful obligations include:

* alpha-renaming preserves normalized meaning
* lexical scope resolves to the intended binder
* source positions survive where diagnostics require them
* compile-time constants erase without runtime behavior
* malformed syntax accumulates diagnostics according to the stage contract

Some projects require canonical normalized values. Others require only semantic equivalence. State which one.

## Stage capabilities

```admonish warning title="No god compiler object"
Do not make one giant compiler object the only stage interface.
```

A normalizer may need capabilities such as:

* Read and extend binding scope
* Resolve source names
* Accumulate diagnostics
* Construct normalized terms

A code generator may need:

* Allocate executable references
* Emit instructions
* Resolve normalized variables
* Finalize executable structure

Express stage entries as extensions over these capabilities. Concrete environments store maps, arenas, counters, and diagnostics, but they do not own the stage meaning.

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

The precise capability names vary by compiler. The important shape is explicit dependency and a stable stage map.

## Parser and runtime can remain operational

Not every subsystem must be forced into the same encoding.

A parser may be dominated by generated grammar machinery. A virtual machine may be dominated by efficient mutation and scheduling. They can remain operationally shaped while implementing well-defined boundaries:

| Stage | Contract |
| --- | --- |
| Parser | Produces `Syntax` |
| Normalizer | Produces meaning-bearing `Core` |
| Code generator | Preserves meaning in the executable form |
| Runtime | Produces observations consistent with the language model |

Denotational Design does not remove machines. It prevents machines from silently becoming language semantics.

## Compiler laws and tests

Strong evidence comes from several directions:

* normalization laws over equivalent source forms
* round trips for parsing and pretty printing where intended
* direct semantic evaluation compared with compiled execution
* bytecode equivalence when canonical output is promised
* runtime conformance scenarios
* differential tests across interpreters

```admonish warning title="Byte equality is not semantic equality"
Do not confuse byte-for-byte equality with semantic equality. Byte equality is a useful stronger property only when canonical compilation is part of the specification.
```

## How this prepares the reader

When reading a meaning-first language implementation, look for:

* Semantic syntax or capability traits
* Derived normalization operations
* Explicit stage contracts
* First-order core programs
* Laws for substitution, scope, and composition
* Thin environments that interpret stage capabilities
* Operational parser, compiler, and VM machinery at the edges

This lens bridges general Denotational Design and Tolang, showing how semantic boundaries guide language design, compilation, and runtime interpretation.
