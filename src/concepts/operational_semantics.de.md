<!-- reader: {"title":"Operationale Semantik"} -->

# Operationale Semantik {#operational-semantics}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Sprach- und Compiler-Pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Freie Monade](free_monad.md), [Continuation-Passing Style](cps.md), [Defunktionalisierung](defunctionalization.md)  
Insights: [Von der Semantik zu Maschinen](../insights/operational_semantics.md)
```

## Definition {#definition}

**Operationale Semantik** beschreibt Programmverhalten anhand von Auswertungsurteilen oder Übergängen zwischen **Konfigurationen**. Eine Konfiguration kann ein Programmfragment mit einer Umgebung, einem Speicher, einer Fortsetzung oder einem anderen abstrakten Maschinenzustand enthalten.

Die Beschreibung ist mathematisch: Sie legt fest, welche Auswertungen oder Übergänge zulässig sind. Ein Interpreter oder eine virtuelle Maschine kann diese Regeln implementieren, ist aber selbst nicht die Definition.

```admonish note title="Semantische Einordnung"
Operationale Semantik ist eine präzise Semantik und nicht bloß ein informelles Implementierungsdetail. Sie erklärt Verhalten anhand von Auswertungs- oder Übergangsregeln. [Denotational Design](../denotational-design/design.md) stellt die ergänzende, vorgelagerte Entwurfsfrage: Welche kompositionalen Bedeutungen und Gleichungen sollen diese Regeln bewahren?
```

## Stile der operationalen Semantik {#styles-of-operational-semantics}

### Kleine Schritte (strukturelle operationale Semantik) {#small-step-structural-operational-semantics}

Die Berechnung wird in atomare Übergänge zerlegt:

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

Nützlich zur Modellierung von Nebenläufigkeit, Interleaving und partieller Ausführung.

### Große Schritte (natürliche Semantik) {#big-step-natural-semantics}

Beschreibt die Auswertung anhand ihrer Endergebnisse:

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

Häufig leichter verständlich, wenn man über terminierende Programme nachdenkt.

## Formale Regeln {#formal-rules}

Operationale Semantik wird üblicherweise mit **Inferenzregeln** angegeben. Für eine einfache arithmetische Sprache gilt:

$$ E ::= n \mid E + E $$

Für eine Auswertung von links nach rechts werden drei Regeln benötigt:

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

Die ersten beiden Regeln wählen den nächsten reduzierbaren Teilausdruck aus. Die dritte addiert, sobald beide Operanden Werte sind.

Auswertungsspur:

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## Warum das wichtig ist {#why-it-matters}

*   Liefert ein **präzises, maschinenähnliches Modell** der Ausführung.
*   Grundlage für Interpreter und virtuelle Maschinen.
*   Unterstützt Überlegungen zu Korrektheit, Ressourcenverbrauch und Sicherheit.

## Beziehung zu anderen Konzepten {#relation-to-other-concepts}

*   Eine **freie Monade** stellt Instruktionssyntax und Sequenzierung bereit. Operationale Regeln können beschreiben, wie ein Programm in dieser Repräsentation ausgewertet wird.
*   **CPS** macht den restlichen Berechnungsablauf als Fortsetzung explizit. Operationale Regeln können beschreiben, wie Werte an diese Fortsetzungen übergeben werden.
*   **Defunktionalisierung** ersetzt eine bekannte Familie von Funktionen durch Daten erster Ordnung und eine `apply`\-Operation. Operationale Regeln können die daraus entstehenden expliziten Maschinenzustände beschreiben.

Dies sind Objekte und Transformationen, für die eine operationale Semantik angegeben werden kann. Sie sind selbst keine operationale Semantik.

## In der Praxis {#in-practice}

Operationale Regeln können einen Interpreter leiten und ein präzises Modell liefern, an dem er geprüft wird:

*   Die **EVM** lässt sich natürlich als Übergangssystem in kleinen Schritten modellieren; eine terminierende Gesamtausführung kann außerdem durch ein Urteil in großen Schritten beschrieben werden.
*   Regeln in kleinen Schritten entsprechen häufig den `match`\-Armen in einem Rust-Interpreter.

$$ n_1 + n_2 \to n_3 $$

Die vollständige Relation von links nach rechts lässt sich als Rust-Code darstellen:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

Diese Funktion führt einen Übergang aus. Wiederholte Anwendung erzeugt die dargestellte Spur; die Rückgabe von `None` bedeutet, dass der Ausdruck bereits ein Wert ist.

## Operationale und denotationelle Fragen {#operational-and-denotational-questions}

Operationale Regeln können Sicherheit, Fortschritt, Ressourcengrenzen und die Übereinstimmung mit Implementierungen beweisen. Eine Einschränkung entsteht, wenn die operative Mechanik vor der beabsichtigten abstrakten Bedeutung gewählt wird: Implementierungsentscheidungen können versehentlich zu semantischen Festlegungen werden.

Denotational Design lehnt operationale Semantik nicht ab. Es fordert dazu auf, zuerst den semantischen Bereich, die Komposition und die Gesetze festzulegen und anschließend das operationale Modell damit in Beziehung zu setzen.

| Sicht | Frage |
| --- | --- |
| Denotationell | Was bedeutet das Gesamtprogramm? |
| Operational | Durch welche Übergänge wird es ausgewertet? |
| Korrektheit | Bewahren diese Übergänge die beabsichtigte Bedeutung? |

Die folgenden Clips veranschaulichen die Gefahr, operationale Beschreibungen als einzige Erkenntnisquelle zu behandeln.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Die operationale Beschreibung ist nicht die ganze Bedeutung (1 von 2)</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Die operationale Beschreibung ist nicht die ganze Bedeutung (2 von 2)</figcaption></figure>
