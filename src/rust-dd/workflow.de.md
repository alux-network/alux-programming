<!-- reader: {"title":"Ein bedeutungsorientierter Arbeitsablauf","sourceHash":"sha256:4e52a8067c665db3ce38a802a1615b5d660d1aeee86656c13b53a33c6ebd2dff"} -->

# Ein bedeutungsorientierter Arbeitsablauf {#a-meaning-first-workflow}

```admonish tip title="Verwandte Themen"
The Semantic View: [Warum Bedeutung an erster Stelle steht](../denotational-design/semantic-view.md)  
Design by Meaning in Rust: [Capability-Algebren](capability-algebras.md), [Abgeleitete Bedeutung und Komposition](derived-meaning.md), [Gesetze, Szenarien und Nachweise](laws.md)
```

```admonish note title="Eine wiederholbare Disziplin"
Denotational Design ist ein Arbeitsablauf, nicht nur eine Erklärung für fertigen Code: Formuliere die semantische Änderung, finde die kleinsten primitiven Capabilities, komponiere sie zutreffend, implementiere anschließend schlanke Interpreter und prüfe die Gesetze.
```

Denotational Design ist besonders nützlich als wiederholbare Entwicklungsdisziplin und nicht nur als Erklärung für fertigen Code.

## Der grundlegende Arbeitsablauf {#the-core-workflow}

Für ein neues Feature oder Refactoring:

1.  Die semantische Änderung in einem Satz formulieren.
2.  Träger und beobachtbare Gleichheit bestimmen.
3.  Die kleinsten erforderlichen primitiven Capabilities finden.
4.  Abgeleitetes Verhalten über explizite Capabilities definieren.
5.  Die passende Kompositionsform auswählen.
6.  Ein Programm erster Ordnung nur dann reifizieren, wenn seine Struktur mehrere Interpretationen benötigt.
7.  Schlanke konkrete Interpreter implementieren.
8.  Gesetze oder gemeinsam genutzte Szenarien ergänzen.
9.  Alternative Interpretationen validieren.
10.  Die Bedeutung vor den Mechanismen dokumentieren.

## Die semantische Änderung formulieren {#state-the-semantic-change}

Schwache Aussage:

> Einen Cache und eine Manager-Methode hinzufügen.

Bedeutungsorientierte Aussage:

> Wird derselbe unveränderliche Quellname während einer Kompilierung aufgelöst, bezeichnet er denselben Quellwert.

Die zweite Aussage legt ein mögliches Gesetz offen. Ein Cache kann später als eine Implementierung gewählt werden.

## Die primitive Grenze finden {#find-the-primitive-boundary}

Frage dich:

*   Welche neue Beobachtung oder Transformation ist erforderlich?
*   Ist sie an dieser Grenze primitiv oder aus der bestehenden Bedeutung ableitbar?
*   Wird ein neuer assoziierter Träger benötigt?
*   Ist die vermeintliche Abhängigkeit lediglich ein Speicherort?
*   Welche Unterschiede sollten unsichtbar bleiben?

Füge nur für tatsächlich neue primitive Bedeutungen eine Capability hinzu.

## Komposition zutreffend wählen {#choose-composition-truthfully}

Verwende diese Entscheidungstabelle:

| Frage | Auswahl |
| --- | --- |
| Interpretiert ein einzelner Empfänger alle benötigten Bedeutungen? | Direkte Bounds |
| Wird das Verhalten unabhängig ausgewählt? | Expliziter Richtlinienwert |
| Lassen sich Richtlinien unabhängig zusammensetzen? | Produkt |
| Enthält eine Umgebung einen weiteren Interpreter? | Projektion |
| Muss ein Wrapper den inneren Interpreter ersetzen können? | Delegation |

Führe nicht standardmäßig ein großes Kontext-Trait ein.

## Jeweils eine Bedeutung refaktorieren {#refactor-one-meaning-at-a-time}

Wenn vorhandener Code repräsentationsorientiert ist:

1.  Eine semantische Beobachtung bestimmen.
2.  Eine kleine Capability definieren.
3.  Eine Ableitung in eine Erweiterung verschieben.
4.  Die vorhandene Struktur als Interpreter beibehalten.
5.  Einen Test in der Form eines Gesetzes hinzufügen.

```admonish warning title="DD bedeutet nicht maximale Abstraktion"
Schreibe nicht ein ganzes Teilsystem in spekulative Abstraktionen um. DD bedeutet nicht maximale Abstraktion.
```

## Von der Bedeutung zu den Mechanismen reviewen {#review-from-meaning-to-machinery}

Lies den Code in dieser Reihenfolge:

1.  Capability-Traits
2.  semantische Werttypen
3.  abgeleitete Erweiterungen
4.  Syntax des Programms erster Ordnung, sofern vorhanden
5.  gemeinsam genutzte Gesetze und Szenarien
6.  konkrete Interpreter
7.  Orchestrierung der Laufzeit

