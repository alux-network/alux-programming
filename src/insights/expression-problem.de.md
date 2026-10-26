<!-- reader: {"title":"Expression Problem neu betrachtet","sourceHash":"sha256:4700e3db9f897416ecd8effa743648b9f65fe37268af14187948ecf790df44fe"} -->

# Expression Problem neu betrachtet {#expression-problem-reloaded}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md), [Abgeleitete Bedeutung und Komposition](../rust-dd/derived-meaning.md), [Interpreter und Effekte](../rust-dd/interpreters.md)  
Concepts: [Expression Problem](../concepts/expression-problem.md)
```

Diese Seite stellt eine praktische, traitbasierte Lösung für das *Expression Problem* vor: Wie lassen sich neue Ausdrucksformen und Operationen hinzufügen, ohne bestehenden Code immer wieder umzuschreiben? Der Entwurf folgt **Conals Stil**, die Kodierung ist **tagless-final/Objektalgebra**. Konkret: Zuerst spezifizieren wir kompositionale Bedeutung (kleine Capability-Schnittstellen und Programmspezifikationen auf Erweiterungsebene), dann ergänzen wir konkrete Interpreter. Die konkrete Kodierung gehört zur selben Familie wie Oleg Kiselyovs Stil **tagless-final** und **Object Algebras**: Konstruktorschnittstellen (`LitAlg`, `AddAlg`, `MulAlg`) definieren die Sprachsignatur, Programme werden polymorph über diesen Schnittstellen geschrieben, und konkrete Implementierungen wie `Eval` oder `Pretty` liefern Interpretationen. So wird kein einzelner geschlossener AST festgeschrieben, während statische Typisierung und Erweiterbarkeit in beiden Dimensionen erhalten bleiben.

Olegs Ansatz ist ausdrücklich denotationell: Zuerst wird kompositionale Bedeutung zugewiesen, anschließend werden Effekte und Interpreter als modulare semantische Ebenen realisiert. Beim Expression Problem ist die Übereinstimmung mit Denotational Design daher zu erwarten und nicht zufällig. Conals Formulierung des Denotational Design räumt derselben Priorität ausdrücklich Vorrang ein: Bedeutung zuerst kompositional spezifizieren, konkrete Ausführungsstrategien als nachgeordnet und austauschbar behandeln.

Für das Beispiel einer Ausdruckssprache bedeutet diese Kodierung:

*   **Das Konstruktionsvokabular** wird als kleine, unabhängige Algebra-Traits modelliert.
*   **Interpretationen** sind Implementierungen dieser Traits.
*   Neue Syntax fügt ein neues Trait hinzu, ohne alten Code anzutasten.
*   Neue Semantik fügt einen neuen Interprettyp hinzu, ohne alten Code anzutasten.

`lit` und `add` sind semantische Operationen, keine Konstruktoren eines privilegierten AST. Ein AST ist eine Interpretation unter mehreren.

```admonish example title="Objektalgebren in C#"
Diese Kodierung ist nicht auf Rust beschränkt. [`object-algebras`](https://github.com/tgrospic/object-algebras) entwickelt das Muster in C# weiter und geht über den hier verwendeten festen Träger hinaus. Auf dieser Seite wählt jeder Interpreter einen konkreten `Self::Expr`, also einen gewöhnlichen Typ. Die C#-Algebren abstrahieren stattdessen über einen *Typkonstruktor* `F` — `FunctorAlg<F>`, `MonadAlg<F>`, `BankingDsl<F>` — und tragen Ergebnisse als `App<F, a>` statt des unzulässigen `F<a>`.

C# kennt keine Typen höherer Ordnung als Werte erster Klasse; deshalb steht `App<F, a>` für die Anwendung `F(a)`, die durch Inject-/Project-Wrapper wiederhergestellt wird. Dieser `App`Trick ist genau [Defunktionalisierung](../concepts/defunctionalization.md): Die Abstraktion, die die Sprache nicht ausdrücken kann, wird zu Daten erster Ordnung, die bei Bedarf angewendet werden. Rust stößt an dieselbe Grenze und bietet ebenfalls keine Typen höherer Ordnung als Werte erster Klasse.
```

## Kleine Syntax-Capabilities spezifizieren {#specify-tiny-syntax-capabilities}

Jeder Konstruktor wird zu einem kleinen Trait. Das ist die **Spezifikation (Spec)**.

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

Programme werden als **Erweiterungen** über den Algebra-Traits formuliert. Diese Erweiterungen gehören ebenfalls zur Spezifikation und verbinden kleinere Spezifikationen zu wiederverwendbaren Spezifikationen auf Programmebene:

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

`#[ext(...)]` ist ein Makro aus dem [`extend`Crate](https://docs.rs/extend/latest/extend/), das Boilerplate reduziert, indem es Erweiterungsmethoden aus einem `impl`\-Block generiert. Es ist keine neue Sprachfunktion von Rust.

## Eine neue Interpretation ergänzen {#add-new-interpretation}

Interpreter implementieren die Spezifikation. Syntaxänderungen sind nicht erforderlich.

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

Nun lässt sich derselbe Ausdruck unterschiedlich interpretieren:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## Neue Syntax hinzufügen (neues Capability-Trait) {#add-new-syntax-new-capability-trait}

Um `Mul` hinzuzufügen, definiere ein neues Trait. Bestehender Code bleibt unangetastet.

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

Bestehende Interpreter funktionieren weiterhin für alte Ausdrücke.  
Wenn sie die neue Syntax unterstützen sollen, implementieren sie das neue Trait:

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

## Warum dies das Expression Problem löst {#why-this-solves-the-expression-problem}

Das klassische Expression Problem hat zwei Achsen für eine Repräsentation:

*   neue Varianten (Fälle) hinzufügen
*   neue Operationen hinzufügen

Denotational Design formuliert die Achsen neu:

*   **Das semantische Vokabular erweitern**: ein neues Capability-Trait definieren (`MulAlg`).
*   **Eine neue Interpretation** dieses Vokabulars ergänzen: einen neuen Interprettyp definieren (`Eval`, `Pretty`, einen AST-Builder oder einen Codegenerator).

Die beiden Achsen lassen sich unabhängig kombinieren:

*   Bestehende Programme bleiben unverändert, sofern sie die neue Capability nicht benötigen. `expr_basic` verlangt weiterhin nur `LitAlg + AddAlg`.
*   Bestehende Interpreter bleiben unverändert, sofern sie die neue Capability nicht interpretieren sollen. `Eval` ohne `impl MulAlg` führt weiterhin jedes Programm aus, das `mul` nicht verwendet.

Die Implementierungsmatrix verschwindet dadurch nicht. Sollen sowohl `Eval` als auch `Pretty` `mul` interpretieren, benötigen beide ein `impl MulAlg`. Die Matrix wird jedoch anders organisiert: Jedes Feld steht für *semantische Operation × Interpretation*; kein Feld ist um eine privilegierte Repräsentation herum organisiert, und jedes Programm hängt nur von den verwendeten Capabilities ab.

## Gesetze gehören zur Spezifikation {#laws-belong-to-the-specification}

Eine semantische Algebra besteht aus einem Träger, Operationen und Gesetzen. Der Träger (`type Expr`) wird durch die Interpretation gewählt; Operationen und Gesetze gehören zur Spezifikation. Eine arithmetische Bedeutung von `LitAlg + AddAlg` besagt beispielsweise:

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval` erfüllt dieses Gesetz. `Pretty` tut es nicht: `"(2 + 3)"` ist nicht `"5"`. Beide sind gültige Interpreter der Syntaxsignatur, aber nur `Eval` ist ein Modell der arithmetischen Spezifikation. Das Gesetz wird einmal über die Traits formuliert und entscheidet, welche Interpreter zulässig sind. Keinem Interpreter gehört es.

## Abschließende Erkenntnis: Featherweight Go und Denotational Design {#final-insight-featherweight-go-vs-denotational-design}

Wadler analysierte das Expression Problem auf der Ebene der Sprachmechanismen: Zeilen und Spalten unter statischer Typisierung und modularer Erweiterbarkeit. [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020) liefert eine konkrete Lösung: `Plus(type a Any)` hält die rekursive Repräsentation generisch, und jede Operation schränkt `a` unabhängig ein (`Plus(type a Evaler)` für `Eval`, `Plus(type a Stringer)` für `String`). Die Repräsentation ist nicht an eine einzige geschlossene Ausdrucksschnittstelle gebunden, sodass beide Achsen offenbleiben.

Traditionelle Lösungen beginnen bei der Repräsentation und fragen, wie sich beide Erweiterungsachsen offenhalten lassen. Featherweight Go geht erstaunlich weit, indem es die rekursive Repräsentation generisch und strukturell erweiterbar macht. Denotational Design setzt die Grenze einen Schritt früher: Die Repräsentation ist nicht das Modell. Das Modell ist die Algebra samt ihren Gesetzen; die Repräsentation ist eine mögliche Interpretation.

**Featherweight Go macht die Repräsentation erweiterbar. Denotational Design macht die Repräsentation optional.**

|  | Featherweight Go | Denotational Design |
| --- | --- | --- |
| Semantischer Schwerpunkt | erweiterbare Repräsentation | Algebra und Gesetze |
| `Num`/`Plus`, `lit`/`add` | Strukturen (Repräsentationsformen) | semantische Operationen |
| `Eval`, `String`/`Pretty` | Methoden und Schnittstellen | Interpretationen |
| Rekursive Struktur | generische, offene Repräsentation (`Plus(a)`) | nicht erforderlich |
| Träger | der dargestellte Ausdruckstyp | vom Interpreter gewählt (`type Expr`) |
| AST | Repräsentation bleibt zentral | optional, eine Interpretation unter vielen |
| Matrixfeld | Fall × Operation → Methode | semantische Operation × Interpretation → `impl` |
| Neues Verhalten | Methoden und Schnittstellen ergänzen | Capabilities ergänzen oder zusammensetzen |
| Neue Implementierung | neue strukturelle Realisierungen | neuer Interpreter |

Wadler fragt, wie sich beide Achsen einer Repräsentation erweitern lassen. Denotational Design fragt, warum die Repräsentation für eine der beiden Achsen zuständig sein sollte.

Zuerst kompositionale Bedeutung definieren, dann Kodierungen auswählen. Das Expression Problem wird dadurch zu einer technischen Wahl zwischen Kodierungen statt zu einer begrifflichen Sackgasse.

**Die Bedeutung einer Sprache sollte unabhängig von der Vorstellung einer Maschine sein.**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Die Bedeutung einer Sprache sollte unabhängig von der Maschine sein</figcaption></figure>

## Quellen {#references}

*   Elliott, C. *Denotational design with type class morphisms*.  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *Compiling to categories*.  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *Tagless-final style* (Übersichten, Tutorials und Artikel zu finalen Kodierungen und erweiterbaren typisierten Interpretern).  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *Having an Effect* (definitorische/denotationelle Einordnung von Effekten und erweiterbaren Interpretern).  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. und Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Abschnitt 2.3 stellt die oben verglichene generische strukturelle Lösung vor.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S. und Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
