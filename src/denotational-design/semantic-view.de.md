<!-- reader: {"title":"Warum Bedeutung an erster Stelle steht"} -->

# Warum Bedeutung an erster Stelle steht {#why-meaning-comes-first}

![The semantic view — choosing what a program means before how it runs](../assets/semantic-view.png)

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotationen und Kompositionalität](denotations.md), [Denotational Design](design.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md)  
Concepts: [Einführung](../concepts/index.md)
```

```admonish note title="Orientierung"
Denotational Design legt zuerst die Bedeutung eines Programms fest und leitet daraus anschließend Vokabular, Repräsentation und Ausführungsstrategie ab, die diese Bedeutung bewahren. Diese Seite stellt diese semantische Reihenfolge der in den meisten Softwareprojekten üblichen Reihenfolge gegenüber, bei der die Repräsentation an erster Stelle steht.
```

Die meisten Softwaresysteme werden in der Reihenfolge entworfen, in der sie ausgeführt werden:

1.  Zustand festlegen.
2.  Kontrollfluss festlegen.
3.  Methoden um diese Mechanismen herum bereitstellen.
4.  Anschließend erklären, was die Methoden bedeuten sollten.

Denotational Design kehrt diese Reihenfolge um:

1.  Bedeutung festlegen.
2.  Die Kompositionsstruktur bestimmen.
3.  Aus dieser Struktur ein Vokabular ableiten.
4.  Repräsentationen und Ausführungsstrategien auswählen.
5.  Überprüfen, ob sie die Bedeutung bewahren.

Diese Umkehrung ist die semantische Sicht.

```admonish quote title="Mechanik und Bedeutung"
[Concepts](../concepts/index.md) und [Insights](../insights/index.md) erklären nützliche Programmiermechanismen. [Denotational Design](design.md) erklärt, wie man entscheidet, was diese Mechanismen bewahren sollen.
```

## Drei Fragen {#three-questions}

Halte beim Entwurf eines Programms drei Fragen auseinander.

| Sicht | Frage | Typische Artefakte |
| --- | --- | --- |
| Semantisch | Was bedeutet dieses Programm? | Werte, Relationen, Funktionen, Gleichungen, Gesetze |
| Repräsentativ | Wie wird diese Bedeutung kodiert? | Rust-Typen, Traits, ASTs, Tabellen, Bäume, Bytecode |
| Operativ | Wie wird die Repräsentation ausgeführt? | Schleifen, Mutation, Tasks, Nachrichten, Interpreter, virtuelle Maschinen |

Alle drei Sichtweisen sind wichtig. Der Fehler besteht darin, zuzulassen, dass Repräsentation oder Ausführung die semantische Sicht unbemerkt festlegt.

Eine operationale Semantik beschreibt die Ausführung präzise und auf wertvolle Weise. Sie kann jeden Übergang eines Auswerters darstellen. Dennoch beantwortet sie eine andere Entwurfsfrage als eine denotationelle Darstellung. Die denotationelle Frage lautet, welchen beobachtbaren mathematischen Wert das Gesamtprogramm bezeichnet und welche Gleichungen unabhängig von der Ausführungsstrategie gelten sollen.

## Ein kleines Beispiel {#a-small-example}

Angenommen, ein System identifiziert Positionen in einem Verzweigungsprozess.

Ein repräsentationsorientierter Entwurf könnte mit einem Bitvektor beginnen:

```rust,noplayground
struct BranchId(Vec<bool>);
```

Um die Felder herum entstehen dann Methoden: ein Bit anhängen, ein Präfix ausschneiden, Vektoren vergleichen, Bytes serialisieren.

Die semantische Sicht setzt an einem anderen Punkt an:

*   Es gibt eine Wurzelposition.
*   Eine Position kann nach links oder rechts erweitert werden.
*   Eine Position kann Vorfahr einer anderen sein.
*   Der Pfad zwischen einem Vorfahren und einem Nachfahren lässt sich beobachten.

Diese Aussagen bleiben sinnvoll, auch wenn die Repräsentation später zu einer Ganzzahl, einer Baumkoordinate, einem kompakten Hybridwert oder einem Datenbankschlüssel wird. Der Bitvektor ist eine Interpretation der Verzweigungsposition, nicht deren Definition.

## Bedeutung ist keine nachträgliche Dokumentation {#meaning-is-not-documentation-after-the-fact}

Prosa über eine konkrete API zu schreiben, macht den Entwurf noch nicht denotationell. Die Bedeutung muss die API einschränken, bevor die Repräsentation gewählt wird.

Eine semantische Darstellung sollte uns sagen:

*   welche Unterscheidungen wichtig sind
*   welche Beobachtungen grundlegend sind
*   wie sich größere Bedeutungen zusammensetzen
*   welche Gleichungen gelten
*   was jede Implementierung bewahren muss
*   welche Einzelheiten bewusst ausgeblendet werden

Wenn das einzige präzise Artefakt eine Zustandsstruktur oder eine Ausführungsschleife ist, bestimmt weiterhin die Implementierung die Bedeutung.

## Abstraktion und Bedeutung {#abstraction-versus-meaning}

````admonish warning title="Ein Kontext-Trait definiert keine Bedeutung"
Eine Schnittstelle kann Mechanismen verbergen, ohne die Bedeutung zu erklären:

```rust,noplayground
trait ApplicationContext {
    fn database(&self) -> &Database;
    fn settings(&self) -> &Settings;
    fn runtime(&self) -> &Runtime;
}
```

Diese Schnittstelle abstrahiert den Zugriff auf konkrete Komponenten. Sie nennt nicht die semantischen Beobachtungen, die eine Berechnung voraussetzt.
````

````admonish success title="Direkt nach der Bedeutung fragen"
Eine bedeutungsorientierte Schnittstelle fragt nach der Beobachtung selbst:

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```
````

