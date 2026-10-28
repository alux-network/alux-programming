<!-- reader: {"title":"Referenzielle Transparenz","sourceHash":"sha256:cf7ad00c5e2f7e6e1da3d3f18d03b6ec9ec16d836e412d29a99f0fa801064234"} -->

# Referenzielle Transparenz {#referential-transparency}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotationen und Kompositionalität](../denotational-design/denotations.md), [Gesetze und Interpretationen](../denotational-design/laws-and-interpretations.md)  
Insights: [Referential transparency reloaded](../insights/referential-transparency.md)
```

```admonish note title="Semantische Einordnung"
Referenzielle Transparenz hängt von der gewählten Denotation und Gleichheit ab. Sie ermöglicht Substitution, wenn das Ersetzen eines Ausdrucks seine festgelegte Bedeutung bewahrt — auch wenn sich Implementierungen hinter der semantischen Grenze operational unterscheiden.
```

Referenzielle Transparenz (RT) ist die Substitutionseigenschaft von Ausdrücken: Ein Ausdruck kann durch seine Denotation ersetzt werden, ohne die Programmbedeutung zu verändern.

Heute dient RT in der Praxis als Grundlage für Gleichungsrechnungen, sicheres Refactoring und gesetzesgeleiteten API-Entwurf.

## Grundbedeutung {#core-meaning}

RT besagt:

*   wenn `e` `v` bezeichnet
*   dann bewahrt die Verwendung von `v` anstelle von `e` die Bedeutung

Dies ist eine semantische Aussage und kein Schlagwort für Programmierstil.

### Reinheit {#purity}

Eine reine Funktion liefert für dieselben Eingaben dieselbe Ausgabe und hat keine beobachtbaren Seiteneffekte. RT ist das Substitutionsgesetz für Ausdrücke: Ein Ausdruck kann durch seine Denotation ersetzt werden, ohne die Bedeutung zu verändern. Reinheit ist daher ein verbreiteter Weg, RT in der Praxis zu erreichen; RT ist das umfassendere semantische Kriterium. Die Unterscheidung von Reinheit und RT im DD wird in [Referential transparency reloaded](../insights/referential-transparency.md) erläutert.

## Historischer Kontext {#historical-context}

In der Semantik von Programmiersprachen ist RT eng mit der Darstellung von Christopher Strachey verbunden. Seine Behandlung trennt das Schlussfolgern über Werte von Verhalten mit vielen Aktualisierungen:

*   **R-Werte**: Ausdruckswerte.
*   **L-Werte**: zuweisbare Speicherorte.

Entscheidend ist, dass die Substitution auf Ausdrucksebene stabil bleibt, solange über Werte geschlossen wird. Zuweisungen aktualisieren Speicherorte und erschweren das Substitutionsschließen oder machen es in seiner naiven Form ungültig.

## Was Zuweisungen und Seiteneffekte hier bedeuten {#what-assignment-and-side-effects-mean-here}

In diesem Kontext gilt:

*   **Zuweisung** bedeutet, einen Speicherort zu aktualisieren (z. B. `x := x + 1`).
*   Ein **Seiteneffekt** ist jede beobachtbare Änderung über die Rückgabe eines Werts hinaus.

Eine Zuweisung ist eine bestimmte Art von Seiteneffekt.

Darum scheitert RT in vielen imperativen Umgebungen: Die Auswertung kann von einem beobachtbaren Kontext außerhalb der expliziten Wertschnittstelle des Ausdrucks abhängen oder ihn verändern.

## Wie moderne Sprachen RT darstellen {#how-modern-languages-present-rt}

### Haskell {#haskell}

RT wird als Standardmethode zum Schlussfolgern über reine Ausdrücke gelehrt. Effekte sind in typisierten Konstruktionen ausdrücklich dargestellt (`IO`, Zustandsweitergabe und verwandte Abstraktionen), daher sind Substitutionsgesetze zentral für den täglichen Gebrauch.

### Scala (Cats / Cats Effect) {#scala-cats--cats-effect}

In der funktionalen Scala-Praxis bietet Cats Effect die verbreitetste Darstellung von RT:

*   `IO[A]` ist eine reine Beschreibung nebenwirkungsreicher Arbeit
*   Die Komposition von `IO`\-Werten ist referenziell transparent
*   Die Ausführung wird an Laufzeitgrenzen ausdrücklich ausgelöst (`unsafeRun*`).

Cats Effect stellt dem außerdem die eager `Future`\-Auswertung gegenüber. Das ist ein Grund, warum RT-Diskussionen in Scala Verzögerung und faule Auswertung betonen.

## RT heute {#rt-today}

In modernen Ökosystemen dient RT als Kurzform für substitutionssicheres Verhalten. In Systemen mit mehreren Programmierparadigmen wenden Teams RT-Aussagen meist auf bestimmte Module, APIs oder Bereiche mit typisierten Effekten an, statt auf den gesamten Code.

Die Interpretation von RT im Denotational Design wird in [Referential transparency reloaded](../insights/referential-transparency.md) erläutert.

## Quellen {#references}

*   Strachey, C. *Fundamental Concepts in Programming Languages* (Oxford PRG-Vorlesungsnotizen, 1967).  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Cats-Effect-Dokumentation: `IO` Datentyp sowie Hinweise zu RT und verzögerter Auswertung.  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Typelevel-Blog: *An IO monad for cats* (Motivation zu Unreinheit in Scala und RT).  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
