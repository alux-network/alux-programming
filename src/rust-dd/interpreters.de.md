<!-- reader: {"title":"Interpreter und Effekte","sourceHash":"sha256:4ca52b24121e8361c8cc8983e3807794110bade03c63105c1609e60eb9554b93"} -->

# Interpreter und Effekte {#interpreters-and-effects}

```admonish tip title="Verwandte Themen"
The Semantic View: [Gesetze und Interpretationen](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability-Algebren](capability-algebras.md), [Gesetze, Szenarien und Nachweise](laws.md)  
Concepts: [Freie Monade](../concepts/free_monad.md)  
Insights: [EVM-Algebra](../insights/evm-alg.md)
```

```admonish note title="Orientierung"
Ein Interpreter wählt eine Repräsentation oder einen Effekt für eine Capability. Er realisiert die primitiven Operationen, ohne das darüber abgeleitete Verhalten des Fachbereichs neu zu definieren, sodass dieselben Gesetze für alle Interpreter gelten.
```

Ein Interpreter realisiert eine semantische Capability mit einer konkreten Repräsentation oder einem Effekt. Er sollte die Mechanismen auswählen, ohne das Verhalten im Fachbereich neu zu definieren.

## Ein schlanker Interpreter {#a-thin-interpreter}

Eine Bitpfad-Repräsentation für Verzweigungen könnte so aussehen:

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

Die Implementierung speichert und beobachtet primitive Fakten. `branch_left`, `branch_right` und `branch_is_ancestor` bleiben in der gemeinsamen Erweiterung.

## Interpreter gelten relativ zur Grenze {#interpreters-are-boundary-relative}

Derselbe Typ kann an einer Grenze Interpreter und an einer anderen semantische Eingabe sein.

| Grenze | Verbraucht | Interpretiert |
| --- | --- | --- |
| Dateisystemadapter | Dateisystemzugriff | Quelltextsuche |
| Umgebung des Normalisierers | Quelltextsuche als primitive Capability | Konstruktion der normalisierten Sprache |
| Compiler-Pipeline | Normalisierte Terme | Konstruktion des ausführbaren Programms |

Es gibt keine einzige universelle „Implementierungsebene“. Semantische Grenzen sind ineinander verschachtelt.

## Effekte am Rand {#effects-at-the-edge}

Konkrete Interpreter treffen Entscheidungen über Dinge wie:

*   Datenbanklayout
*   asynchrone Laufzeitumgebung
*   Besitzverhältnisse von Tasks
*   Wiederholungsstrategie
*   Typen des HTTP- oder RPC-Frameworks
*   Serialisierung
*   Sperren und Kanäle
*   Zwischenspeicherung

Halte diese Entscheidungen aus semantischen Traits heraus, sofern Aufrufer sie nicht beobachten müssen.

Eine semantische Quell-Capability kann beispielsweise einen Quellwert und einen Fehler zurückgeben. Ihr Produktionsinterpreter kann Dateien zwischenspeichern und asynchrone Lesezugriffe ausführen. Ein Testinterpreter kann eine unveränderliche Map verwenden. Abgeleitete Normalisierungslogik sollte mit beiden funktionieren.

## Zuständigkeit der Laufzeitumgebung {#runtime-ownership}

Framework-Callbacks benötigen oft eigenen, klonbaren und threadsicheren Zustand. Das ist eine Einschränkung des Interpreters, nicht zwingend des Fachbereichs.

````admonish warning title="Framework-Träger aus primitiven Operationen heraushalten"
Vermeide Framework-Träger als Einschränkung einer primitiven Operation:

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

Semantische Anwendung bevorzugen:

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

Der Web-Interpreter kann `Arc<Context>` auswählen, Eingaben aus der Anfrage entnehmen, `status` aufrufen und das Ergebnis umwandeln. Nutzer des Fachbereichs müssen nichts von einem Webserver wissen.

## Neutrale Interpreter {#neutral-interpreters}

Nicht jeder Interpreter muss Effekte ausführen.

Ein Text-Interpreter für ein API-Programm kann Folgendes festhalten:

| Methode | Pfad | Eingabe | Ausgabe |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

Ein Metadaten-Interpreter kann Dokumentation erstellen. Ein Testinterpreter kann Operationsnamen sammeln. Ein Produktionsinterpreter kann Serverrouten aufbauen.

Neutrale Interpreter zeigen, dass das Programm unabhängig von einer einzelnen Laufzeit Bedeutung trägt.

