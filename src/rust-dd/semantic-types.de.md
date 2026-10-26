<!-- reader: {"title":"Semantische Typen in Rust"} -->

# Semantische Typen in Rust {#semantic-types-in-rust}

```admonish tip title="Verwandte Themen"
The Semantic View: [Abhängige Typen und Beweise](../denotational-design/dependent-types.md), [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability-Algebren](capability-algebras.md), [Programme erster Ordnung](first-order-programs.md), [Gesetze, Szenarien und Nachweise](laws.md)  
Concepts: [Referenzielle Transparenz](../concepts/referential_transparency.md)
```

```admonish note title="Orientierung"
Bedeutungsorientiertes Rust verwendet Typen, um semantische Strukturen sichtbar zu halten. Assoziierte Typen benennen Trägerfamilien, Bounds legen Beziehungen zwischen ihnen fest, und Erweiterungen leiten neue Operationen aus expliziten Voraussetzungen ab. Die Gesetze bestimmen weiterhin, was jede Interpretation bewahren muss.
```

In Rust werden mehrere unterschiedliche Rollen mit `type` geschrieben. Sie auseinanderzuhalten verhindert, dass Bedeutung in Repräsentation aufgeht.

| Rolle | Beispiel | Aussage |
| --- | --- | --- |
| Semantischer Typ | `Direction` | Welche Unterschiede im Fachbereich wichtig sind |
| Vom Interpreter gewählter Träger | `BranchAlg::Branch` | Welche Repräsentation ein Interpreter auswählt |
| Abgeleitete Operation | `BranchExt::branch_child` | Was aus den deklarierten Capabilities folgt |
| Stufentyp | `Syntax`, `CoreProgram`, `Executable` | Welche Transformation ein Wert durchlaufen hat |
| Repräsentationstyp | `BitBranch` | Wie ein Interpreter die Verzweigungsbedeutung speichert |
| Nachweisprogramm | Ein Szenario oder eine wiederverwendbare Gesetzeserweiterung | Welche Beobachtungen kompatible Interpreter erfüllen müssen |

## Semantische Typen vor der Repräsentation {#semantic-types-before-representation}