Wer beim größten Zustandsobjekt beginnt, richtet die Prüfung auf dessen Repräsentation aus.

## Häufige Fehlerquellen {#common-failure-modes}

````admonish warning title="Ein Trait mit konkretem Zustand ist kein Denotational Design"
```rust,noplayground
trait ContextAlg {
    fn state(&self) -> &ConcreteState;
}
```

Das Trait ändert die Syntax, nicht aber die Zuständigkeit für die Bedeutung. Der semantische Kern hängt weiterhin von der konkreten Repräsentation ab.
````

### Abgeleitete Logik in jedem Interpreter {#derived-logic-in-every-interpreter}

Definiert jede Implementierung unabhängig denselben Fachalgorithmus, ist die Spezifikation dupliziert.

### Alleskönner-Capability {#god-capability}

Ein Supertrait mit unzusammenhängenden Operationen verbirgt die Abhängigkeiten und verhindert unabhängige Interpretationen.

### Vom Framework besessene Spezifikation {#framework-owned-specification}

Sind Routenannotationen oder RPC-Registrierung die einzige Schnittstellendefinition, können Dokumentation und Ausführung voneinander abweichen.

### Vom Makro besessene Bedeutung {#macro-owned-meaning}

Hat generierter Code kein öffentliches Ziel erster Ordnung, wird die Makroexpansion versehentlich zur Spezifikation.

### Richtlinie in Standardwerten versteckt {#policy-hidden-in-defaults}

Wählt `Default` unbemerkt Quorum-, Wiederholungs-, Sortierungs- oder Kompilierungsrichtlinien aus, ist die Komposition nicht mehr explizit.

### Tests interner Schritte {#tests-of-private-steps}

Tests, die an Feldlayout oder Durchlaufreihenfolge gekoppelt sind, erschweren gültige alternative Interpreter.

## Checkliste für Pull Requests {#pull-request-checklist}

### Bedeutung {#meaning}

*   Ist die semantische Änderung formuliert?
*   Sind Träger und Gleichheit klar?
*   Sind bewusste Auslassungen benannt?

### Capabilities {#capabilities}

*   Legt jedes Trait eine zusammenhängende primitive Bedeutung offen?
*   Sind Bounds dort platziert, wo sie von Operationen verwendet werden?
*   Vermeidet abgeleiteter Code konkrete Felder?

### Komposition {#composition}

*   Werden direkte Bounds, Richtlinien, Produkte, Projektionen und Delegation zutreffend eingesetzt?
*   Sind semantische Standardwerte explizit?

### Programme und Interpreter {#programs-and-interpreters}

*   Wird eine Struktur erster Ordnung nur dann eingeführt, wenn eine weitere Interpretation sie benötigt?
*   Können Komfortmakros auf öffentliche Programmwerte abbilden?
*   Sind konkrete Interpreter schlank und auf ihre Grenzen zugeschnitten?

### Nachweise {#evidence}

*   Gibt es ein Gesetz oder eine gezielte semantische Assertion?
*   Kann dasselbe Szenario auch mit einem anderen Interpreter ausgeführt werden?
*   Werden endliche Tests als Nachweise statt als Beweise beschrieben?

## Code im ALUX-Stil lesen {#reading-alux-style-code}

Folgende Grundstruktur ist erkennbar:

1.  winzige primitive Capability-Traits
2.  abgeleitete Erweiterungen mit expliziten Bounds
3.  Programme erster Ordnung, wenn Inspektion oder Komposition sie erfordert
4.  gemeinsam genutzte Gesetze und Szenarien
5.  konkrete Interpreter für Laufzeit, Compiler, HTTP, RPC oder Speicher

Auch große nebenläufige Systeme enthalten Bereiche mit hohem Orchestrierungsaufwand. Gehe nicht davon aus, dass jede bestehende Schnittstelle bereits eine ideale denotationelle Spezifikation ist. Suche nach semantischen Nahtstellen und lies von dort aus nach außen.

Tolang nutzt dieselbe Perspektive auf Sprachebene: Syntax wird in bedeutungstragende Formen normalisiert, die Kompilierung bewahrt diese Bedeutung, und eine nebenläufige Laufzeit interpretiert die ausführbare Repräsentation. Der operationale Ablauf bleibt wichtig, folgt aber erst auf den semantischen Vertrag.

## Abschließendes Prinzip {#final-principle}

Wenn du unsicher bist, kehre zu einer Frage zurück:

```admonish quote title="Die Frage, zu der du zurückkehren solltest"
Welche Bedeutung sollen diese Mechanismen bewahren?
```

Diese Frage löst nicht jedes technische Problem. Sie macht es auf der richtigen Ebene sichtbar.
