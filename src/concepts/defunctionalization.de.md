<!-- reader: {"title":"Defunktionalisierung","sourceHash":"sha256:eb2496c232c1ef2750b59b1d678f25bd0220c3b91a597bbaa8714bcdfb620c6f"} -->

# Defunktionalisierung {#defunctionalization}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Programme erster Ordnung](../rust-dd/first-order-programs.md), [Sprach- und Compiler-Pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Freie Monade](free_monad.md), [Continuation-Passing Style](cps.md)  
Insights: [EVM-Algebra](../insights/evm-alg.md)
```

```admonish note title="Semantische Einordnung"
Defunktionalisierung ändert die Repräsentation und soll dabei das Anwendungsverhalten bewahren. Im bedeutungsorientierten Entwurf sind erzeugte Werte erster Ordnung nützlich, wenn ein weiterer Interpreter Operationen vor der Ausführung untersuchen oder zusammensetzen muss.
```

## Definition {#definition}

Defunktionalisierung ist eine Programmtransformation, die höherwertige Funktionen durch eine Datenstruktur erster Ordnung ersetzt, welche die möglichen Funktionen darstellt, sowie durch eine Interpreterfunktion, die sie anwendet.

## Motivation {#motivation}

Manche Sprachen, Compiler oder Laufzeitumgebungen können höherwertige Funktionen nicht effizient oder gar nicht verarbeiten. Durch Defunktionalisierung wird das Programm vollständig erstordentlich und lässt sich leichter kompilieren, analysieren, serialisieren oder in eingeschränkten Umgebungen ausführen.

## Vorgehensweise {#the-process}

1.  Alle möglichen höherwertigen Funktionen bestimmen, die erzeugt und weitergereicht werden können.
2.  Jeder solchen Funktion ein eindeutiges Tag in einem Enum oder Summentyp zuweisen, zusammen mit den für ihre Ausführung benötigten Daten.
3.  Funktionswerte durch diese Tags ersetzen.
4.  Eine `apply`\-Funktion definieren, die ein Tag und die Funktionsargumente erhält und dann anhand des Tags den passenden Code ausführt.

## Beispiel in Rust {#example-in-rust}

Vorher: mit einem Closure

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

Nachher: defunktionalisierte Form

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## Eigenschaften {#properties}

*   Alle Funktionen werden nun durch einfache Daten dargestellt.
*   Das Programm wird vollständig erstordentlich.
*   Die Funktion `apply` ersetzt direkte Funktionsaufrufe.

## Anwendungen {#applications}

*   Vereinfachung des Compiler-Backends: Viele Compiler erzeugen CPS-Code und defunktionalisieren ihn anschließend.
*   Serialisierung von Funktionen: Das Enum-Tag lässt sich über ein Netzwerk senden oder in einer Datei speichern.
*   Statische Analyse: Erstordentlicher Code lässt sich leichter durchdenken.
*   Ableitung von Interpretern: Defunktionalisierung führt auf natürliche Weise zu einem Interpreter-Muster.

## Beziehung zu CPS {#relation-to-cps}

In CPS (Continuation-Passing Style) sind Fortsetzungen höherwertige Funktionen. Defunktionalisierung von CPS-Code verwandelt diese Fortsetzungen in eine endliche Menge von Fällen in einem Enum sowie eine Anwendungsfunktion.

## Beziehung zu freien Monaden {#relation-to-free-monads}

Geeignete Repräsentationen freier Monaden lassen sich mit defunktionalisierten Fortsetzungen in CPS-transformierten Programmen in Beziehung setzen. Es besteht ein enger Zusammenhang, aber keine allgemeingültige Identität zwischen den beiden Konstruktionen.

## Anwendung auf Typebene {#type-level-application}

Defunktionalisierung kann auch Anwendungen auf Typebene in Sprachen ohne native Typen höherer Ordnung kodieren. Das [object-algebras C# experiment](https://github.com/tgrospic/object-algebras) setzt diese leichtgewichtige Kodierung mit `App<F, a>` um und drückt damit Funktor-, Applikativ-, Monaden- und Effektalgebren aus.

## Quellen {#references}

*   Reynolds, J. C. (1972). *Definitional Interpreters for Higher-Order Programming Languages*.  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J. und White, L. (2014). *Lightweight Higher-Kinded Polymorphism* (verwendet Defunktionalisierung zur Kodierung von Anwendungen auf Typebene).  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
