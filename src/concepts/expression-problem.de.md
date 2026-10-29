<!-- reader: {"title":"Expression Problem","sourceHash":"sha256:095010cccfe7dcb155f2ad304d334ffd7d3d56212b3b67168e4f5b04da397ee6"} -->

# Expression Problem {#expression-problem}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](../denotational-design/design.md), [Denotationen und Kompositionalität](../denotational-design/denotations.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md), [Abgeleitete Bedeutung und Komposition](../rust-dd/derived-meaning.md)  
Insights: [Expression Problem reloaded](../insights/expression-problem.md)
```

```admonish note title="Semantische Einordnung"
Das Expression Problem betrifft die modulare Erweiterung von Repräsentationen und Operationen. Denotational Design setzt eine Frage früher an: Welches semantische Vokabular und welche Interpretationen sollten überhaupt repräsentiert werden?
```

Phil Wadlers Expression Problem betrifft die **gleichzeitige** Erweiterung einer Sprache in zwei Dimensionen, ohne bestehenden Code zu ändern:

*   **Neue Datenvarianten hinzufügen** (neue Ausdrucksformen, auch „Syntax“ genannt).
*   **Neue Operationen hinzufügen** (neue Interpretationen, auch „Semantik“ genannt).

Der grundlegende Zielkonflikt:

*   Im **funktionalen/ADT**\-Stil lassen sich neue Operationen leicht, neue Varianten dagegen nur mit Eingriffen ergänzen.
*   Im **objektorientierten** Stil lassen sich neue Varianten leicht, neue Operationen dagegen nur mit Eingriffen ergänzen.

Dieser Abschnitt zeigt beide Seiten anhand kleiner Beispiele in Haskell und Java.

## Haskell (funktional / ADT) {#haskell-functional--adt}

Wir beginnen mit einem klassischen ADT für Ausdrücke und zwei Operationen.

```haskell
data Expr
  = Lit Int
  | Add Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
```

Nun ist es einfach, **eine neue Operation hinzuzufügen**:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

Das **Hinzufügen einer neuen Variante** (z. B. `Mul`) erfordert dagegen Änderungen an jeder Funktion:

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

Mit Wadlers Worten ist **die Erweiterung der Datentypen** im ADT-Ansatz nicht modular.

## Java (objektorientiert) {#java-object-oriented}

Wir beginnen mit einer Schnittstelle und konkreten Klassen für jede Variante.

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

Nun lässt sich **eine neue Variante hinzufügen**:

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

Das **Hinzufügen einer neuen Operation** (z. B. `size`) greift dagegen tief ein. Die Schnittstelle und jede Klasse müssen geändert werden:

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

Mit Wadlers Worten ist **die Operationserweiterung** im OO-Ansatz nicht modular.

## Zusammenfassung (Wadlers Aussage) {#summary-wadlers-point}

*   Der funktionale/ADT-Stil begünstigt **neue Operationen**, erschwert aber **neue Varianten**.
*   Der OO-Stil begünstigt **neue Varianten**, erschwert aber **neue Operationen**.
*   Das Expression Problem sucht einen Entwurf, in dem **beide** Dimensionen ohne Änderung des bestehenden Codes erweiterbar sind.

## Wadlers Erklärung und Lösungsansätze (1998) {#wadlers-explanation-and-solution-landscape-1998}

Wadler formuliert das Problem so: Einen Datentyp **um Fälle** (neue Varianten) und **Funktionen über diesen Datentyp** (neue Operationen) erweitern, *ohne bestehenden Code neu zu kompilieren* und dabei **statische Typsicherheit** (ohne Casts) bewahren.

Er verwendet die Metapher einer „Tabelle“:

*   **Zeilen** = Fälle (Varianten / Konstruktoren)
*   **Spalten** = Funktionen (Operationen / Interpretationen)

In **funktionalen/ADT**\-Umgebungen sind die Zeilen festgelegt und neue Spalten lassen sich leicht ergänzen.  
In **OO**\-Umgebungen sind die Spalten festgelegt und neue Zeilen lassen sich leicht ergänzen.  
Die Herausforderung besteht darin, **beide Richtungen** erweiterbar zu machen.

## Wadlers vorgeschlagene Lösung (GJ + virtuelle Typen) {#wadlers-proposed-solution-gj--virtual-types}

Wadler stellt eine Lösung in GJ (Generic Java) vor, die Folgendes verwendet:

*   Einen an `This` gebundenen Parameter (`This extends LangF<This>`), um **ThisType** zu simulieren.
*   **Innere Klassen und Schnittstellen**, indiziert durch `This` (virtuelle Typen).
*   A visitor-based structure that allows:
    *   Neue Fälle (z. B. `Plus`) durch Unterklassen der „Sprachfamilie“
    *   Neue Operationen (z. B. `Show`) durch Hinzufügen neuer Visitor

Der Trick besteht darin, auf `This.Exp` und `This.Visitor` zu verweisen, sodass jede Erweiterungsphase typsicher und unabhängig kompilierbar bleibt.

### Einschränkung (innere Java-Schnittstellen) {#caveat-java-inner-interfaces}

Wadler merkt an, dass Java innere Schnittstellen als **statisch** behandelt, wodurch der Indizierungstrick nicht funktioniert.  
Er schlägt vor, diese Einschränkung zu lockern, um die Lösung praktikabel zu machen; auch im modernen Java hat sich daran nichts geändert (verschachtelte Schnittstellen bleiben implizit statisch).

## Weitere erwähnte Lösungsansätze {#other-solution-directions-mentioned}

1.  Corky Cartwrights Ansatz Erfordert **kontravariante Erweiterung**: Ein Basisausdrucktyp muss für einen erweiterten Typ stehen dürfen. Das erklärt, warum Fixpunkte verwendet werden: Die erweiterte Sprachfamilie ist *kein* Untertyp der ursprünglichen.
    
2.  Kim Bruces Ansatz Erfordert **Typkonstruktoren höherer Ordnung** (einen Typ über einen Typkonstruktor zu parametrisieren). GJ unterstützt dies nicht direkt, doch Wadler zufolge können virtuelle Typen es simulieren.
    
3.  Krishnamurthi et al. (erweitertes Visitor-Muster) Basiert auf einem erweiterten Visitor-Entwurf. In ihrem Umfeld (Pizza) ist es **nicht statisch typisiert**, daher sind dynamische Casts erforderlich.
    
4.  Sprachspezifische Erweiterungen Wadler nennt zwei Lösungen, die eigens für das Problem entwickelte Sprachfunktionen voraussetzen. Sie sind weniger allgemein als der Ansatz mit virtuellen Typen.
    

## Wadlers zwei Aussagen {#wadlers-two-points}

Wadlers E-Mail macht zwei Punkte deutlich:

1.  Das Expression Problem ist ein **struktureller Zielkonflikt** zwischen Daten- und Operationserweiterung.
2.  Solutions are possible, but they tend to require either:
    *   Funktionen des Typsystems, die **virtuelle Typen** simulieren, oder
    *   sprachspezifische Erweiterungen, oder
    *   ein Kompromiss bei statischer Typsicherheit oder unabhängiger Kompilierung.

## Featherweight-Go-Lösung (2020) {#featherweight-go-solution-2020}

Wadler formuliert und benennt das Problem 1998. Featherweight Go (FG) und seine generische Erweiterung FGG (Featherweight Generic Go) liefern später eine konkrete, vollständig statische Lösung in einer Go-ähnlichen Sprache mit strukturellen Schnittstellen und Generics.

Die Lösung des Artikels (Abb. 8, vereinfacht) umfasst zwei Strukturen, `Num` und `Plus`, sowie zwei Operationen, `Eval` und `String`:

```go
type Evaler interface { Eval() int }
type Stringer interface { String() string }

