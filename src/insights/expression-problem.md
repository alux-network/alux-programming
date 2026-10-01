# Expression Problem reloaded

```admonish tip title="Related"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability algebras](../rust-dd/capability-algebras.md), [Derived meaning and composition](../rust-dd/derived-meaning.md), [Interpreters and effects](../rust-dd/interpreters.md)  
Concepts: [Expression Problem](../concepts/expression-problem.md)
```

This page presents a practical trait-based solution to the *Expression Problem*: how to add new expression forms and new operations without repeatedly rewriting existing code.
The solution is **Conal-style in design** and **tagless-final/object-algebra in encoding**. Concretely: we specify compositional meaning first (small capability interfaces and extension-level program specs), and only then provide concrete interpreters. The concrete encoding is in the same family as Oleg Kiselyov’s **tagless-final** style and **Object Algebras**: constructor interfaces (`LitAlg`, `AddAlg`, `MulAlg`) define the language signature, programs are written polymorphically against those interfaces, and concrete implementations (like `Eval` or `Pretty`) provide interpretations. This avoids committing to one closed AST while preserving static typing and extensibility in both dimensions.

Oleg’s approach is explicitly denotational: assign compositional meaning first, then realize effects/interpreters as modular semantic layers. For the Expression Problem, this is exactly why the alignment with Denotational Design is expected rather than accidental. Conal’s Denotational Design formulation states the same priority directly: specify meaning compositionally first, and treat concrete execution strategies as secondary and replaceable.

For the expression-language example, this encoding means:

- **Constructor vocabulary** is modeled as tiny, independent algebra traits.
- **Interpretations** are implementations of those traits.
- New syntax adds a new trait, leaving old code untouched.
- New semantics adds a new interpreter type, leaving old code untouched.

`lit` and `add` are semantic operations, not constructors of a privileged AST. An AST is one interpretation among others.

```admonish example title="Object algebras in C#"
This encoding is not Rust-specific. [`object-algebras`](https://github.com/tgrospic/object-algebras) develops the pattern in C# and pushes past the fixed carrier used here. On this page each interpreter picks one concrete `Self::Expr`, a plain type. The C# algebras instead abstract over a type *constructor* `F` — `FunctorAlg<F>`, `MonadAlg<F>`, `BankingDsl<F>` — carrying results as `App<F, a>` in place of the illegal `F<a>`.

C# has no first-class higher-kinded types, so `App<F, a>` stands in for the application `F(a)`, recovered through inject/project wrappers. That `App` trick is exactly [defunctionalization](../concepts/defunctionalization.md): the abstraction the language cannot express becomes first-order data, applied on demand. Rust hits the same ceiling — it lacks first-class higher-kinded types too.
```

## Specify tiny syntax capabilities

Each constructor becomes a small trait. This is the **specification (spec)**.

```rust,noplayground
trait LitAlg {
    type Expr;

    fn lit(&self, n: i64) -> Self::Expr;
}

trait AddAlg {
    type Expr;

    fn add(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}
```

Programs are written as **extensions** over the alg traits; these extensions are also part of the specification and serve to compose smaller specs into reusable program-level specs:

```rust,noplayground
#[ext(name = ExprPrograms)]
impl<This> This
where
    This: LitAlg + AddAlg,
{
    fn expr_basic(&self) -> This::Expr {
        self.add(self.lit(2), self.lit(3))
    }
}
```

