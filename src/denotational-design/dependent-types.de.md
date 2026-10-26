<!-- reader: {"title":"Abhängige Typen und Beweise"} -->

# Abhängige Typen und Beweise {#dependent-types-and-proofs}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](design.md), [Gesetze und Interpretationen](laws-and-interpretations.md)  
Design by Meaning in Rust: [Semantische Typen in Rust](../rust-dd/semantic-types.md), [Gesetze, Szenarien und Nachweise](../rust-dd/laws.md)
```

```admonish note title="Semantische Einordnung"
Abhängige Typen drücken wertindizierte Aussagen und Nachweise in einem Typsystem aus. Sie können Teile einer semantischen Spezifikation kodieren, wählen diese Spezifikation aber nicht aus: Die beabsichtigte Eigenschaft muss klar sein, bevor sie in einen Typ übertragen wird.
```

## Typen mit Wertindizes {#types-indexed-by-values}

Ein Typ ist *abhängig*, wenn er von einem Wert abhängen kann. Ein abhängiger Typ kann daher nicht nur die Form eines Werts beschreiben, sondern auch eine Beziehung, die dieser Wert erfüllen muss.

Beispiele dafür sind:

*   `Vec<n, T>` — ein Vektor, dessen Länge als Index dient `n`
*   `Matrix<rows, cols, T>` — eine Matrix, deren Dimensionen als Indizes dienen
*   `Proof<p>` — ein Nachweis für eine Aussage `p`

Zum Beispiel:

```hs
append : Vec<n, T> -> Vec<m, T> -> Vec<n + m, T>
```

Der Ergebnistyp besagt, dass beim Anhängen von Vektoren der Längen `n` und `m` ein Vektor der Länge `n + m` entsteht.

## Abhängige Funktionen {#dependent-functions}

Ein abhängiger Funktionstyp wird so geschrieben:

$$ \Pi (x : A).\,B(x) $$

Für jeden Wert $x$ vom Typ $A$ hat das Ergebnis den Typ $B(x)$. Vergleiche:

$$ \begin{aligned} f &\colon A \to B \\ g &\colon (x : A) \to B(x) \end{aligned} $$

Der Ergebnistyp von $f$ ist fest. Der Ergebnistyp von $g$ kann sich mit der Eingabe ändern.

Im Rahmen der Entsprechung zwischen Aussagen und Typen kann ein Typ eine Aussage formulieren, und ein Term dieses Typs kann als ihr Beweis dienen. Das ermöglicht APIs, in denen ungültige Zustände, Übergänge oder Kompositionen nicht konstruiert werden können.

## Beziehung zu Denotational Design {#relationship-to-denotational-design}

Denotational Design fragt zuerst:

1.  Was ist der semantische Bereich?
2.  Welche Beobachtungen und Kompositionen sind wichtig?
3.  Welche Gesetze müssen gelten?

Abhängige Typen können einige dieser Antworten anschließend internalisieren. Ein Typindex kann die Länge eines Vektors, einen Protokollzustand, eine Stapeltiefe, eine Ressourcengrenze oder den Beweis festhalten, dass zwei Konstruktionen dasselbe Ergebnis bezeichnen.

Die Reihenfolge ist wichtig. Ein anspruchsvoller Typ liefert keine fehlende Bedeutung. Er stärkt eine Spezifikation nur dann, wenn die indizierte Aussage bereits eine beabsichtigte semantische Unterscheidung oder eine bewusst gewählte Repräsentationsinvariante beschreibt.

```admonish warning title="Semantische Aussagen nicht mit Repräsentationsinvarianten verwechseln"
Beides lässt sich in Typen kodieren, besitzt aber unterschiedliche Geltung. Jede kompatible Interpretation muss eine semantische Aussage bewahren. Eine Repräsentationsinvariante beschränkt nur die Repräsentation, für die sie festgelegt wurde.
```

## Beweise und ausführbare Nachweise {#proofs-and-executable-evidence}

Ein Beweis zeigt eine Aussage unter den genannten Annahmen. Eigenschafts-, Szenario- und Unit-Tests liefern endliche ausführbare Nachweise. Wird eine Aussage in einem abhängigen Typ kodiert, kann die Typprüfung einen Beweisterm verifizieren; dadurch werden Tests aber nicht zu Beweisen, und der Compiler wird nicht zur Quelle der Aussage.

Hier gilt dieselbe Trennung wie im ganzen Buch: Bedeutung und Gesetze formulieren die Verpflichtung; Werkzeuge prüfen sie oder setzen sie um.

## Das Modell in Rust anwenden {#applying-the-model-in-rust}

Rust ist keine vollständig abhängig typisierte Sprache, doch Const Generics, Typzustände, assoziierte Typen und Trait Bounds können nützliche indexierte Beziehungen ausdrücken. Solche Kodierungen können Prüfungen zur Compile-Zeit verlagern und oft effiziente konkrete Repräsentationen bewahren.

Das beweisorientierte Denkmodell bleibt wertvoll, auch wenn Rust die vollständige Aussage nicht ausdrücken kann. Formuliere die Invariante ausdrücklich, kodiere den Teil, den das Typsystem erzwingen kann, und sichere den Rest durch Gesetze oder Tests ab. Die Kodierung dient der Spezifikation; sie ersetzt sie nicht.

```admonish example title="Ein nach Position indiziertes Gitter"
[`typed-grid-rs`](https://github.com/tgrospic/typed-grid-rs) setzt die oben beschriebene `Matrix<rows, cols, T>` Idee in stabilem Rust um. Jede Zelle wird zu einem Typ, der durch ihre Koordinate indiziert ist — `Pos0x0`, `Pos1x2` und so weiter —, und ein Zug gibt einen *anderen* Positionstyp zurück:

`Pos0x0.right()` bezeichnet `Pos1x0`; ein Schritt über den Rand ist kein Laufzeitfehler, sondern ein Programm, das die Typprüfung nicht besteht, weil der entsprechende Zug am Rand nie erzeugt wird.

Dies ist dieselbe Anhebung, die der Abschnitt beschreibt: Die Koordinate, die sonst in der Wertebene läge, wird in den Typ übernommen, und gültige Navigation wird zu einer totalen, zur Compile-Zeit geprüften Funktion. Die Markertypen sind größenlos, daher verursacht die indizierte Aussage zur Laufzeit keinen Aufwand.
```
