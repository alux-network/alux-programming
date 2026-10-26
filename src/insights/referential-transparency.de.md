<!-- reader: {"title":"Referenzielle Transparenz neu betrachtet"} -->

# Referenzielle Transparenz neu betrachtet {#referential-transparency-reloaded}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotationen und Kompositionalität](../denotational-design/denotations.md), [Gesetze und Interpretationen](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md), [Abgeleitete Bedeutung und Komposition](../rust-dd/derived-meaning.md)  
Concepts: [Referenzielle Transparenz](../concepts/referential_transparency.md)
```

Diese Seite stellt die Interpretation von *referenzieller Transparenz* im Denotational Design vor. Die Konzeptseite behandelt Geschichte und gebräuchliche Verwendung in Programmiersprachen. Hier geht es darum, was RT als Entwurfsbedingung bedeutet.

Im DD ist RT keine Bezeichnung für Reinheit. Sie ist ein Gesetz über Denotationen: Substitution muss die spezifizierte Bedeutung bewahren.

## RT im Denotational Design neu formuliert {#denotational-design-restatement-of-rt}

Denotational Design formuliert RT als Anforderung an Spezifikationen statt an den Implementierungsstil. Zuerst muss die Spezifikation kompositionale Bedeutung festlegen; die Ausführungsstrategie wird später gewählt.

RT wird also an der semantischen Grenze geprüft:

*   dieselben Eingaben
*   derselbe deklarierte Kontext
*   dieselbe Denotation

Sind diese Bedingungen erfüllt, ist Substitution gültig und Schlussfolgern mit Gleichungen möglich. Das gilt auch dann, wenn konkrete Interpreter Ein-/Ausgabe, Nebenläufigkeit, Wiederholungsversuche oder Zustandsübergänge ausführen, denn diese Details sind hinter den spezifizierten Capabilities verborgen.

Anders gesagt: DD fragt nicht: „Ist diese Implementierung rein?“ DD fragt: „Sind die denotationellen Gleichheiten explizit, und bewahren die Interpreter sie?“

## Reinheit und RT {#purity-and-rt}

RT und Reinheit hängen zusammen, sind aber nicht identisch.

*   **RT** ist ein Substitutionsgesetz über Bedeutung.
*   **Reinheit** ist eine operationale Einschränkung: keine verborgenen beobachtbaren Effekte.

Reinheit ist ein gängiger Weg, RT für Code auf Ausdrucksebene zu erreichen. RT bleibt jedoch das semantische Kriterium: Die Substitution muss die spezifizierte Denotation bewahren.

DD macht RT daher nicht zu einer Stilvorschrift wie „nur reinen Code verwenden“. Gefordert sind explizite semantische Gleichheiten; Effekte werden hinter Capability-Grenzen isoliert.

Eine minimale semantische Lesart lautet:

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

Wenn `a` und die Eingabe `io` gleich sind, liefert `f` dasselbe `(result, io')`. Dies ist die kontextindizierte Form des Substitutionsschlusses im Stil des DD.

## Warum dies RT verdeutlicht {#why-this-clarifies-rt}

Viele RT-Debatten verwischen eine nützliche Unterscheidung:

*   semantische Transparenz
*   operationale Seiteneffekte

DD trennt diese Ebenen:

*   Der semantische Kern legt die Bedeutung fest
*   Interpreter realisieren die Ausführungsstrategie

Diese Trennung ermöglicht praktische Effekte, ohne Schlussfolgern anhand von Gesetzen aufzugeben.

## Fehlerbild bei repräsentationsorientiertem Entwurf {#representation-first-failure-mode}

Legt man sich früh auf eine konkrete Repräsentation fest, verlagert sich die RT-Diskussion häufig auf Stilfragen:

*   „Dieser Stil ist rein.“
*   „Jener Stil ist unrein.“
*   „IO-Wrapper lösen das Problem.“

Dabei geht es meist um Kodierungen. DD stellt eine einfachere Frage: Welche Gleichheiten gelten in deiner Spezifikation?

## Praktisches DD-Muster {#practical-dd-pattern}

Kleine Capability-Traits definieren und Programmverhalten als Erweiterungen darüber formulieren. Anschließend schlanke konkrete Interpreter bereitstellen.

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]` ist ein Makro aus dem [`extend`Crate](https://docs.rs/extend/latest/extend/), das Boilerplate reduziert, indem es Erweiterungsmethoden aus einem `impl`\-Block generiert. Es ist keine neue Sprachfunktion von Rust.

In der funktionalen Scala-Praxis wird RT oft über Werte des Typs `F[A]` dargestellt (zum Beispiel `IO[A]` oder `F[Either[E, A]]`). Hier wird RT eine Ebene höher ausgedrückt: als durch Capabilities begrenzte Programmbedeutung. Diese Rust-Methode ist also kein RT-Wertcontainer in derselben Kodierungsform wie `F[A]`; sie beschreibt RT-Verhalten über explizite Capabilities und delegiert konkrete Effekte an Implementierungen.

Die Erweiterung formuliert semantisches Verhalten über Capabilities. Konkrete Implementierungen bestimmen die Ausführungsstrategie: Batchverarbeitung, Wiederholungen, Transport, Parallelität und Speicherdetails.

## Abschließende Erkenntnis {#final-insight}

Im Denotational Design ist RT eine Eigenschaft semantischer Spezifikationen. Implementierungsentscheidungen sind nachgeordnet, solange sie die formulierten denotationellen Gesetze bewahren.

Bewahre das Gesetz. Verliere dich nicht in der Bezeichnung.