Dependency Inversion ist hilfreich, aber Denotational Design verlangt mehr: Die Abstraktionsgrenze muss sich an der Bedeutung statt am Speicherort orientieren.

## Die Richtung der Autorität {#the-direction-of-authority}

Wenn Artefakte einander widersprechen, überlasse nicht demjenigen die Deutungshoheit, das dem ausführbaren Code am nächsten ist. Frage, was jedes Artefakt bewahren muss.

| Rolle | Was hier hingehört | Verantwortung |
| --- | --- | --- |
| **Bedeutung** | Beabsichtigte Beobachtungen, Unterscheidungen und Gleichheiten des Fachgebiets | Legt fest, was Korrektheit bedeutet |
| **Spezifikation** | Semantische Bereiche, Denotationen, Typen, primitive Operationen, Gesetze und abgeleitete Kompositionen | Formuliert diese Bedeutung präzise |
| **Realisierung** | Konkrete Repräsentationen, Interpreter, Compiler, Laufzeitumgebungen, Speicher und Ablaufplanung | Setzt die Spezifikation um, ohne sie zu verändern |
| **Nachweis** | Beweise, Gesetzesprüfungen, Szenarien und Vergleiche zwischen Interpretern | Verknüpft eine Realisierung mit der Spezifikation; definiert die Bedeutung aber nicht selbst |

Daraus ergibt sich eine praktische Regel zur Klärung von Widersprüchen:

*   Verletzt eine Implementierung ein semantisches Gesetz, ändere die Implementierung.
*   Widerspricht ein Test dem Gesetz, das er prüfen sollte, ändere den Test.
*   Bringt die formale Spezifikation die beabsichtigte Bedeutung des Fachgebiets nicht zum Ausdruck, überarbeite die Spezifikation.

Ein Artefakt wird nach seiner Rolle eingeordnet, nicht nach seiner Syntax. Ein Rust-Trait oder ein Programm erster Ordnung kann zur Spezifikation gehören, wenn es die gewählte semantische Struktur direkt bewahrt; ein anderer Rust-Typ kann lediglich eine konkrete Kodierung sein. Auch eine formale operationale Semantik kann Teil einer Sprachspezifikation sein, doch ihre Übergänge müssen sich an den Beobachtungen und Äquivalenzen messen lassen, die die Sprache vorsieht.

CPS, Defunktionalisierung, freie Monaden, virtuelle Maschinen, Protokoll-Laufzeitumgebungen und Compiler-Pipelines lassen sich nun einordnen, ohne zu fragen, welche davon die endgültige Abstraktion ist. Jede davon ist für bestimmte Nutzer eine nützliche Repräsentations- oder Ausführungstechnik. Die semantische Spezifikation legt fest, was jede gewählte Technik bewahren muss.
