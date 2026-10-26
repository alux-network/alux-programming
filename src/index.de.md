<!-- reader: {"title":"ALUX-Programmierung","parts":{"Welcome":"Willkommen","The Semantic View":"The Semantic View","Design by Meaning in Rust":"Design by Meaning in Rust","Concepts":"Concepts","Insights":"Insights","Contributing":"Mitwirken"}} -->

```admonish warning title="ALUX-Projekt"
Die ALUX-Codebasis befindet sich in aktiver Entwicklung und ist noch nicht öffentlich verfügbar.
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; width: 60px;">Programmierrichtlinien für ALUX {#alux-programming-guidelines}

```admonish note title="Hinweis"
Dieses Buch vermittelt die Grundlagen, die nötig sind, um die bedeutungsorientierte Codebasis von ALUX zu verstehen und daran mitzuwirken. Es beginnt mit einem zentralen Prinzip des [Denotational Design](denotational-design/design.md): zuerst festzulegen, was Programme bedeuten, und erst danach zu entscheiden, wie sie funktionieren.

In Anlehnung an Conal Elliott behandelt es Berechnung als klaren mathematischen Gegenstand statt als undurchsichtige Folge von Schritten.

Spezifikationen werden in einfachen, zusammensetzbaren [Capability-Traits](rust-dd/capability-algebras.md) formuliert, die beschreiben, *was* ein Programm bedeutet. [Interpreter](rust-dd/interpreters.md) bieten austauschbare Wege, diese Bedeutungen *zu realisieren*.

Das Ergebnis ist Software, deren Kompositionsregeln, Implementierungspflichten und [gültige Gleichungen](denotational-design/laws-and-interpretations.md) leichter zu erkennen und zu testen sind.
```

```admonish quote title="Mechanik und Bedeutung"
[Concepts](concepts/index.md) und [Insights](insights/index.md) erklären nützliche Programmiermechanismen. [Denotational Design](denotational-design/design.md) erklärt, wie man entscheidet, was diese Mechanismen bewahren sollen.
```

## So liest du dieses Buch {#how-to-read-this-book}

Lies das Buch auf drei Ebenen:

*   [**The Semantic View**](denotational-design/semantic-view.md) führt [Denotationen und Kompositionalität](denotational-design/denotations.md), [Gesetze und Interpretationen](denotational-design/laws-and-interpretations.md) sowie den Zusammenhang zwischen Bedeutung und Repräsentation ein.
*   [**Design by Meaning in Rust**](rust-dd/capability-algebras.md) überträgt diese Sicht auf [kleine Capabilities](rust-dd/capability-algebras.md), [abgeleitete Erweiterungen](rust-dd/derived-meaning.md), [Programme erster Ordnung](rust-dd/first-order-programs.md) und [schlanke Interpreter](rust-dd/interpreters.md).
*   [**Concepts**](concepts/index.md) und [**Insights**](insights/index.md) erklären wichtige Ausführungsmodelle, Kodierungen, Transformationen und Zusammenhänge.

Die semantischen Prinzipien sind sprachunabhängig. Rust ist die primäre Implementierungssprache, und eine [Pipeline für nebenläufige Sprachen](rust-dd/compiler-pipelines.md) verbindet diese Prinzipien mit Tolang.

## Für wen ist dieses Buch gedacht? {#who-this-book-is-for}

*   Programmierer, denen daran liegt, dass komplexe Software sich bei ihrer Weiterentwicklung **modular, komponierbar, testbar und wartbar** bleibt.
*   Entwickler, die **Kategorientheorie, Typsysteme und Programmentwurf miteinander verbinden** möchten.
*   Leser, die mit Repräsentations- und Ausführungstechniken wie [**freien Monaden**](concepts/free_monad.md), [**Continuation-Passing Style (CPS)**](concepts/cps.md) und [**Defunktionalisierung**](concepts/defunctionalization.md) vertraut sind und verstehen möchten, wie diese Mechanismen einem bedeutungsorientierten Entwurf dienen, statt ihn zu definieren.
*   Leser, die mit [**abhängigen Typen**](denotational-design/dependent-types.md) und beweisorientierter Programmierung vertraut sind und dieses Denkmodell beim Schreiben von leistungsstarkem Rust anwenden möchten.
*   Mitwirkende, die [bedeutungsorientierte Rust-Spezifikationen](rust-dd/capability-algebras.md) lesen und verstehen müssen, wie [eine nebenläufige Sprache kompiliert werden kann](rust-dd/compiler-pipelines.md), ohne ihren Compiler zur Definition der Sprache zu machen.