Angenommen, ein Verzweigungsbereich unterscheidet zwei Richtungen:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction` benennt die Unterscheidung direkt. Ein Interpreter kann einen Pfad kompakt kodieren:

```rust,noplayground
struct BitBranch(Vec<bool>);
```

Die Booleans gehören zu dieser Repräsentation. Sie definieren nicht links und rechts, und ein anderer Interpreter muss sie nicht verwenden.

```admonish warning title="Eine kompakte Kodierung ist nicht der semantische Typ"
Definiere Fachverhalten nicht anhand von Bitpositionen, Byteversätzen oder Maschinenverzweigungen. Diese Artefakte müssen die semantischen Unterschiede kodieren; sie bestimmen sie nicht.
```

Diese Trennung ermöglicht Änderungen an Speicher- und Ausführungslayouts, ohne den Fachbereich unbemerkt zu verändern.

## Assoziierte Typen wählen Träger {#associated-types-choose-carriers}

Eine Capability-Algebra kann den Träger jedem Interpreter überlassen:

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

`Self::Branch` ist kein verborgener Feldtyp. Es ist der Träger, den eine Interpretation der Verzweigungsbedeutung auswählt. Ein Bitpfad, eine numerische Baumposition, ein symbolischer Term oder eine andere Repräsentation können derselben Algebra genügen.

Für einen Interpreter `T` lässt sich die Notation `T::Branch` als Trägerfamilie $\mathsf{Branch}(T)$ lesen. Ein Wechsel des Interpreters kann den Träger ändern, während jede Operation konsistent an dieselbe Auswahl gebunden bleibt.

## Erweiterungen leiten Folgerungen ab {#extensions-derive-consequences}

Eine Erweiterung kann aus genau den benötigten Voraussetzungen eine neue Operation konstruieren:

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

Die Klausel `where` ist die Voraussetzung: `This` interpretiert die Verzweigungsalgebra. Die Methode ist die Folgerung: Für den Träger dieses Interpreters bestimmen ein Zweig und eine Richtung einen Kindzweig.

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

Die Ableitung wählt keine konkrete Repräsentation für den Zweig aus. Das Ergebnis bleibt in der vom Interpreter gewählten Trägerfamilie.

## Gleichheits-Bounds legen Kompatibilität fest {#equality-bounds-state-compatibility}

Zwei Capabilities müssen sich manchmal auf einen Träger einigen. Eine Gleichheit assoziierter Typen kann diese Anforderung ausdrücken, ohne eine konkrete Repräsentation festzulegen:

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

Lies den Bound als lokale Aussage: `Left` und `Right` interpretieren Verzweigungsoperationen über demselben Träger. Platziere diese Gleichheit bei der Operation, die die Übereinstimmung benötigt, statt sie beiden Algebren global aufzuerlegen.

Ein solcher Bound ist stärker und präziser, als einen konkreten Kontext zu akzeptieren, nur weil er zufällig beide Implementierungen enthält.

## Stufentypen machen Compilerverträge sichtbar {#stage-types-make-compiler-contracts-visible}

Eine Compiler-Pipeline sollte nicht in jeder Phase denselben undifferenzierten Baum weiterreichen. Unterschiedliche Stufentypen geben an, welche Transformation stattgefunden hat:

| Stufe | Eingabe | Ausgabe | Vertrag |
| --- | --- | --- | --- |
| Parsen | Quelltext | `Syntax` | Erkennt die Oberflächengrammatik |
| Normalisieren | `Syntax` | `CoreProgram` | Erzeugt die gewählte Kernbedeutung |
| Codegenerierung | `CoreProgram` | `Executable` | Bewahrt die Programmbeobachtungen in ausführbarer Form |
| Laufzeit | `Executable` | Beobachtbares Verhalten | Interpretiert das ausführbare Programm konsistent mit dem Sprachmodell |

Diese Typen verhindern eine versehentliche Verwechslung von Stufen, doch ihre Namen allein beweisen keine Bewahrung. Für die Transformationen braucht es weiterhin formulierte Gesetze, repräsentative Szenarien und Nachweise über mehrere Interpreter hinweg.

## Den Vertrag lesen {#read-the-contract}

Die Struktur auf Typebene lässt sich aufschlussreich logisch lesen:

| Rust-Form | Bedeutung |
| --- | --- |
| `This: BranchAlg` | `This` liefert eine Interpretation der Verzweigungsbedeutung |
| `This::Branch` | Der Verzweigungsträger wird von `This` ausgewählt |
| `Right: BranchAlg<Branch = Left::Branch>` | Zwei Interpretationen stimmen bei ihrem Träger überein |
| `-> This::Branch` | Das Ergebnis bleibt in der ausgewählten Trägerfamilie |

Diese Lesart regt APIs dazu an offenzulegen, wovon ein Typ abhängt, welche Gleichheiten für Komposition erforderlich sind und welche Folgerungen aus den Voraussetzungen hervorgehen. Assoziierte Typen, generische assoziierte Typen, Const Generics, Typzustände und größenlose Zeugen können Teile solcher Verträge ausdrücken, wenn der zugrunde liegende Unterschied tatsächlich besteht.

Führe keine Typmechanismen nur deshalb ein, damit eine Implementierung formaler wirkt. Ein Typ sollte Bedeutung sichtbar machen oder eine notwendige Beziehung bewahren, nicht bloß eine Repräsentation dekorieren.

## Typen ersetzen keine Gesetze {#types-do-not-replace-laws}

Eine Typsignatur schränkt ein, welche Programme gebildet werden können. Gesetze bestimmen, wie ihre Operationen zusammenhängen. Beides ist erforderlich.

Zum Beispiel besagt `BranchAlg::Branch`, dass jeder Interpreter einen Träger für Verzweigungen auswählt. Daraus folgt nicht automatisch, dass:

*   der Pfad eines Zweigs zu sich selbst leer ist
*   die erneute Wiedergabe eines Wurzelpfads den Zweig rekonstruiert
*   entgegengesetzte Kindzweige verschieden sind

Dies sind semantische Gesetze, die kompatible Interpreter teilen. Repräsentationsspezifische Aussagen — etwa dass ungenutzte Bits null sind — gehören zum Interpreter, der diese Repräsentation gewählt hat.

```admonish quote title="Typen als Behauptungen lesen"
Frage, was jeder Typ behauptet, wodurch er bestimmt wird, welche Gesetze ihn vervollständigen und welcher Interpreter ihn realisiert.
```

## Prüfpunkte für das Review {#review-checks}

*   Wird ein Unterschied im Fachbereich benannt, bevor seine kompakte Maschinenkodierung gewählt wird?
*   Ist ein assoziierter Typ ein vom Interpreter gewählter Träger und kein verschleierter konkreter Zustand?
*   Legen Gleichheits-Bounds nur die Kompatibilität fest, die am jeweiligen Verwendungsort erforderlich ist?
*   Haben unterschiedliche Compilerstufen eigene Typen und ausdrückliche Verträge?
*   Sind semantische Aussagen von Repräsentationsinvarianten getrennt?
*   Werden Aussagen, die Rust nicht ausdrücken kann, durch wiederverwendbare Gesetze oder Szenarien gestützt?
