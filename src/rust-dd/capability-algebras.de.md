<!-- reader: {"title":"Capability-Algebren","sourceHash":"sha256:0c3fefabad08ae4d7f39d28d5855e2983e2c46d3acba947e186a304d1e91139e"} -->

# Capability-Algebren {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotational Design](../denotational-design/design.md), [Denotationen und Kompositionalität](../denotational-design/denotations.md)  
Design by Meaning in Rust: [Semantische Typen in Rust](semantic-types.md), [Abgeleitete Bedeutung und Komposition](derived-meaning.md)  
Concepts: [Expression Problem](../concepts/expression-problem.md), [Verzweigung und Konfluenz](../concepts/branching.md)
```

```admonish note title="Orientierung"
Ein Capability-Trait ist eine kleine Algebra: Es benennt die primitiven Beobachtungen und Transformationen, die eine Bedeutung erfordert, und überlässt die Repräsentation dem Interpreter. Das Vokabular wird aus der Bedeutung abgeleitet, nicht aus den Feldern, die eine erste Implementierung zufällig enthält.
```

Rust bietet kein eingebautes Konstrukt namens „Denotational Design“. Semantische Vokabulare kodieren wir mit gewöhnlichen Sprachmitteln. Kleine Capability-Traits sind eine nützliche Kodierung.

Das Suffix `Alg` bedeutet in diesem Buch **Algebra**: eine zusammenhängende Menge primitiver Operationen über vom Interpreter gewählten Trägern.

## Bei der Bedeutung beginnen {#start-from-meaning}

Die Bedeutung der Verzweigungspositionen aus dem vorherigen Teil lässt sich so ausdrücken:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Left,
    Right,
}

pub trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>>;
}
```

Das Trait formuliert drei primitive Bedeutungen:

*   die Wurzel konstruieren
*   einen Zweig in eine Richtung erweitern
*   den relativen Pfad beobachten, sofern er existiert

Es legt weder offen, wo Zweige gespeichert werden, noch wie Pfade kodiert sind.

## Capabilities sind keine Feldprojektionen {#capabilities-are-not-field-projections}

````admonish warning title="Feldprojektionen sind keine semantischen Capabilities"
Vergleiche:

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

Dieses Trait verbirgt eine Struktur hinter Methoden, legt ihre Repräsentation aber weiterhin offen. Abgeleitete Logik wird dadurch an Vektoren, Booleans, Besitzverhältnisse und die Mutationsstrategie gekoppelt.
````

Eine semantische Capability stellt die Beobachtung oder Transformation bereit, die die nachgelagerte Bedeutung erfordert. Frage dich:

```admonish question title="Zu jeder Capability fragen"
Wäre diese Operation noch sinnvoll, wenn die Implementierung eine Datenbank, einen symbolischen Term, eine kompakte Ganzzahl oder einen entfernten Dienst verwendete?
```

Falls ja, könnte die Operation zur Capability gehören. Benötigen Aufrufer hingegen das aktuelle Feldlayout, gehört sie wahrscheinlich nicht dazu.

## Eine primitive Bedeutung pro Trait {#one-primitive-meaning-per-trait}

Kleine Traits machen Abhängigkeiten sichtbar:

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

Eine abgeleitete Operation, die Zeit und eine Frist benötigt, kann beide Traits voraussetzen. Sie benötigt kein `ApplicationContext` mit Protokollierung, Speicher, Netzwerkzugriff, Konfiguration und Ablaufplanung.

„Klein“ bedeutet nicht mechanisch genau eine Methode. Fasse Operationen zusammen, wenn sie eine untrennbare semantische Struktur bilden. Teile sie auf, wenn sie unabhängige Bedeutungen ausdrücken oder unabhängig interpretiert werden können.

## Assoziierte Typen wählen Träger {#associated-types-select-carriers}

Verwende assoziierte Typen, wenn der Interpreter die Repräsentation auswählt:

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

Verlange weder `String` noch `std::io::Error` oder einen konkreten Syntaxbaum, es sei denn, sie gehören an dieser Grenze zum stabilen semantischen Vokabular.

Konkrete semantische Werte sind dagegen willkommen:

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

Die Regel lautet nicht: „Mache jeden Typ abstrakt.“ Sie lautet: „Verwechsle Interpretermechanik nicht mit semantischem Vokabular.“

## Bounds dort platzieren, wo sie gebraucht werden {#put-bounds-where-they-are-used}

Halte primitive Operationen frei von nicht benötigten Einschränkungen:

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="Keine vorsorglichen Bounds hinzufügen"
Beschränke den assoziierten Typ nicht nur deshalb, weil ein möglicher zukünftiger Algorithmus diese Einschränkung brauchen könnte:

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

Die Operation zum Sortieren von Kandidaten kann `Ord` voraussetzen; die Operation, die sie in eine Hash-Menge einfügt, kann `Hash` voraussetzen.
````

Bounds am Verwendungsort halten primitive Bedeutungen wiederverwendbar und machen den tatsächlichen Vertrag abgeleiteten Verhaltens sichtbar.

## Effekte können primitive Bedeutungen sein {#effects-can-be-primitive-meaning}

Capability-Traits setzen keine reine Ausführung voraus:

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

Veröffentlichen ist ein Effekt. An der aktuellen Grenze kann es dennoch eine primitive semantische Operation sein. Der konkrete Interpreter kann HTTP, eine Warteschlange, eine Datei oder einen Testpuffer verwenden.

Die semantische Ebene sollte weder Wiederholungsversuche noch Socket-Besitz, das Starten von Tasks oder Verbindungspools vorschreiben, sofern diese Unterschiede nicht zur beabsichtigten Bedeutung gehören.

## Die Grenze benennen {#naming-the-boundary}

Capabilities sollten aus der semantischen Sicht des Nutzers formuliert werden:

| Bedeutungsorientiert | Repräsentationsorientiert |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

Benennung ist Entwurf. Ein mechanischer Name lädt zu mechanischer Kopplung ein.

## Prüfpunkte für das Review {#review-checks}

*   Legt das Trait eine zusammenhängende primitive Bedeutung offen?
*   Könnte ein unabhängiger Interpreter es implementieren, ohne die erste Repräsentation zu kopieren?
*   Sind assoziierte Typen nur dort abstrakt, wo der Interpreter tatsächlich eine Wahl trifft?
*   Sind konkrete Typen stabiles semantisches Vokabular?
*   Fehlen Bounds, bis eine Operation sie benötigt?
*   Vermeidet das Trait die Rückgabe von Managern, Kontexten und unverarbeitetem Speicher?
