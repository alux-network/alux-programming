# Expression Problem Reloaded

```admonish tip title="Related"
Concepts: [Expression Problem](../concepts/expression-problem.md)
```

This page presents a practical trait-based solution to the *Expression Problem*: how to add new expression forms and new operations without repeatedly rewriting existing code.
The solution is **Conal-style in design** and **tagless-final/object-algebra in encoding**. Concretely: we specify compositional meaning first (small capability interfaces and extension-level program specs), and only then provide concrete interpreters. The concrete encoding is in the same family as Oleg Kiselyov’s **tagless-final** style and **Object Algebras**: constructor interfaces (`LitAlg`, `AddAlg`, `MulAlg`) define the language signature, programs are written polymorphically against those interfaces, and concrete implementations (like `Eval` or `Pretty`) provide interpretations. This avoids committing to one closed AST while preserving static typing and extensibility in both dimensions.

Oleg’s approach is explicitly denotational: assign compositional meaning first, then realize effects/interpreters as modular semantic layers. For the Expression Problem, this is exactly why the alignment with Denotational Design is expected rather than accidental. Conal’s Denotational Design formulation states the same priority directly: specify meaning compositionally first, and treat concrete execution strategies as secondary and replaceable.

For the expression problem, this design means:

- **Syntax** is modeled as tiny, independent capability traits.
- **Semantics** are implementations of those traits.
- New syntax adds a new trait, leaving old code untouched.
- New semantics adds a new interpreter type, leaving old code untouched.

## 1. Specify Tiny Syntax Capabilities

Each constructor becomes a small trait. This is the **specification (spec)**.

```rust
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

```rust
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

## 2. Add New Semantics (New Interpreter)

Interpreters implement the spec. No syntax changes needed.

```rust
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

```rust
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## 3. Add New Syntax (New Capability Trait)

To add `Mul`, define a new trait. Existing code stays untouched.

```rust
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

```rust
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

## Why This Solves the Expression Problem

- **Add new operations**: define a new interpreter type implementing the same specs.
- **Add new variants**: define a new capability trait and use it only where needed.
- **No edits** to existing expressions or interpreters unless they opt into new syntax.

This keeps the design modular: simple specs, extension by composition, and thin concrete implementations.

## Final Insight: Wadler vs Denotational Design

Wadler diagnosed the Expression Problem correctly at the level of language mechanisms: rows vs columns under static typing and modular extension. But that framing starts after the key mistake is already made: treating concrete representation as the model.

Denotational Design moves the diagnosis upstream. The core failure is representation-first programming: encoding machine structure (ADT, class graph, memory layout) before specifying meaning. Once that commitment is made, extensibility tradeoffs appear as “deep problems.”

From a meaning-first view, many of these tensions are self-inflicted. Define compositional meaning first, then choose encodings. The Expression Problem becomes an engineering choice among encodings, not a conceptual deadlock.

**Meaning of a language should be independent of the idea of a machine.**

<iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## References

* Elliott, C. *Denotational design with type class morphisms*.  
  [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)

* Elliott, C. *Compiling to categories*.  
  [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)

* Kiselyov, O. *Tagless-final style* (overview, tutorials, and papers on final encodings and extensible typed interpreters).  
  [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)

* Kiselyov, O. *Having an Effect* (definitional/denotational framing of effects and extensible interpreters).  
  [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)

* Oliveira, B. C. d. S., and Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
  [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