## Interpreter durch Delegation zusammensetzen {#composing-interpreters-by-delegation}

Da die Bedeutung in kleinen Capability-Traits liegt, wird ein Interpreter normalerweise *zusammengesetzt* statt vollständig ausgeschrieben. Ein Träger erhält eine Capability, indem er an einen bereits verfügbaren Anbieter delegiert. Die Weiterleitung wird also generiert und nicht von Hand geschrieben. Fast alle Fälle decken zwei Formen ab.

**Eine Capability an ein Feld weiterleiten.** Das `#[derive(Delegate)]` von ambassador leitet ein ganzes Trait an einen inneren Wert weiter. Ein Träger mit mehreren Komponenten delegiert jede Capability an das Feld, dem sie gehört, ganz ohne eigens geschriebene Weiterleitungsmethoden:

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

**Eine Capability über einen Getter bereitstellen.** Gib einem Typ einen Getter, und eine pauschale Implementierung stellt allen Typen mit diesem Getter die gesamte Capability bereit:

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

Dadurch müssen viele Strukturen gar nicht erst existieren. Ein monolithisches Kontextobjekt — ein großes Trait mit mehreren assoziierten Typen und einem Dutzend Methoden samt seiner einzigen konkreten Implementierung — wird durch eine Handvoll kleiner Capability-Traits und einen schlanken Träger ersetzt, der jede Capability an das zuständige Feld oder den Getter weiterleitet. Abgeleitete Operationen, etwa die Prüfung, ob eine Frist abgelaufen ist, werden einmal als Erweiterungen der primitiven Operationen formuliert, statt für jeden Träger neu implementiert zu werden.

```admonish warning title="Delegation leitet Operationen, nicht Bedeutung weiter"
Generierte Delegation erspart Boilerplate, begründet aber keine semantische Ersetzbarkeit. Ein `derive`\-Makro wie `#[derive(Delegate)]` von ambassador beweist, dass die Implementierungen kompilieren, nicht dass der Träger denselben Interpreter bezeichnet. Soll `Shared<T>(Arc<T>)` für `T` stehen, prüfe die Gesetze für den Träger: Ein Wrapper, der Teilen oder Identität verändert (`Arc`, Pooling, Caching), kann jede Methode korrekt weiterleiten und trotzdem ein Frische- oder Eindeutigkeitsgesetz verletzen. Enthält der Träger lediglich `T` neben unabhängigen Diensten, ist Projektion ehrlicher als Delegation.
```

## Fehler gehören zu einer Grenze {#errors-belong-to-a-boundary}

Fehler sollten die Bedeutung des Scheiterns an der Grenze vermitteln, an der es behandelt wird.

| Fehler | Übersetzung an der Grenze |
| --- | --- |
| Fachlicher Fehler | Der Transport-Interpreter bildet ihn auf eine Protokollantwort ab |
| Parserfehler | Das Compiler-Frontend bildet ihn auf eine Diagnose ab |
| Speicherfehler | Der Quellinterpreter bildet ihn auf einen semantischen Quellfehler ab |

Zwinge keine HTTP-Statuscodes, RPC-Fehlerobjekte oder Datenbankfehler in primitive Traits des Fachbereichs. Übersetze sie an den Interpretergrenzen.

## Leistung ist Sache der Interpretation, solange sie nicht beobachtet wird {#performance-is-an-interpretation-concern-until-observed}

Batchverarbeitung, Parallelität, Zwischenspeicherung und Datenlayout gehören normalerweise zu den Interpretern. Sie werden erst dann semantisch, wenn die Spezifikation beobachtbare Reihenfolge, Timing, Ressourcenverbrauch, Fairness oder Fehlerverhalten garantiert.

Diese Trennung ermöglicht Optimierungen ohne semantische Abweichung:

*   Dieselben Gesetze
*   Dieselben deklarierten Beobachtungen
*   Andere operationale Strategie

## Prüfpunkte für das Review {#review-checks}

*   Implementiert der Interpreter primitive Operationen, statt Ableitungen zu duplizieren?
*   Sind Einschränkungen durch Laufzeit und Framework auf die verwendende Grenze beschränkt?
*   Könnte ein neutraler oder Testinterpreter dieselbe Capability implementieren?
*   Werden Transport- und Speicherfehler am Rand übersetzt?
*   Ist die Delegation semantisch zutreffend?
*   Sind Leistungsunterschiede unter der angegebenen Denotation unbeobachtbar?
