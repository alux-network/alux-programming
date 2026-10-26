<!-- reader: {"title":"Programme erster Ordnung"} -->

# Programme erster Ordnung {#first-order-programs}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Abgeleitete Bedeutung und Komposition](derived-meaning.md), [Sprach- und Compiler-Pipelines](compiler-pipelines.md)  
Concepts: [Continuation-Passing Style](../concepts/cps.md), [Defunktionalisierung](../concepts/defunctionalization.md), [Freie Monade](../concepts/free_monad.md)  
Insights: [Expression Problem reloaded](../insights/expression-problem.md)
```

```admonish note title="Wann Anwendung reifizieren?"
Gewöhnliche Funktionen und Erweiterungen drücken abgeleitetes Verhalten bereits aus. Wandle eine Anwendung nur dann in Daten erster Ordnung um, wenn ein anderer Interpreter ein Programm vor der Ausführung untersuchen, zusammensetzen, serialisieren oder kompilieren muss.
```

Gewöhnliche Funktionen und Erweiterungsmethoden sind normalerweise die beste Art, abgeleitetes Verhalten auszudrücken. Manchmal muss ein anderer Interpreter die Struktur eines Programms vor seiner Anwendung untersuchen, kombinieren, dokumentieren, serialisieren oder kompilieren. Dann muss die Anwendung selbst zu Daten erster Ordnung werden.

## Ausführung löscht Struktur {#execution-erases-structure}

Betrachte Folgendes:

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

Der Aufruf dieser Methode liefert einen Status. Sobald der Aufruf beginnt, kann ein externer Interpreter im Allgemeinen Folgendes nicht mehr ermitteln:

*   den Typ des semantischen Kontexts
*   die Reihenfolge der Argumente
*   die Namen der Quellargumente
*   den Ergebnistyp
*   die Identität der Operation

Diese Informationen waren im Funktionstyp auf Quelltextebene vorhanden, werden bei der gewöhnlichen Ausführung jedoch verbraucht.

## Anwendung defunktionalisieren {#defunctionalizing-application}

Defunktionalisierung ersetzt ein Element aus einer bekannten Familie von Funktionen durch ein Tag erster Ordnung und eine gemeinsame Anwendungsoperation.

Ein minimales Operationsvokabular lautet:

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

Ein größenloses `CurrentStatusOperation<App>` kann die Anwendung der ursprünglichen Erweiterungsmethode bezeichnen. Es sollte diese Methode aufrufen, statt ihren Rumpf zu duplizieren.

1.  Mit der Erweiterungsmethode beginnen.
2.  Sie als Operationstyp reifizieren.
3.  Kontext, Argumentprodukt, Argumentnamen und Ausgabe bewahren.
4.  Sie über `ApplyAlg` interpretieren.

Für normale Aufrufe bleibt die Methode ergonomisch. Der Operationswert existiert für Kontexte, die eine Struktur erster Ordnung benötigen.

## Nur für konkrete Nutzer reifizieren {#do-not-reify-without-a-consumer}

Programme erster Ordnung bringen zusätzlichen Typmechanismus mit sich. Verwende sie nur, wenn sie eine echte zweite Interpretation ermöglichen:

*   Registrierung zur Laufzeit
*   Generierung von Dokumentation oder Schemata
*   statische Inspektion
*   Komposition des Programms vor der Ausführung
*   Serialisierung
*   Kompilierung

Muss der Code nur eine Funktion aufrufen, lass sie eine Funktion bleiben.

## Portable Schnittstellenprogramme {#portable-interface-programs}

Angenommen, eine HTTP-Oberfläche enthält:

| Methode | Pfad | Eingabe | Operation | Ausgabe |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | Textkörper: `f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | Gestreamte Datei |

Ein portables Programm muss Folgendes bewahren:

*   Auswahl von Methode und Pfad
*   Eingaberollen wie Pfad, Abfrage, Textkörper, Header und Authentifizierung
*   den Operationswert
*   eine Ausgaberolle wie JSON oder Datei
*   Zusammenführen und Verschachteln von Routen

Es sollte keinen bestimmten Framework-Anfrage-, Router- oder Antworttyp bewahren.

Eine flüssige Notation könnte so aussehen:

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

Die flüssigen Aufrufe konstruieren ein typisiertes Programm. Sie müssen nicht sofort eine Serverroute registrieren.

