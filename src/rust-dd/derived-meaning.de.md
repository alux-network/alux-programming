<!-- reader: {"title":"Abgeleitete Bedeutung und Komposition"} -->

# Abgeleitete Bedeutung und Komposition {#derived-meaning-and-composition}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability-Algebren](capability-algebras.md), [Interpreter und Effekte](interpreters.md)  
Concepts: [Expression Problem](../concepts/expression-problem.md)
```

```admonish note title="Orientierung"
Abgeleitetes Verhalten gehört zu den Capabilities, die es verwendet. Es wird einmal als Erweiterung über diesen Bounds formuliert und gehört keinem konkreten Typ, der sie zufällig implementiert. Die Klausel `where` benennt ehrlich, wovon eine Ableitung abhängt.
```

Primitive Capabilities liefern das Vokabular. Der Großteil des Anwendungsverhaltens sollte einmal daraus abgeleitet und von allen Interpretern gemeinsam genutzt werden.

## Erweiterungen enthalten die Ableitungen {#extensions-own-derivations}

Mit dem Crate [`extend`](https://docs.rs/extend/latest/extend/) lassen sich Verzweigungsoperationen unabhängig von ihrer Repräsentation ableiten:

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

Die Klausel `where` ist die vollständige Erklärung der semantischen Abhängigkeit: `BranchAlg` und nichts darüber hinaus. Kein konkreter Verzweigungstyp besitzt diese Definitionen.

Das Makro erspart lediglich wiederholten Trait- und Implementierungscode. Ein gewöhnliches Erweiterungs-Trait drückt denselben Entwurf aus. Denotational Design liegt in der semantischen Grenze und der Ableitung, nicht im Attribut.

## Warum nicht in die Struktur aufnehmen? {#why-not-put-it-on-the-struct}

````admonish warning title="Abgeleitete Bedeutung nicht an die Struktur koppeln"
Das ist repräsentationsorientiert. Wird ein numerischer Träger für Verzweigungen eingeführt, muss die Ableitung kopiert oder neu implementiert werden. So wird der erste konkrete Typ versehentlich zur Spezifikation.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

Erweiterungen kehren diese Zuständigkeit um:

| Ebene | Verantwortung |
| --- | --- |
| Semantische Capability | Besitzt die abgeleitete Bedeutung |
| Konkreter Typ | Interpretiert primitive Bedeutung |

## Mit Bounds komponieren {#compose-with-bounds}

Wenn ein Empfänger mehrere Capabilities interpretiert, verwende direkte Bounds:

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="Capabilities nicht bündeln"
Erstelle kein Supertrait, nur um den Bound zu verkürzen:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

Das Bündel verschleiert, welche Operation welche Capabilities benötigt, und schafft eine weitere Schnittstelle, die jeder Interpreter erfüllen muss.
````

## Fünf verschiedene Bedeutungen von Komposition {#five-different-composition-meanings}

Wähle die Form, die die Beziehung zutreffend beschreibt.

| Situation | Rust-Form |
| --- | --- |
| Ein Empfänger interpretiert mehrere Capabilities | Direkte Bounds |
| Ein separater Wert wählt das Verhalten | Expliziter Richtlinienparameter |
| Unabhängige Richtlinien werden statisch zusammengesetzt | Produkt oder gewöhnliche Struktur |
| Eine Umgebung enthält einen weiteren Interpreter | Kleine Projektion `HasX` |
| Ein Wrapper tritt an die Stelle eines inneren Interpreters | Delegation |

### Explizite Richtlinie {#explicit-policy}

Wenn eine Strategie unabhängig gewählt wird, übergib sie ausdrücklich an die Erweiterung:

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

Die Erweiterung besitzt die gemeinsame Ableitung; die Richtlinie bleibt eine unabhängig gewählte Eingabe. Sie wird weder in der Umgebung versteckt noch von `Default` ausgewählt.

### Produkt aus Richtlinien {#product-of-policies}

Unabhängige Richtlinien lassen sich zusammensetzen, ohne Vererbung zu erfinden:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### Projektion {#projection}

Ein `HasClock`\-Trait besagt lediglich, dass eine Umgebung einen separaten Uhrwert bereitstellen kann:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

Eine Operation, die die Zeit abfragt, ergänzt `This::Clock: ClockAlg` in ihrer eigenen `where`\-Klausel. Die Projektion bezieht sich weiterhin auf das Enthaltensein; die verwendende Operation nennt die benötigte Capability. Verwende dieses Muster nur, wenn die Trennung tatsächlich besteht. Führe `HasX` nicht bloß ein, um Felder zu ordnen.

### Delegation {#delegation}

Delegation bedeutet, dass ein Wrapper den inneren Interpreter selbst ersetzen kann. Das eignet sich für transparente Newtypes, gemeinsam genutzte Zeiger und Adapter, die den gesamten Capability-Vertrag bewahren.

Projektion bedeutet „hat“. Delegation bedeutet „ist“. Diese Begriffe sind nicht austauschbar.

## Auch Standardwerte sind semantische Entscheidungen {#defaults-are-semantic-decisions-too}

Mechanisch leere Zustände können `Default` implementieren. Fachliche Richtlinien sollten normalerweise explizit sein.

Nützliche Fälle haben oft eine algebraische Erklärung: Der Standardwert ist das neutrale Element bezüglich der natürlichen Komposition des Typs. Einen leeren Puffer anzuhängen, mit einer leeren Map zu verknüpfen oder null Diagnosen zu sammeln trägt nichts bei. Ist diese Komposition assoziativ, bilden Typ und Operation ein Monoid, und `Default` kann dessen neutrales Element benennen, statt eine Richtlinie auszuwählen.

Gute Standardwerte:

*   Leerer Puffer
*   Leere Map
*   Keine gesammelten Diagnosen

Fragwürdige Standardwerte:

*   Quorum-Schwelle
*   Führungsrichtlinie
*   Wiederholungssemantik
*   Bestätigungstiefe
*   Ausgabeformat

Das ist der entscheidende Unterschied: Ein neutrales Element führt keine Entscheidung ein, ein Quorum, eine Führungsstrategie oder eine Wiederholungsregel wählt dagegen ein Verhalten im Fachbereich aus. Ändert ein anderer Standardwert die fachliche Bedeutung, komponiere die Richtlinie ausdrücklich.

## Abgeleitete Bedeutung sollte abgeschlossen bleiben {#derived-meaning-should-stay-closed}

Eine Erweiterung darf nur die deklarierten Capabilities und expliziten Eingaben verwenden. Direkter Feldzugriff, globaler Zustand und konkrete Downcasts machen die Klausel `where` unehrlich.

Prüfe den Methodenrumpf so, als wäre er ein Beweis für die Abhängigkeitserklärung:

```admonish question title="Jede Ableitung prüfen"
Lässt sich jede Operation in diesem Rumpf durch diese Bounds begründen?
```

Falls nicht, sind entweder die Bounds unvollständig oder der Code gehört auf eine andere Ebene.

## Prüfpunkte für das Review {#review-checks}

*   Ist abgeleitetes Verhalten einmal für Capabilities definiert?
*   Vermeidet die Erweiterung konkrete Felder und Kontexttypen?
*   Werden für einen Interpreter direkte Bounds verwendet?
*   Sind Richtlinien explizite Werte, wenn sie unabhängig gewählt werden?
*   Formulieren Projektion und Delegation zutreffende Aussagen?
*   Sind fachliche Standardwerte in der Komposition sichtbar?
