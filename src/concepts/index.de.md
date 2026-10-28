<!-- reader: {"title":"Einführung","sourceHash":"sha256:194a77c34127d9a1e9575400d0bddfbda3cbea7bb3d4e51141da9e69c1e64bee"} -->

# Einführung in Concepts {#concepts-introduction}

![Concepts — the programming machinery](/concepts.png)

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
