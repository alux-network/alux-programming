<!-- reader: {"title":"Verzweigung und Konfluenz","sourceHash":"sha256:7b0ae3cd887e2ddebc21b9054fddd9eb54d1c7452218516c8a6c0da578ce05b1"} -->

# Verzweigung und Konfluenz {#branching-and-confluence}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotationen und Kompositionalität](../denotational-design/denotations.md), [Gesetze und Interpretationen](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Gesetze, Szenarien und Nachweise](../rust-dd/laws.md)  
Concepts: [Operationale Semantik](operational_semantics.md)
```

Verzweigung, Determinismus, Konfluenz, Spuräquivalenz und Bisimulation betreffen alle Alternativen in Berechnungen. Sie bezeichnen jedoch unterschiedliche Eigenschaften.

```admonish note title="Semantische Einordnung"
Verzweigung im Kontrollfluss ist eine operationale Struktur. Konfluenz ist eine Eigenschaft einer Reduktionsrelation. Spuräquivalenz und Bisimulation vergleichen Verhaltensweisen. Denotationelle Gleichheit vergleicht Bedeutungen in einem gewählten semantischen Bereich. Ein solider Entwurf nennt die benötigte Gleichheit, statt informell zwischen diesen Begriffen zu wechseln.
```

## Verhaltensäquivalenz {#behavioral-equivalence}

Nebenläufige und interaktive Programme haben selten nur ein Endergebnis. Ein üblicher Ausgangspunkt ist ein **markiertes Übergangssystem**:

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

Dabei ist $S$ eine Zustandsmenge, $A_{\tau}$ eine Menge beobachtbarer Aktionsmarkierungen einschließlich der internen Aktion $\tau$ und $\to\;\subseteq S \times A_{\tau} \times S$ die Übergangsrelation. Wir schreiben $p \xrightarrow{a} p'$, wenn Zustand $p$ die Aktion $a$ ausführen und in $p'$ übergehen kann.

Eine Verhaltensäquivalenz legt fest, welche Unterschiede zwischen solchen Systemen bewusst ausgeblendet werden:

*   **Beobachtungen in linearer Zeit** folgen abgeschlossenen oder partiellen Ausführungen und halten fest, was darin geschah
*   **Beobachtungen in Verzweigungszeit** halten zusätzlich fest, wo Alternativen verfügbar waren und wann Entscheidungen getroffen wurden

Zwei Systeme können also dieselben Spuren zulassen und sich dennoch in ihrer Verzweigungsstruktur unterscheiden. Das eine kann vor einer Interaktion zwischen zwei Aktionen wählen, das andere diese Wahl bis danach aufschieben. Die Aktionsfolgen stimmen überein, nicht aber die zukünftigen Möglichkeiten.

Van Glabbeeks [linear-time–branching-time spectrum](https://ir.cwi.nl/pub/5685/5685.pdf) bietet die etablierte systematische Darstellung dieser Verhaltensäquivalenzen. Es ist keine Rangfolge von schwach bis stark; jeder Punkt bewahrt eine andere Menge von Beobachtungen.

## Verzweigungen in Rust-Programmen {#branching-in-rust-programs}

Ein `if` wählt anhand einer Bedingung einen Zweig aus:

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

Ein `match` wählt anhand eines Werts einen Arm aus:

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

Bei festen Eingaben wählen diese Konstrukte in einer deterministischen Sprache einen vorhersehbaren Kontrollpfad aus. Diese Eigenschaft heißt **Determinismus**, nicht Konfluenz.

## Was Konfluenz bedeutet {#what-confluence-means}

Eine Reduktionsrelation ist konfluent, wenn sich zwei Reduktionen desselben Terms wieder zusammenführen lassen:

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

Formal gilt: Wenn

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

dann muss es ein `d` geben, sodass:

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

Konfluenz lässt mehrere Reduktionspfade zu. Sie besagt, dass diese Pfade insofern kompatibel sind, als sie einen gemeinsamen Nachfolger erreichen können.

## Determinismus und Konfluenz {#determinism-and-confluence}

Eine deterministische Reduktionsrelation hat von jedem Zustand aus höchstens einen Folgeschritt. Sie ist daher auf einfache Weise konfluent: Es gibt keine konkurrierenden Einzelschrittauswahlen, die zusammengeführt werden müssten.

Die Umkehrung gilt nicht. Ein System kann mehrere Reduktionsreihenfolgen zulassen und dennoch konfluent sein, wenn alle Reihenfolgen schließlich übereinstimmen.

Gewöhnliche Rust-Ausdrücke mit `if` und `match` veranschaulichen deterministische Auswahl. Den interessanten Gehalt von Konfluenz zeigen sie für sich genommen nicht.

## Church–Rosser {#churchrosser}

Der Satz von Church–Rosser formuliert eine Konfluenz-Eigenschaft für die Reduktion im Lambda-Kalkül. Reduziert sich ein Term über verschiedene Pfade zu zwei Ergebnissen, besitzen diese Ergebnisse einen gemeinsamen Redukt.

Existiert eine Normalform, folgt aus Konfluenz, dass sie eindeutig ist. Das ermöglicht Gleichungsrechnungen, da die Auswertungsreihenfolge die endgültige Normalform nicht verändert.

Verallgemeinere dieses Ergebnis nicht auf beliebige imperative Programme. Seiteneffekte, nichtdeterministische Ablaufplanung, Fehler und die Beobachtung von Zwischenzuständen können Reduktionsreihenfolgen unterscheidbar machen.

## Spuren {#traces}

Eine **Spur** zeichnet eine Folge beobachtbarer Aktionen oder Zustände auf. Spursemantik bewahrt bewusst mehr operative Informationen als eine Semantik, die nur das Ergebnis betrachtet.

Zwei reine Funktionen können dasselbe Ergebnis liefern und dabei unterschiedliche interne Schritte durchlaufen. Werden diese Schritte ausgeblendet, sind sie in einer Ergebnisdenotation gleich. In einer Spursemantik müssen sie nicht gleich sein.

Bei Effekten können unterschiedliche Prüfungsreihenfolgen die Beobachtungen verändern:

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

`is_admin` zuerst zu prüfen und danach `is_user` oder die umgekehrte Reihenfolge kann äquivalente Klassifikationen ergeben, aber unterschiedliche Spuren ausgeben.

Die Entwurfsfrage lautet, ob diese Ausgaben zum gewählten semantischen Bereich gehören.

## Spuräquivalenz {#trace-equivalence}

Zwei Systeme sind spuräquivalent, wenn sie unter dem gewählten Spurenmodell dieselben beobachtbaren Spuren zulassen.

Spuräquivalenz kann die Verzweigungsstruktur ausblenden. Zwei Systeme können dieselben Spuren erzeugen, obwohl sich das eine früher als das andere auf eine Auswahl festlegt. Bei interaktiven und nebenläufigen Systemen kann dieser Unterschied wichtig sein.

## Bisimulation {#bisimulation}

Bisimulation setzt zwei Übergangssysteme Schritt für Schritt zueinander in Beziehung. Führt das eine System einen beobachtbaren Schritt aus, muss das andere ihn nachbilden können; die resultierenden Zustände müssen weiterhin zueinander in Beziehung stehen.

Häufige Varianten sind:

*   **starke Bisimulation**, die einzelne Übergänge abgleicht
*   **schwache Bisimulation**, die ausgewählte interne Übergänge ausblendet
*   **Verzweigungsbisimulation**, die interne Arbeit ausblendet und zugleich wichtige Auswahlstrukturen bewahrt

Bisimulation ist häufig ein stärkerer Verhaltensvergleich als Spuräquivalenz, da sie beobachtet, wie Alternativen während einer Interaktion verfügbar bleiben.

<details>
<summary><strong>Ursprünge und formale Definitionen</strong></summary>

Milner entwickelte die beobachtungsbezogene Äquivalenz kommunizierender Prozesse in [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf). Park charakterisierte die zugehörige Äquivalenz anschließend koinduktiv in [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) und formulierte die größte Fixpunktrelation samt Beweismethode, die heute als Bisimulation bekannt ist. Milner übernahm und entwickelte diese Methode als Grundlage für Schlussfolgerungen über Prozessverhalten weiter.

**Starke Bisimulation.** Für markierte Übergangssysteme ist eine Relation $R$ eine starke Bisimulation, wenn $p\mathrel{R}q$ gilt und für jede Aktion $a$ Folgendes zutrifft:

*   Falls $p\xrightarrow{a}p'$ gilt, gibt es ein $q'$, für das $q\xrightarrow{a}q'$ und $p'\mathrel{R}q'$ gelten; und
*   falls $q\xrightarrow{a}q'$ gilt, gibt es ein $p'$, für das $p\xrightarrow{a}p'$ und $p'\mathrel{R}q'$ gelten.

Zwei Zustände sind bisimilar, wenn sie durch eine Bisimulation in Beziehung gesetzt werden. Die Definition ist koinduktiv: Nach dem Abgleich eines Übergangs müssen die Nachfolgezustände dieselbe Verhaltensverpflichtung erneut erfüllen.

**Verzweigungsbisimulation.** In einer gängigen Formulierung, die Divergenz außer Acht lässt, ist eine symmetrische Relation $R$ eine Verzweigungsbisimulation, wenn $p\mathrel{R}q$ und $p\xrightarrow{a}p'$ eine der folgenden Möglichkeiten implizieren:

*   $a = \tau$ und $p'\mathrel{R}q$, oder
    
*   es gibt Zustände $q_0$ und $q'$ mit folgenden Eigenschaften:
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

Hier bezeichnet $\xRightarrow{\tau}$ null oder mehr interne Übergänge. Die Forderung, dass der Zwischenzustand $q_0$ weiterhin mit $p$ in Beziehung steht, bewahrt das relevante Verzweigungspotenzial, während interne Arbeit ausgeblendet werden darf. Van Glabbeek und Weijland führten diese Äquivalenz in [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf) ein und entwickelten sie weiter.

</details>

## Denotationelle Gleichheit {#denotational-equality}

Denotationelle Gleichheit hängt vom gewählten semantischen Bereich ab:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

Der Bereich kann selbst aus Spuren, Übergangssystemen modulo Bisimulation, Ergebnismengen oder einem anderen mathematischen Modell bestehen. Denotational Design schreibt keine universelle Gleichheit vor. Es verlangt, dass die Gleichheit ausdrücklich gewählt und kompositional verwendet wird.

Der Zusammenhang lautet:

1.  Mit dem operationalen System beginnen.
2.  Die relevanten Beobachtungen auswählen.
3.  Den semantischen Bereich und die Gleichheit wählen.

## Verzweigung als Daten {#branching-as-data}

Verzweigung tritt auch strukturell in Bäumen auf. Ein binärer Pfad lässt sich als Folge von Links-/Rechtsentscheidungen darstellen. Diese Repräsentation ist nützlich für Tries, Ausführungskennungen, Entscheidungsdiagramme und Speicheradressierung.

Das semantische Beispiel zu Verzweigungspositionen in [Warum Bedeutung an erster Stelle steht](../denotational-design/semantic-view.md) trennt diese Baumbedeutung bewusst von einer Bitvektorkodierung.

Conal Elliott hat die Speicheradressierung anhand der Struktur perfekter binärer Blätterbäume beschrieben. Es geht nicht darum, dass jede Maschine tatsächlich einen Quelltextbaum speichert. Vielmehr kann ein kompositionales Baummodell nützliche Strukturen sichtbar machen, die durch flache numerische Adressen verborgen bleiben.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott — Speicheradressierung als perfekter binärer Blätterbaum</figcaption></figure>

## Vergleich {#comparison}

| Konzept | Gegenstand | Zentrale Frage |
| --- | --- | --- |
| Verzweigung im Kontrollfluss | Eine Programmausführung | Welche Fortsetzung wird ausgewählt? |
| Determinismus | Übergangsrelation | Ist der nächste Schritt eindeutig bestimmt? |
| Konfluenz | Reduktionsrelation | Lassen sich auseinanderlaufende Reduktionen zusammenführen? |
| Spuräquivalenz | Beobachtbare Aktionsfolgen | Lassen die Systeme dieselben Spuren zu? |
| Bisimulation | Verzweigte Übergangsstruktur | Können die Systeme die Züge des jeweils anderen nachbilden? |
| Denotationelle Gleichheit | Gewählter semantischer Bereich | Haben die Programme dieselbe spezifizierte Bedeutung? |

Diese Begriffe können einander stützen, doch keiner sollte als Synonym für einen anderen verwendet werden.

## Weiterführende Lektüre {#further-reading}

*   [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf) — Milners grundlegende Ausarbeitung von CCS und beobachtungsbezogener Äquivalenz
*   [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) — Parks koinduktive Charakterisierung der Bisimulation
*   [*Algebraic Laws for Nondeterminism and Concurrency*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf) — Hennessy und Milner zu beobachtungsbezogener Kongruenz und algebraischen Gesetzen
*   [*What Is Branching Time and Why Use It?*](https://theory.stanford.edu/~rvg/branching/) ([komprimiertes PDF](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)) — eine knappe Begründung für die Bewahrung der Verzweigungsstruktur
*   [*The Linear Time–Branching Time Spectrum*](https://ir.cwi.nl/pub/5685/5685.pdf) — die etablierte Taxonomie der Verhaltensäquivalenzen
*   [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf) — die grundlegende Abhandlung zur Verzweigungsbisimulation
*   [*Three Logics for Branching Bisimulation*](https://ir.cwi.nl/pub/1370/1370D.pdf) — logische Charakterisierungen anhand Logiken im Stil von Hennessy–Milner und CTL\* ohne Next-Time-Operator