## Ein Programm, mehrere Faltungen {#one-program-several-folds}

Dasselbe Programm erster Ordnung kann mehrere Interpretationen unterstützen:

| Programm | Interpretationen |
| --- | --- |
| Typisiertes HTTP-Programm | Textdokumentation, ausführbare Routen, OpenAPI-Metadaten, Client-Bindings, Konformitätstests |
| Typisiertes JSON-RPC-Programm | Methodenregister, Schema, Client, Test-Harness |

Pflege getrennte Routen- oder Methodenlisten für Ausführung und Dokumentation nicht parallel. Dadurch entstehen konkurrierende Spezifikationen.

## Eingabe- und Ausgaberollen {#input-and-output-roles}

Die Operation kennt ihre Argument- und Ergebnistypen bereits. Eine Transportdeklaration sollte lediglich Transportbedeutung hinzufügen.

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`, `query` und `json` kennzeichnen Rollen. Sie sollten den Autor nicht dazu zwingen, einen bereits von `ApplyAlg` bestimmten Ausgabetyp erneut anzugeben.

Die Ausgabekonvertierung gehört zum Transport-Interpreter. Ein Server kann ein Ergebnis in JSON und ein anderes als gestreamten Anhang ausgeben. Die semantischen Operationen kennen keine der beiden Repräsentationen.

## Komposition ist Programmbedeutung {#composition-is-program-meaning}

Programme sollten allgemeine Komposition bewahren:

*   Leeres Programm
*   Programme zusammenführen
*   Ein Programm unter einem Präfix verschachteln
*   Einen Endpunkt in ein Programm überführen

Diese Operationen sind grundlegender als die Router-Methoden eines einzelnen Frameworks. Vertraute Fluent-Namen wie `get`, `post`, `merge` und `nest` können Aliase für die neutrale Algebra sein.

Unabhängige Spezifikationen können kleine Programme bereitstellen:

| Eingabeprogramme | Komposition | Ergebnis |
| --- | --- | --- |
| Status- und Downloadprogramme | Zusammenführen | Dienstprogramm |
| Katalogprogramm | Verschachteln | Dienstprogramm |

Eine Anwendung wählt die resultierende Komposition aus und interpretiert sie.

## Makros müssen auf öffentliche Bedeutung abbilden {#macros-must-lower-to-public-meaning}

Rust-Makros können Deklarationen erster Ordnung angenehm lesbar machen:

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

Ein Makro ist nur dann sinnvoll, wenn es auf ein öffentliches, von Hand konstruierbares Programm erster Ordnung abbildet. Generierte Callbacks dürfen nicht zur alleinigen Definition der Schnittstelle werden.

Gute Richtung:

1.  Bequeme Syntax
2.  Öffentliche Operations- und Programmwerte
3.  Generische Faltung
4.  Konkretes Framework

Repräsentationsorientierte Richtung:

1.  Framework-Annotation
2.  Undurchsichtige generierte Callbacks
3.  Nachträglich rekonstruierte Dokumentation

## Beziehung zu bestehenden Konzepten {#relation-to-existing-concepts}

Programme erster Ordnung für Schnittstellen bauen auf Techniken anderer Kapitel auf: Defunktionalisierung ist die allgemeine Transformation, erweiterbare Syntax und Interpretationen behandeln das Expression Problem, und eine freie Monade ist eine spezielle Repräsentation aus Syntax und Sequenzierung. Die Links unter „Verwandte Themen“ oben auf der Seite führen zu den jeweiligen Kapiteln.

Setze diese Techniken nicht mit DD selbst gleich. DD bestimmt, welche Struktur wichtig ist; Repräsentationen erster Ordnung bewahren diese Struktur, wenn gewöhnliche Aufrufe sie auslöschen würden.

## Prüfpunkte für das Review {#review-checks}

*   Ist die Reifizierung durch einen echten zweiten Interpreter erforderlich?
*   Ruft die Operation die verfasste Methode auf, statt sie zu duplizieren?
*   Werden Argumente und Ausgabe aus der Operation abgeleitet?
*   Fügt die Transportsyntax nur Transportrollen hinzu?
*   Lässt sich das Programm ohne sein Komfortmakro konstruieren?
*   Interpretieren Laufzeit und Metadaten dasselbe Programm?
