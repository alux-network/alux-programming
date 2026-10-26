<!-- reader: {"title":"Denotationen und Kompositionalität"} -->

# Denotationen und Kompositionalität {#denotations-and-compositionality}

```admonish tip title="Verwandte Themen"
The Semantic View: [Warum Bedeutung an erster Stelle steht](semantic-view.md), [Denotational Design](design.md), [Gesetze und Interpretationen](laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md)  
Concepts: [Referenzielle Transparenz](../concepts/referential_transparency.md), [Verzweigung und Konfluenz](../concepts/branching.md)
```

```admonish note title="Grundidee"
Eine Denotation ist eine Bedeutungsfunktion von der Syntax in einen gewählten semantischen Bereich. Eine Semantik ist kompositional, wenn sich die Bedeutung eines Ganzen aus den Bedeutungen seiner Teile ergibt. Dadurch werden semantische Gleichheit und sicheres Ersetzen möglich.
```

Eine **Denotation** ist die Bedeutung, die einem Syntaxelement oder einer Programmkonstruktion zugewiesen wird. Häufig schreiben wir:

$$ \llbracket e \rrbracket $$

für „die Bedeutung des Ausdrucks `e`“.

Die Klammern legen nicht fest, dass die Denotation eine Zahl sein muss. Je nach Bereich kann ein Programm Folgendes bezeichnen:

*   einen Wert
*   eine Funktion
*   eine Relation
*   eine Menge möglicher Ergebnisse
*   eine Zustandstransformation
*   eine Wahrscheinlichkeitsverteilung
*   das Verhalten eines Prozesses
*   ein Teilergebnis

Die erste Entwurfsentscheidung lautet daher nicht: „Welche Struktur soll das aufnehmen?“, sondern: „Welcher semantische Bereich enthält die Bedeutungen, die uns wichtig sind?“

## Semantische Bereiche {#semantic-domains}

Für arithmetische Ausdrücke kann ein einfacher Bereich aus den ganzen Zahlen bestehen:

$$ \llbracket e \rrbracket_{eval} \in \mathbb{Z} $$

Bei der Formatierung kann dieselbe Ausdruckssprache als Text interpretiert werden:

$$ \llbracket e \rrbracket_{pretty} \in \mathsf{String} $$

Bei einer Berechnung mit Seiteneffekten könnte der Bereich eine Zustandstransformation sein:

$$ \llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State} $$

Bei einer nebenläufigen Sprache kann der Bereich das beobachtbare Prozessverhalten beschreiben, statt eine einzige vorgegebene Ablaufspur.

Der gewählte Bereich bestimmt, welche Unterschiede Bedeutung haben. Ist Zeitverhalten nicht Teil des Bereichs, können zwei Implementierungen trotz unterschiedlichen Timings dasselbe Programm bezeichnen. Wird der Ressourcenverbrauch einbezogen, kann derselbe Unterschied semantisch relevant werden.

## Abstraktion blendet bewusst aus {#abstraction-forgets-intentionally}

Eine nützliche Denotation blendet irrelevante Maschinendetails aus.

Für eine Verzweigungsposition kann die Denotation den Pfad von der Wurzel bewahren und zugleich Folgendes ausblenden:

*   Byteanordnung
*   Allokationsstrategie
*   Cache-Verhalten
*   Serialisierungsformat

Für ein HTTP-Programm kann eine portable Denotation Methode, Pfad, Eingaberollen, Operation und Ausgaberolle bewahren und zugleich ausblenden, welcher Router oder Executor das Programm ausführt.

Für eine Compilerstufe kann die Denotation die Übersetzung von normalisiertem Quelltext in ausführbare Bedeutung bewahren und zugleich temporäre Puffer und die Reihenfolge der Durchläufe ausblenden.

Ausblenden ist kein Mangel. Dadurch werden alternative Repräsentationen äquivalent.

## Kompositionalität {#compositionality}

Eine Semantik ist **kompositional**, wenn sich die Bedeutung eines Ganzen aus den Bedeutungen seiner Teile und der Art ihrer Verknüpfung ergibt.

Für die Addition:

$$ \llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket $$

Für die sequenzielle Komposition von Funktionen:

