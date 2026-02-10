# Expression Problem

```admonish tip title="Related"
Insights: [Expression Problem Reloaded](../insights/expression-problem.md)
```

Phil Wadler’s expression problem is about **simultaneously** extending a language in two dimensions without modifying existing code:

- **Add new data variants** (new expression forms, aka “syntax”).
- **Add new operations** (new interpretations, aka “semantics”).

The core tension:

- In **functional/ADT** style, adding new operations is easy, but adding new variants is invasive.
- In **object-oriented** style, adding new variants is easy, but adding new operations is invasive.

This section shows both sides with small Haskell and Java examples.

## Haskell (Functional / ADT)

We start with a classic ADT for expressions and two operations.

```haskell
data Expr
  = Lit Int
  | Add Expr Expr
  | Mul Expr Expr  -- ✏️ UPDATE: new variant forces edits below

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
```

Now **adding a new operation** is easy:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

But **adding a new variant** (e.g. `Mul`) forces edits in every function:

```haskell
data Expr
  = Lit Int
  | Add Expr Expr
  | Mul Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b
eval (Mul a b)   = eval a * eval b  -- ✏️ UPDATE: new case

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
pretty (Mul a b) = "(" ++ pretty a ++ " * " ++ pretty b ++ ")"  -- ✏️ UPDATE: new case

size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
size (Mul a b) = 1 + size a + size b  -- ✏️ UPDATE: new case
```

In Wadler’s terms, **data extension is not modular** in the ADT approach.

## Java (Object-Oriented)

We start with an interface and concrete classes for each variant.

```java
// Expression variants
interface Expr {
    int eval();
    String pretty();
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) {
        this.n = n;
    }

    public int eval() {
        return n;
    }

    public String pretty() {
        return Integer.toString(n);
    }
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() + b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " + " + b.pretty() + ")";
    }
}
```

Now **adding a new variant** is easy:

```java
final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() * b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " * " + b.pretty() + ")";
    }
}
```

But **adding a new operation** (e.g. `size`) is invasive. You must edit the interface and every class:

```java
interface Expr {
    int eval();
    String pretty();
    int size(); // ✏️ UPDATE: new operation added here
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) { this.n = n; }

    public int eval() { return n; }
    public String pretty() { return Integer.toString(n); }
    public int size() { return 1; } // ✏️ UPDATE: new method in every class
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() + b.eval(); }
    public String pretty() { return "(" + a.pretty() + " + " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}

final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() * b.eval(); }
    public String pretty() { return "(" + a.pretty() + " * " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}
```

In Wadler’s terms, **operation extension is not modular** in the OO approach.

## Summary (Wadler’s Point)

- Functional/ADT style favors **new operations** but resists **new variants**.
- OO style favors **new variants** but resists **new operations**.
- The expression problem asks for a design where **both** dimensions are extensible without modifying existing code.

## Wadler’s Explanation and Solution Landscape (1998)

Wadler frames the problem as: extend a datatype **by cases** (new variants) and extend **functions over that datatype** (new operations), *without recompiling existing code* and while preserving **static type safety** (no casts).

He uses a “table” metaphor:
- **Rows** = cases (variants / constructors)
- **Columns** = functions (operations / interpretations)

In **functional/ADT** settings, rows are fixed and columns are easy to add.  
In **OO** settings, columns are fixed and rows are easy to add.  
The challenge is to make **both directions** extensible.

## Wadler’s Proposed Solution (GJ + Virtual Types)

Wadler presents a solution in GJ (Generic Java) using:

- A `This`-bounded parameter (`This extends LangF<This>`) to simulate **ThisType**.
- **Inner classes and interfaces** indexed by `This` (virtual types).
- A visitor-based structure that allows:
  - New cases (e.g., `Plus`) by subclassing the “language family”
  - New operations (e.g., `Show`) by adding new visitors

The trick is to refer to `This.Exp` and `This.Visitor` so that each extension phase remains type-safe and independently compilable.

### Caveat (Java inner interfaces)

Wadler notes that Java treats inner interfaces as **static**, which breaks the indexing trick.  
He suggests that loosening this restriction would make the solution viable; this has still not changed in modern Java (nested interfaces remain implicitly static).

## Other Solution Directions Mentioned

1. Corky Cartwright’s approach
Requires **contravariant extension**: allow a base expression type to stand in for an extended one.
This explains why fixpoints are used: the extended language family is *not* a subtype of the original.

2. Kim Bruce’s approach
Requires **higher‑order type constructors** (parameterizing a type over a type constructor).
GJ does not support this directly, but Wadler argues virtual types can simulate it.

3. Krishnamurthi et al. (Extended Visitor pattern)
Works via an extended visitor design.
**Not statically typed** in their setting (Pizza), so dynamic casts are required.

4. Special‑purpose language extensions
Wadler cites two solutions that rely on language features designed specifically for the problem.
These are less general than the virtual‑type approach.

## Wadler’s Two Points

Wadler’s email makes two points clear:

1. The Expression Problem is a **structural tension** between data extension and operation extension.
2. Solutions are possible, but they tend to require either:
   - Type system features that simulate **virtual types**, or
   - Special-purpose language extensions, or
   - A compromise on static type safety or independent compilation.

## References

* Wadler, P. (1998). *The Expression Problem*. Java-Genericity mailing list note.  
  [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
