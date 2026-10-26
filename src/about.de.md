<!-- reader: {"title":"Über das Buch"} -->

# Über {#about}

Dieses Buch verdichtet eine von Conal Elliotts **Denotational Design** inspirierte Denkweise über Software. Die Grundidee ist einfach und zugleich tiefgreifend:

```admonish note title="Denotational Design"
*Lege die Bedeutung eines Programms fest, bevor du entscheidest, wie es ausgeführt wird.*
```

Aus dieser Sicht ist Berechnung keine undurchsichtige Abfolge von Schritten, sondern ein transparentes mathematisches Objekt. Wir beginnen mit **Spezifikationen** als reinen, kompositionalen Beschreibungen dessen, *was* ein Programm bedeutet. Sie werden als algebraische Strukturen ausgedrückt, oft in Form von Traits oder Typsignaturen. Die **Implementierung** beschreibt getrennt und austauschbar, *wie* diese Bedeutungen realisiert werden.

Wenn wir Bedeutung von Mechanik trennen, gewinnen wir:

*   **Klarheit** — Programme lesen sich wie präzise Definitionen.
*   **Komponierbarkeit** — Teile fügen sich algebraisch zusammen.
*   **Refaktorisierbarkeit** — Die Bedeutung bleibt fest, während sich die Implementierung weiterentwickelt.
*   **Korrektheit** — Über Programme lässt sich mit Gleichungen statt anhand operationaler Abläufe schlussfolgern.

Diese Richtlinien sollen praktische Techniken vermitteln, um diesen Stil in modernen Programmiersprachen — insbesondere Rust — anzuwenden, ohne Eleganz und Strenge seiner mathematischen Wurzeln einzubüßen.

Das Buch unterscheidet bewusst drei Ebenen:

*   **Bedeutung** legt fest, welche Werte, Relationen und Transformationen entworfen werden.
*   **Repräsentation** wählt, wie diese Bedeutungen in Typen und Daten kodiert werden.
*   **Ausführung** legt fest, wie eine Repräsentation auf einer Maschine läuft.

ALUX und Tolang liefern die Motivation für viele Beispiele, sind aber nicht erforderlich, um dieser Ausgabe zu folgen. Das Buch führt zunächst das Vokabular ein.

## Dokumentation zu mdBook {#reference-of-mdbook}

[mdBook-Dokumentation](https://rust-lang.github.io/mdBook/index.html)

## Referenz zum **admonish**\-mdbook-Plugin (Hinweisfelder) {#reference-of-admonish-mdbook-plugin-tooltip-boxes}

[admonish-Dokumentation](https://tommilligan.github.io/mdbook-admonish/)
