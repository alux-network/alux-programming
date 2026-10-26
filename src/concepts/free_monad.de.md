<!-- reader: {"title":"Freie Monade"} -->

# Freie Monade {#free-monad}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Programme erster Ordnung](../rust-dd/first-order-programs.md), [Interpreter und Effekte](../rust-dd/interpreters.md)  
Concepts: [Continuation-Passing Style](cps.md), [Defunktionalisierung](defunctionalization.md)  
Insights: [EVM-Algebra](../insights/evm-alg.md)
```

```admonish note title="Semantische Einordnung"
Eine freie Monade ist eine Repräsentation von Instruktionssyntax mit frei erzeugter Sequenzierung. Der Instruktionsfunktor wählt bereits ein Vokabular; ein Interpreter bildet die Syntax anschließend auf einen semantischen Bereich ab. Sie ist eine leistungsstarke Kodierung, aber nicht die Definition von Denotational Design.
```

## Was ist eine freie Monade? (Rust-Version) {#what-is-a-free-monad-rust-version}

Eine **freie Monade** ermöglicht:

*   Ein Programm als *Daten* zu **beschreiben**, statt es sofort auszuführen.
*   Das Programm später auf eine oder mehrere Arten zu **interpretieren**.

Man kann sie sich vorstellen als:

> Einen AST nebenwirkungsreicher Operationen + `bind`/`flat_map` zum Verknüpfen.

Man trennt:

*   **Syntax** → Enum der Instruktionen.
*   **Interpretation** → eine strukturtreue Abbildung in einen gewählten semantischen Bereich.

„Frei“ bedeutet, dass die Monadenstruktur aus einem Funktor `F` erzeugt wird, ohne über die Monadengesetze hinaus zusätzliche Gleichungen einzuführen. Mit der Wahl von `F` ist die Instruktionssyntax bereits festgelegt; die Interpretation des resultierenden Programms liefert eine bestimmte Denotation.

## Rust-Implementierung {#rust-implementation}

```admonish warning title="Schematische Kodierung"
Rust bietet keine direkten Typparameter höherer Ordnung. Eine produktive Kodierung freier Monaden benötigt daher zusätzliche Mechanismen auf Typebene oder einen spezialisierten Instruktionsfunktor. Der folgende Code zeigt die beabsichtigte Form; er ist keine sofort einsetzbare generische Implementierung.
```

### Typ einer freien Monade {#free-monad-type}

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

### DSL: Konsolenoperationen {#dsl-console-operations}

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

### Interpreter {#interpreter}

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

### Verwendung {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## Fazit {#takeaway}

*   **Syntax** = `enum Console` (mögliche Instruktionen)
*   **Programm** = `Free<Console, A>` (Daten, die Schritte beschreiben)
*   **Konkrete Interpretation** = `run_console`
*   Vorteil: Dasselbe Programm kann mehrere Interpreter haben — etwa echte IO ausführen, in eine Datei protokollieren oder in eine andere Sprache kompilieren.

## Zusammenhang mit Fortsetzungen und CPS {#correlation-to-continuations-and-cps}

**Continuation-Passing Style (CPS)** ist eine Programmierweise, bei der Funktionen Werte nie direkt zurückgeben, sondern die Ergebnisse an eine andere Funktion (die *Fortsetzung*) übergeben, die den „Rest des Programms“ darstellt.

Eine **freie Monade** ist im Grunde ein **Programm als Folge von Schritten**, wobei jeder Schritt besagt:

> „Führe dies aus und fahre dann mit dem Rest fort.“

Dieser „Rest des Programms“ ist genau eine **Fortsetzung** — eine Funktion vom aktuellen Ergebnis zum nächsten Schritt.

*   In unserer freien Monade in Rust:
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>` **ist die Fortsetzung**.
    
*   Wenn du eine freie Monade interpretierst, **führst du sie in CPS aus**:
    
    *   Statt Werte direkt zurückzugeben, übergibst du sie an die nächste Fortsetzung.
    *   So entsteht eine Schleife aus: `current_instruction -> feed result into continuation -> next instruction`
*   **CPS-Zusammenhang**:
    
    *   Freie Monaden *kodieren CPS in einer Datenstruktur*.
    *   CPS *ist die Laufzeitdarstellung des Kontrollflusses* derselben Idee.

**Kurzer Überblick**:

| Konzept | In CPS | Im AST der freien Monade |
| --- | --- | --- |
| Ergebnis des Schritts | Argument der Fortsetzung | `A` in `Fn(A) -> Free` |
| Fortsetzung | Funktion `(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| Programm | Verschachtelte Fortsetzungen | Verschachtelte `FlatMap`\-Varianten |
| Ausführung | Funktionsaufrufe | Pattern Matching und Aufrufe |

## Zuordnung der GoF-Entwurfsmuster {#gof-gang-of-four-design-patterns-mapping}

Freie Monaden gehören **nicht** zu den GoF-Mustern, da sie aus der funktionalen Programmierungstheorie stammen. Sie **umfassen** jedoch mehrere Muster oder **bilden** sie nach:

| GoF-Muster | Beziehung zur freien Monade |
| --- | --- |
| **Interpreter** | Das Gesamtmuster „AST + Ausführung“ ist wörtlich das Interpreter-Muster. Freie Monaden liefern den AST und die Kombinatoren gleich mit. |
| **Befehl** | Jede `enum`\-Variante in der DSL ist ein Befehlsobjekt. Die freie Monade verkettet sie zu einem Makrobefehl. |
| **Kompositum** | Die AST-Struktur (verschachtelte Instruktionen) ist ein Kompositum aus Befehlen. |
| **Builder** | Die `.flat_map`\-Kette bildet einen flüssigen Builder für Programme. |
| **Visitor** | Der Interpreter ist im Wesentlichen ein Visitor über die Instruktionsmenge. |

## Warum freie Monaden diesen Mustern überlegen sind {#why-free-monad--these-patterns}

*   GoF-Muster erfordern **manuelle objektorientierte Arbeit**: Schnittstellen und Klassen definieren und sie zusammensetzen.
    
*   Freie Monaden sind **algebraisch**: Man definiert *Daten* für Instruktionen und *Funktionen*, die sie interpretieren.
    
*   Automatisch erhält man:
    
    *   Sequenzierung (`flat_map`)
    *   Komposition
    *   mehrere Interpreter, ohne die Kernlogik anzutasten

**Zusammenfassungstabelle**:

| Konzept freier Monaden (funktionale Programmierung) | Äquivalentes GoF-/OO-Muster |
| --- | --- |
| Instruktions-Enum | Befehl |
| Programm-AST | Kompositum |
| `flat_map`\-Builder | Builder |
| Interpreterfunktion | Interpreter / Visitor |
| Mehrere Interpreter | Strategie |

## Beziehung zur Defunktionalisierung {#relation-to-defunctionalization}

**Defunktionalisierung** ist eine Programmtransformation, die höherwertige Funktionen durch eine Datenstruktur erster Ordnung ersetzt, welche die möglichen Funktionen darstellt, sowie durch einen Interpreter, der sie anwendet.

In CPS sind Fortsetzungen höherwertige Funktionen. Defunktionalisierung eines CPS-Programms ersetzt diese Fortsetzungen durch ein Enum ihrer Fälle und eine `apply`\-Funktion, die sie ausführt.

Bei geeigneten Kodierungen lässt sich eine freie Monade mit defunktionalisierten Fortsetzungen in einem CPS-transformierten Programm in Beziehung setzen:

1.  Beginne mit einer CPS-Version deines Programms. Der „Rest des Programms“ wird in Fortsetzungsfunktionen mitgeführt.
2.  Defunktionalisiere diese Fortsetzungsfunktionen zu einer endlichen Menge von Fällen in einem Datentyp.
3.  Der resultierende Datentyp erster Ordnung kann dieselbe Struktur aus Instruktionen und Fortsetzungen haben wie eine Repräsentation als freie Monade.

**Wichtige Ähnlichkeiten**

*   Sowohl freie Monaden als auch Defunktionalisierung erzeugen eine Datenrepräsentation der Berechnung und benötigen einen Interpreter, der diesen Daten Bedeutung verleiht.
*   Der `FlatMap`\-Fall einer freien Monade enthält die Fortsetzung; die Defunktionalisierung ersetzt diesen Abschluss durch einen Fall in einem Datentyp.

**Wichtige Unterschiede**

| Aspekt | Defunktionalisierung | Freie Monade |
| --- | --- | --- |
| Zweck | Mechanische Compilertechnik zum Entfernen höherwertiger Funktionen | Algebraische Konstruktion zur Trennung von Syntax und Semantik |
| Eingabe | Beliebiges höherwertiges Programm, häufig in CPS-Form | Ein Funktor F, der mögliche Instruktionen beschreibt |
| Ausgabe | Enum der Funktionsfälle plus Anwendungsfunktion | `Free<F, A>` AST plus Interpreter |
| Monadisch? | Nicht unbedingt | Von der Konstruktion her immer eine Monade |
| Umfang | Allgemeine Transformation | Spezifisches Muster der funktionalen Programmierung |

**Zusammenfassung** Defunktionalisierung ist eine Transformationstechnik. Freie Monaden sind eine algebraische Konstruktion. In manchen Repräsentationen sind sie eng miteinander verwandt, doch ohne zusätzliche Annahmen lässt sich die eine im Allgemeinen nicht aus der anderen ableiten.