type Num struct { value int }
type Plus(type a Any) struct { left a; right a }

func (e Num) Eval() int { return e.value }
func (e Plus(type a Evaler)) Eval() int { return e.left.Eval() + e.right.Eval() }

func (e Num) String() string { return fmt.Sprintf("%d", e.value) }
func (e Plus(type a Stringer)) String() string {
    return fmt.Sprintf("(%s+%s)", e.left.String(), e.right.String())
}

type Expr interface { Evaler; Stringer }

var e Expr = Plus(Expr){Num{1}, Num{2}}
```

Der Mechanismus:

*   **Generische rekursive Repräsentation.** Die Kinder von `Plus` haben einen Typparameter `a`, der nur an `Any` gebunden ist. Die Struktur ist nicht an eine geschlossene Schnittstelle gebunden, die jede Operation aufführt, sodass spätere Operationen möglich bleiben.
*   **Operationsspezifische Einschränkungen.** Jede Methodendeklaration beschränkt `a` unabhängig: `Plus(type a Evaler)` für `Eval`, `Plus(type a Stringer)` für `String`. Dies beruht auf *kovarianten Receivern* in FGG: Der Receiver-Bound einer Methode darf stärker sein als der Bound in der Typdeklaration.
*   **Strukturelle Schnittstellen.** Eine Struktur implementiert eine Schnittstelle, indem sie deren Methoden besitzt. So kann `Expr` nach `Num` und `Plus` eingeführt werden, ohne diese zu ändern. Die vollständige Operationsmenge wird erst beim Aufbau eines Werts festgelegt (`Plus(Expr){...}`).

Neue Fälle sind neue Strukturen; neue Operationen sind neue Schnittstellen und Methoden. Beides erfordert weder Änderung noch Neukompilierung bestehender Deklarationen, und Typzusicherungen sind nicht nötig.

## Quellen {#references}

*   Wadler, P. (1998). *The Expression Problem*. Notiz auf der Mailingliste Java-Genericity. Formulierung und Benennung des Problems.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. und Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Eine spätere konkrete Lösung für die Sprache, Abschnitt 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
