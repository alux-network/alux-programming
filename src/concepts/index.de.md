<!-- reader: {"title":"Einführung","sourceHash":"sha256:aea0854cd288084035720b57d882094019b47b9cb967dc1c0115a6acb9d122a3"} -->

# Einführung in Concepts {#concepts-introduction}

![Concepts — the programming machinery](../assets/concepts.png)

```admonish tip title="Verwandte Themen"
The Semantic View: [Warum Bedeutung an erster Stelle steht](../denotational-design/semantic-view.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md)  
Insights: [Einführung](../insights/index.md)
```

Die Kapitel in diesem Teil erläutern wichtige Programmiermechanismen und theoretische Werkzeuge:

*   Operationale Semantik beschreibt Ausführungsregeln
*   CPS macht Fortsetzungen des Kontrollflusses explizit
*   Defunktionalisierung überführt bekanntes höherwertiges Verhalten in Daten erster Ordnung
*   Freie Monaden stellen Effektsyntax mit Sequenzierung dar
*   Kodierungen für das Expression Problem handhaben Erweiterbarkeit
*   Referenzielle Transparenz ermöglicht Substitution
*   Konfluenz, Spuren und Bisimulation vergleichen Verhaltensformen

Diese Konzepte werden durch Denotational Design nicht ersetzt, sondern darin eingeordnet.

```admonish quote title="Mechanik und Bedeutung"
[Concepts](index.md) und [Insights](../insights/index.md) erklären nützliche Programmiermechanismen. [Denotational Design](../denotational-design/design.md) erklärt, wie man entscheidet, was diese Mechanismen bewahren sollen.
```

Stelle beim Lesen jedes Kapitels drei Fragen:

1.  Beschreibt dieses Konzept Bedeutung, Repräsentation, Ausführung oder eine Transformation dazwischen?
2.  Welche Beobachtungen und Gleichheiten bewahrt es?
3.  Ist es die Spezifikation, eine ihrer Kodierungen oder ein Interpreter?

Einige Kapitel wurden geschrieben, bevor das Buch diesen ausdrücklichen semantischen Aufbau angenommen hat. Ihre Beispiele legen absichtlich weiterhin den Schwerpunkt auf die Ausführung. Kontextuelle Verknüpfungen und Insights-Kapitel stellen den Bezug zur semantischen Sicht her.
