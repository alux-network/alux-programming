<!-- reader: {"title":"Gesetze und Interpretationen","sourceHash":"sha256:c280e677041694aed05e95e7b909c371e6213dfeebfc0f67dc50611262ea2dd5"} -->

# Gesetze und Interpretationen {#laws-and-interpretations}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](design.md)  
Design by Meaning in Rust: [Gesetze, Szenarien und Nachweise](../rust-dd/laws.md), [Interpreter und Effekte](../rust-dd/interpreters.md)  
Concepts: [Verzweigung und Konfluenz](../concepts/branching.md)
```

```admonish note title="Grundidee"
Gesetze beschreiben, wie die Operationen einer semantischen Schnittstelle zusammenhängen. Eine Interpretation weist ihnen konkrete Träger zu und muss diese Gesetze bewahren. Die gewählte Gleichheit bestimmt, welche Unterschiede zwischen Interpretern Bedeutung haben und welche frei bleiben.
```

Eine semantische Schnittstelle benennt Operationen. Gesetze legen ihre Beziehungen fest. Ohne Gesetze können zwei Implementierungen dieselben Rust-Signaturen erfüllen und sich dennoch über die Abstraktion uneinig sein.

## Gesetze vervollständigen das Vokabular {#laws-complete-the-vocabulary}

Für Verzweigungspositionen gehören beispielsweise folgende Gesetze dazu:

$$ \begin{aligned} \operatorname{path}(b,b) &= \lbrack\,\rbrack \\ \operatorname{path}(\operatorname{root}, \operatorname{from\_path}(d_s)) &= d_s \\ \operatorname{from\_path}(\operatorname{path}(\operatorname{root},b)) &= b \\ \operatorname{is\_ancestor}(b,b) &= \mathsf{true} \\ \operatorname{left}(b) &\ne \operatorname{right}(b) \end{aligned} $$

Diese Gesetze erklären mehr als Methodenkommentare. Sie beschreiben Identität, Rekonstruktion, Reflexivität und Trennung.

Nicht jede ansprechende Gleichung gilt. Eine Repräsentation mit fester Breite kann beispielsweise bei extremer Tiefe überlaufen. Dann handelt es sich entweder um:

*   eine Einschränkung des Interpreters außerhalb seines zugelassenen Bereichs
*   einen semantischen Fehler, den die Schnittstelle offenlegen muss
*   einen Hinweis darauf, dass der gewählte Träger falsch ist

Der Entwurf muss klarstellen, welcher Fall vorliegt.

## Interpretation {#interpretation}

Eine **Interpretation** weist einer semantischen Algebra konkrete Träger und Operationen zu.

| Semantisches Programm | Mögliche Interpretationen |
| --- | --- |
| Verzweigungsposition | Bitpfad, numerischer Baum, symbolische Form |
| Ausdrucksprogramm | Auswerter, Pretty-Printer, Optimierer |
| Programm einer typisierten API | Ausführbare Serverrouten, Dokumentation, Client-Generator |

Dasselbe Programm kann mehrere Interpretationen haben, weil das Programm mit keinem einzelnen Ergebnis identisch ist.

## Pflichten der Implementierung {#implementation-obligations}

Ein Interpreter muss die Struktur bewahren, die in der Spezifikation behauptet wird.

Ist das Zusammenführen im semantischen Programm assoziativ:

$$ (a \oplus b) \oplus c = a \oplus (b \oplus c) $$

dann sollten Interpreter die beobachtbare Bedeutung dieser Verknüpfung bewahren. Ist auch die Routenreihenfolge spezifiziert, muss die Gleichheit die Reihenfolge berücksichtigen. Wird die Reihenfolge bewusst ausgeblendet, dürfen Implementierungen sich operational unterscheiden und dennoch semantisch gleich sein.

Darum müssen der semantische Bereich und die Gleichheit gewählt werden, bevor Gesetze formuliert werden.

## Gesetze, Beweise und Tests {#laws-proofs-and-tests}

Diese Begriffe sind nicht austauschbar:

*   Ein **Gesetz** ist eine allgemein geltende Eigenschaft, die für die Abstraktion vorgesehen ist.
*   Ein **Beweis** zeigt ein Gesetz unter den genannten Annahmen.
*   Ein **Eigenschaftstest** prüft zahlreiche generierte Beispiele.
*   Ein **Szenariotest** prüft eine aussagekräftige, endliche Situation.
*   Ein **Unit-Test** prüft ein konkretes Verhalten.

Tests sind ausführbare Nachweise, keine allgemeinen Beweise. Sie bleiben dennoch wertvoll, weil sie für jeden Interpreter wiederverwendet werden können.

## Ausführbarer Nachweis {#executable-evidence}

Semantische Gesetze sind von ihren Implementierungen unabhängig. Ausführbare Prüfungen liefern endliche Nachweise dafür, dass ein Interpreter diese Gesetze bewahrt: Eigenschaftsprüfungen untersuchen gleichungsartige Behauptungen, während Szenarien beobachtbare Interaktionen prüfen. Werden sie ausschließlich mit semantischen Operationen formuliert, lassen sich dieselben Nachweise über kompatible Interpreter hinweg wiederverwenden. Tests stützen eine Spezifikation; sie definieren oder beweisen sie nicht.

Die Rust-Kodierungen werden in [Gesetze, Szenarien und Nachweise](../rust-dd/laws.md) entwickelt.

## Mehrere Interpreter klären die Bedeutung {#multiple-interpreters-clarify-meaning}

Nicht jedes kleine Trait braucht eine zweite Implementierung, doch sie ist ein aussagekräftiger Entwurfstest.

Lässt sich ein vermeintlich abstraktes Gesetz nur mit Feldern der ersten Implementierung formulieren, stimmt die semantische Grenze wahrscheinlich nicht. Kann ein zweiter Interpreter die primitiven Operationen implementieren und dieselben Gesetze erfüllen, ohne die erste Repräsentation nachzuahmen, gewinnt die Abstraktion an Glaubwürdigkeit.

Neutrale Interpreter sind besonders nützlich:

*   Ein Text-Interpreter macht die Programmstruktur sichtbar
*   Ein reines In-Memory-Modell isoliert die Gesetze
*   Ein Tracing-Interpreter macht ausgewählte Beobachtungen sichtbar
*   Ein Produktionsinterpreter führt reale Effekte aus

## Gleichheit bestimmt die Freiheit beim Refactoring {#equality-determines-refactoring-freedom}

Jede semantische Gleichheit gewährt Implementierungsfreiheit. Sind zwei Repräsentationen gemäß der gewählten Denotation gleich, darf eine Implementierung die eine durch die andere ersetzen.

Auch jede ausgelassene Beobachtung gewährt Freiheit. Ist die Allokationsreihenfolge semantisch irrelevant, darf sie sich ändern. Ist die Reihenfolge der Methodenaufrufe semantisch relevant, darf sie sich nicht ändern.

Gesetze sind daher nicht nur Korrektheitsbedingungen. Sie bestimmen den sicheren Spielraum für Optimierung, Austausch und Weiterentwicklung.

## Zwischenstand {#checkpoint}

Beantworte vor dem Einstieg in die Rust-Kodierungen diese Fragen:

1.  Was ist der semantische Träger?
2.  Was blendet die Abstraktion bewusst aus?
3.  Welche Operationen sind primitiv?
4.  Welche Operationen sind abgeleitet?
5.  Welche Gleichheit wird verwendet?
6.  Welche Gesetze muss jeder Interpreter bewahren?
7.  Welche Nachweise werden zwischen Interpretern geteilt?

Der Rest des Buches zeigt eine praktische Antwort in Rust. Sie ist eine Kodierung dieses semantischen Bildes, kein Ersatz dafür.