$$ \llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket $$

Für einen Operator paralleler Prozesse braucht der semantische Bereich eine entsprechende parallele Komposition:

$$ \llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket $$

Der konkrete Operator $\otimes$ hängt vom gewählten Prozessmodell ab. Entscheidend ist, dass sich die syntaktische Komposition systematisch auf die semantische Komposition abbildet.

Kompositionalität ermöglicht lokales Schlussfolgern. Haben zwei Teile dieselbe Denotation, kann der eine in jedem kompositionalen Kontext durch den anderen ersetzt werden:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket \implies \llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket $$

Darauf beruhen sicheres Ersetzen und semantisches Refactoring.

## Semantische Gleichheit {#semantic-equality}

Programme müssen weder textuell noch operational identisch sein, um semantisch gleich zu sein.

Betrachte zwei Implementierungen einer Verzweigungsposition:

$$ \lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack $$

und eine Ganzzahlkodierung, die denselben Pfad bezeichnet. Ihre gespeicherten Werte unterscheiden sich, ihre Denotationen können jedoch gleich sein.

Ebenso können zwei Compiler-Pässe die Syntax in unterschiedlicher Reihenfolge durchlaufen und dennoch ausführbare Programme mit demselben spezifizierten Verhalten erzeugen. Ob Byte-für-Byte-Gleichheit erforderlich ist, ist ein separates, strengeres Gesetz.

Benenne immer die behauptete Gleichheit:

*   Wertgleichheit
*   strukturelle Gleichheit
*   Gleichheit der kanonischen Repräsentation
*   Spuräquivalenz
*   Bisimilarität
*   beobachtungsbezogene Äquivalenz
*   denotationelle Gleichheit

Diese Gleichheiten zu verwechseln, ist eine häufige Quelle falscher Gesetze.

## Externalität ist relativ {#externality-is-relative}

Angenommen, eine Berechnung hat folgende Bedeutung:

$$ H \times E \to O $$

Bezogen auf `H` ist der Nachweis `E` extern. Wählt eine neue Abstraktion `H × E` als ihren Träger, wird dieser Nachweis innerhalb der neuen Grenze intern.

Diese Beobachtung ist für Effekte und Kontexte wichtig. Keine Tatsache ist grundsätzlich eine Umgebungsbedingung. Entscheidend ist, ob der aktuelle semantische Träger sie einschließt und welche Gesetze dafür gelten.

```admonish warning title="Kein universelles Kontextobjekt"
Löse diese Grenzfrage nicht mit einem universellen Kontextobjekt. Benenne jede zugelassene Bedeutung als Capability oder expliziten Wert.
```

## Primitive und abgeleitete Bedeutung {#primitive-and-derived-meaning}

Primitive Operationen bilden das gewählte Vokabular des semantischen Bereichs. Abgeleitete Operationen werden daraus definiert.

Für Verzweigungspositionen könnte ein kleines primitives Vokabular so aussehen:

*   Eine Wurzelposition
*   Erweiterung um eine Richtung
*   Beobachtung des Pfads von einer Position zu einer anderen

Daraus lassen sich ableiten:

*   Nach links erweitern
*   Nach rechts erweitern
*   Aus einem Pfad konstruieren
*   Prüfen, ob eine Position Vorfahr einer anderen ist
*   Prüfen, ob eine Position Nachfahr einer anderen ist

Diese Unterscheidung ist eine Entwurfsentscheidung, keine metaphysische Tatsache. Bevorzuge eine kleine Menge primitiver Operationen, mit der sich Gesetze und alternative Interpretationen leicht formulieren lassen.

## Ein nützlicher Test {#a-useful-test}

Vervollständige vor dem Einführen einer Programmierschnittstelle diese Sätze:

*   Werte dieser Abstraktion bedeuten ...
*   Die primitiven Beobachtungen sind ...
*   Die sinnvollen Kompositionen sind ...
*   Zwei Werte sind äquivalent, wenn ...
*   Jede Implementierung muss ... bewahren
*   Die Abstraktion blendet bewusst ... aus

Lassen sich diese Sätze nicht vervollständigen, liefert zusätzliche Implementierungsmechanik nicht die fehlende Bedeutung.