`#[ext(...)]` is a macro from the [`extend` crate](https://docs.rs/extend/latest/extend/) used to reduce boilerplate by generating extension methods from an `impl` block; it is not a new Rust language feature.

## Add new interpretation

Interpreters implement the spec. No syntax changes needed.

```rust,noplayground
struct Eval;

impl LitAlg for Eval {
    type Expr = i64;

    fn lit(&self, n: i64) -> i64 { n }
}

impl AddAlg for Eval {
    type Expr = i64;

    fn add(&self, a: i64, b: i64) -> i64 { a + b }
}

struct Pretty;

impl LitAlg for Pretty {
    type Expr = String;

    fn lit(&self, n: i64) -> String { n.to_string() }
}

impl AddAlg for Pretty {
    type Expr = String;

    fn add(&self, a: String, b: String) -> String {
        format!("({a} + {b})")
    }
}
```

Now the same expression can be interpreted differently:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## Add new syntax (new capability trait)

To add `Mul`, define a new trait. Existing code stays untouched.

```rust,noplayground
trait MulAlg {
    type Expr;

    fn mul(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}

#[ext(name = ExprProgramsMul)]
impl<This> This
where
    This: LitAlg + AddAlg + MulAlg,
{
    fn expr_with_mul(&self) -> This::Expr {
        self.mul(self.add(self.lit(2), self.lit(3)), self.lit(4))
    }
}
```

Existing interpreters still work for old expressions.  
If they want the new syntax, they implement the new trait:

```rust,noplayground
impl MulAlg for Eval {
    type Expr = i64;

    fn mul(&self, a: i64, b: i64) -> i64 { a * b }
}

impl MulAlg for Pretty {
    type Expr = String;

    fn mul(&self, a: String, b: String) -> String {
        format!("({a} * {b})")
    }
}
```

## Why this solves the Expression Problem

The traditional Expression Problem has two axes over a representation:

- add new variants (cases)
- add new operations

Denotational Design reframes the axes:

- **Extend the semantic vocabulary**: define a new capability trait (`MulAlg`).
- **Add a new interpretation** of that vocabulary: define a new interpreter type (`Eval`, `Pretty`, an AST builder, a code generator).

The two axes compose independently:

- Existing programs do not change unless they require the new capability. `expr_basic` still asks only for `LitAlg + AddAlg`.
- Existing interpreters do not change unless they choose to interpret the new capability. `Eval` without `impl MulAlg` still runs every program that does not use `mul`.

This does not remove the implementation matrix. If `Eval` and `Pretty` should both interpret `mul`, both need an `impl MulAlg`. What changes is how the matrix is organized: each cell is *semantic operation × interpretation*, no cell is organized around a privileged representation, and each program depends only on the capabilities it uses.

## Laws belong to the specification

A semantic algebra is a carrier, operations, and laws. The carrier (`type Expr`) is chosen by the interpretation; the operations and laws belong to the specification. For example, an arithmetic meaning of `LitAlg + AddAlg` states:

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval` satisfies this law. `Pretty` does not: `"(2 + 3)"` is not `"5"`. Both are valid interpreters of the syntax signature, but only `Eval` is a model of the arithmetic specification. The law is stated once, against the traits, and decides which interpreters qualify. No interpreter owns it.

## Final insight: Featherweight Go vs Denotational Design

Wadler diagnosed the Expression Problem at the level of language mechanisms: rows vs columns under static typing and modular extension. [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020) gives a concrete solution: `Plus(type a Any)` keeps the recursive representation generic, and each operation constrains `a` independently (`Plus(type a Evaler)` for `Eval`, `Plus(type a Stringer)` for `String`). The representation is not tied to one closed expression interface, so both axes stay open.

Traditional solutions start from the representation and ask how to keep both extension axes open. Featherweight Go pushes this surprisingly far by making the recursive representation generic and structurally extensible. Denotational Design moves the boundary one step earlier: representation is not the model. The model is the algebra and its laws; representation is one possible interpretation.

**Featherweight Go makes representation extensible. Denotational Design makes representation optional.**

|                      | Featherweight Go                         | Denotational Design                      |
|----------------------|------------------------------------------|------------------------------------------|
| Semantic center      | extensible representation                | algebra and laws                         |
| `Num`/`Plus`, `lit`/`add` | structures (representation forms)   | semantic operations                      |
| `Eval`, `String`/`Pretty` | methods and interfaces              | interpretations                          |
| Recursive structure  | generic, open representation (`Plus(a)`) | none required                            |
| Carrier              | the represented expression type          | chosen by the interpreter (`type Expr`)  |
| AST                  | representation remains central           | optional, one interpretation among many  |
| Matrix cell          | case × operation → method                | semantic operation × interpretation → `impl` |
| New behavior         | add methods and interfaces               | add or compose capabilities              |
| New implementation   | new structural realizations              | new interpreter                          |

Wadler asks how to extend both axes of a representation. Denotational Design asks why representation should own either axis.

Define compositional meaning first, then choose encodings. The Expression Problem becomes an engineering choice among encodings, not a conceptual deadlock.

**Meaning of a language should be independent of the idea of a machine.**

<figure>
  <iframe
    width="100%"
    height="315"
    src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg"
    title="Talk clip — a language's meaning should be independent of the machine"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
  ></iframe>
  <figcaption>A language’s meaning should be independent of the machine</figcaption>
</figure>

## References

* Elliott, C. *Denotational design with type class morphisms*.  
  [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)

* Elliott, C. *Compiling to categories*.  
  [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)

* Kiselyov, O. *Tagless-final style* (overview, tutorials, and papers on final encodings and extensible typed interpreters).  
  [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)

* Kiselyov, O. *Having an Effect* (definitional/denotational framing of effects and extensible interpreters).  
  [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)

* Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P., and Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Section 2.3 gives the generic structural solution compared above.  
  [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)

* Oliveira, B. C. d. S., and Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
  [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
