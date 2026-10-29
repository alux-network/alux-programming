<!-- reader: {"title":"Continuation-Passing Style","sourceHash":"sha256:cf423534a1315531133363dea3ff20097731dacb0c4efc6db7e28806acf97237"} -->

# Continuation-Passing Style (CPS) {#continuation-passing-style-cps}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Programme erster Ordnung](../rust-dd/first-order-programs.md), [Sprach- und Compiler-Pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Freie Monade](free_monad.md), [Defunktionalisierung](defunctionalization.md)  
Insights: [EVM-Algebra](../insights/evm-alg.md)
```

```admonish note title="Semantische Einordnung"
CPS ist eine Repräsentation und Programmtransformation, die den Kontrollfluss explizit macht. Ob sie Bedeutung bewahrt, hängt von einer formulierten Quellsemantik, Zielsemantik und der Zuordnung zwischen ihnen ab.
```

## Definition {#definition}

Continuation-Passing Style (CPS) ist eine Programmierweise, bei der Funktionen Werte nicht direkt zurückgeben. Stattdessen übergeben sie ihr Ergebnis an eine andere Funktion, die *Fortsetzung* genannt wird und den Rest des Programms darstellt.

## Motivation {#motivation}

*   Macht Kontrollfluss explizit und programmierbar.
*   Ermöglicht anspruchsvolle Transformationen wie nicht blockierende Ein-/Ausgabe, vorzeitige Abbrüche, Koroutinen, Backtracking und Nebenläufigkeitsplanung.
*   Wird in Zwischenrepräsentationen von Compilern eingesetzt, um Optimierung und Analyse zu vereinfachen.

## Grundform {#basic-form}

Im direkten Stil:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

In CPS:

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

Hier ist `k` die Fortsetzung. Statt `x + 1` zurückzugeben, rufen wir `k(x + 1)` auf.

## Wichtige Eigenschaften {#key-properties}

*   Alle Funktionsaufrufe sind *Endaufrufe* an Fortsetzungen.
*   Die aktuelle Berechnung kehrt nicht zum Aufrufer zurück, sondern springt in die Fortsetzung.
*   Der Kontrollfluss wird im Programm explizit.

## Beziehung zu höherwertigen Funktionen {#relation-to-higher-order-functions}

*   In CPS sind Fortsetzungen einfach höherwertige Funktionen.
*   Jeder Berechnungsschritt erhält eine Fortsetzung, die beschreibt, was als Nächstes zu tun ist.

## Beziehung zur Defunktionalisierung {#relation-to-defunctionalization}

*   In CPS ist die Fortsetzung ein tatsächlicher Funktionswert.
*   Defunktionalisierung ersetzt die Fortsetzungsfunktion durch eine Datenstruktur (Enum), die mögliche nächste Schritte darstellt, sowie eine `apply`\-Funktion, die sie interpretiert.

## Beziehung zu freien Monaden {#relation-to-free-monads}

*   Der `FlatMap`\-Konstruktor einer freien Monade ist genau eine gespeicherte Fortsetzung.
*   Eine freie Monade zu interpretieren, ähnelt der Ausführung von CPS-Code, in dem die Fortsetzung Teil der Programmdaten ist.
*   Geeignete Kodierungen freier Monaden lassen sich mit CPS und defunktionalisierten Fortsetzungsrepräsentationen in Beziehung setzen.

## Vorteile {#advantages}

*   Flexible Repräsentation des Kontrollflusses.
*   Die Reihenfolge der Auswertung lässt sich leichter durchdenken.
*   Leistungsstark bei der Implementierung von Interpretern, Debuggern, Optimierern und asynchronen Laufzeitumgebungen.

## Nachteile {#disadvantages}

*   Umständlicher als der direkte Stil.
*   Für Menschen mitunter schwerer zu lesen.
*   Erfordert zur Effizienz Tail-Call-Optimierung in Sprachen ohne native Unterstützung.
