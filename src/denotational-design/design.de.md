<!-- reader: {"title":"Denotational Design"} -->

# Denotational Design {#denotational-design}

```admonish tip title="Verwandte Themen"
The Semantic View: [Denotationen und Kompositionalität](denotations.md), [Gesetze und Interpretationen](laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability-Algebren](../rust-dd/capability-algebras.md), [Abgeleitete Bedeutung und Komposition](../rust-dd/derived-meaning.md)
```

```admonish note title="Grundidee"
Denotational Design leitet eine Programmierschnittstelle aus einfachen, kompositionalen und implementierungsunabhängigen Bedeutungen ab. So leitet die Semantik den Entwurf, statt eine bereits entworfene Schnittstelle nachträglich zu beschreiben.
```

Denotational Design ist die Praxis, eine Programmierschnittstelle aus einfachen, kompositionalen und implementierungsunabhängigen Bedeutungen abzuleiten.

Die Methode wurde von [Conal Elliott](http://conal.net/) entwickelt und benannt. Ihr zentraler Schritt besteht nicht nur darin, einer bestehenden Sprache oder API eine Semantik zuzuweisen. Vielmehr lässt man die Semantik den Entwurf der API selbst leiten.

## Der Entwurfszyklus {#the-design-loop}

Gehe in dieser Reihenfolge vor:

1.  Den semantischen Bereich wählen.
2.  Die relevante Struktur in diesem Bereich bestimmen.
3.  Ein kleines Vokabular primitiver Operationen wählen.
4.  Nützliche Operationen kompositional ableiten.
5.  Die Gesetze formulieren, denen diese Operationen folgen.
6.  Eine oder mehrere Repräsentationen auswählen.
7.  Interpretationen implementieren, die die Struktur bewahren.
8.  Sie anhand von Gesetzen, Modellen und Szenarien validieren.

Ein repräsentationsorientierter Entwurf beginnt häufig bei Schritt 6 und versucht anschließend, die Schritte 1 bis 5 nachträglich zu rekonstruieren.

## Eine Verzweigungsalgebra entwerfen {#designing-a-branch-algebra}

Kehren wir zu Verzweigungspositionen zurück. Die gewünschte Bedeutung ist ein endlicher Pfad in einer binären Verzweigungsstruktur.

Eine mögliche primitive Algebra lautet:

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

Der partielle Pfeil $\rightharpoonup$ bedeutet, dass die Pfadbeobachtung nur existiert, wenn der erste Zweig ein Vorfahr des zweiten ist.

Daraus ergeben sich nützliche Operationen:

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

Diese Algebra erwähnt weder Vektoren noch Ganzzahlen, Brüche, Datenbankschlüssel oder Bytes. Diese Entscheidungen folgen später.

## Struktur vor Bequemlichkeit {#structure-before-convenience}

Das primitive Vokabular sollte die Struktur sichtbar machen, von der nachgelagerter Code abhängt. Es sollte keine Sammlung aller praktischen Methoden einer einzelnen Implementierung sein.

````admonish warning title="Repräsentationsorientierte Primitive ablehnen"
Dieses Trait bündelt Speicheranordnung, Konfigurationsort, Bitrepräsentation und einen zusammengesetzten Arbeitsablauf. Es isoliert nicht die Bedeutung der Verzweigung:

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

Eine semantische API kann weiterhin Effekte enthalten, wenn Effekte zum gewählten Bereich gehören. Die Regel lautet nicht: „Alles muss rein sein.“ Sie lautet: „Jede primitive Operation muss eine schlüssige Bedeutung angeben.“

## Kodierung ist keine Methodik {#encoding-is-not-methodology}

Denotational Design setzt Folgendes nicht voraus:

*   Haskell
*   Tagless-Final-Kodierung
*   Objektalgebren
*   freie Monaden
*   einen einzelnen AST
*   ausschließlich reine Funktionen
*   kategorientheoretische Begriffe in jeder API

All dies kann als Kodierung oder Erklärungshilfe nützlich sein. Nichts davon definiert die Methode.

```admonish note title="Rust-Kodierungen"
In Rust sind kleine Traits, assoziierte Typen, Erweiterungsmethoden, generische Funktionen und Werte von Programmen erster Ordnung praktische Kodierungen. Ihr Wert hängt davon ab, ob sie einen klaren semantischen Entwurf bewahren.
```

## Morphismen von Typklassen {#type-class-morphisms}

Eine Möglichkeit, die Methode zu verstehen, sind strukturtreue Abbildungen.

Angenommen, eine Schnittstelle beschreibt eine semantische Algebra. Eine Implementierung bildet deren abstrakte Werte und Operationen auf eine konkrete Repräsentation ab. Eine gültige Implementierung muss die relevanten Operationen und Gesetze bewahren.

Wenn `encode` abstrakte Zweige auf einen konkreten Träger abbildet, sieht die Bewahrung der Erweiterung so aus:

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

Die Implementierung ist nicht bloß eine Sammlung von Methoden mit passenden Namen. Sie soll ein Morphismus sein, der die algebraische Struktur respektiert.

## Was eine gute Abstraktion ausmacht {#what-counts-as-a-good-abstraction}

Eine gute DD-Abstraktion hat mehrere Eigenschaften:

*   Ihre Werte haben eine einfache, beabsichtigte Bedeutung.
*   Ihre primitiven Operationen machen semantische Beobachtungen oder Konstruktionen zugänglich.
*   Umfangreicheres Verhalten wird aus diesen primitiven Operationen abgeleitet.
*   Ihre Gesetze hängen nicht von einer bestimmten Repräsentation ab.
*   Unabhängige Implementierungen können sie interpretieren.
*   Operative Details treten erst dort auf, wo sie relevant werden.

Kleinheit allein genügt nicht. Ein winziges Trait, das `get_manager()` offenlegt, ist weiterhin repräsentationsorientiert. Eine umfangreichere Algebra kann gerechtfertigt sein, wenn ihre Operationen eine schlüssige semantische Struktur bilden.

## Semantische Werte und abstrakte Träger {#semantic-values-and-abstract-carriers}

Nicht jeder konkrete Typ ist in einer Spezifikation verboten.

Verwende einen assoziierten Typ, wenn der Interpreter den Träger wählen soll:

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

Verwende einen konkreten Typ, wenn er zum stabilen semantischen Vokabular gehört:

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

Die Unterscheidung lautet nicht „abstrakt gut, konkret schlecht“, sondern semantisches Vokabular gegenüber zufälliger Maschinenrepräsentation.

## Die Spezifikation ist die Denotation und muss nicht ausführbar sein {#the-specification-is-the-denotation-and-it-need-not-execute}

Die Spezifikation ist die Denotation: die jedem Konstrukt zugewiesene mathematische Bedeutung. Ihre Stärke liegt darin, dass sie frei von Effizienzbeschränkungen und sogar von der Forderung nach Ausführbarkeit ist.

```admonish quote title="Conal Elliott"
Oft ist es viel einfacher und aufschlussreicher, eine Denotation als eine Implementierung zu definieren, denn sie unterliegt keinerlei Effizienzbeschränkungen oder Ablenkungen und muss nicht einmal ausführbar sein.

— [Denotational Design: from meanings to programs (LambdaJam 2015)](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

Das kanonische Beispiel ist FRP (Functional Reactive Programming): Ein `Behavior a` wird als Funktion der kontinuierlichen Zeit definiert,

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

Dieses Modell ist präzise, aber nicht ausführbar — die reellen Zahlen lassen sich nicht aufzählen. Ein Programm kann ebenso eine Ergebnismenge bezeichnen; keines der beiden Modelle wird ausgeführt, und genau darum geht es. Die Bedeutung wird nach Einfachheit und Präzision gewählt, nicht danach, wie sie berechnet wird.

Ausführbarkeit und Effizienz werden vollständig der *Implementierung* überlassen, einem getrennten Artefakt, dessen Korrektheit durch Homomorphiegesetze (Morphismen von Typklassen) gewährleistet wird, die es auf die Bedeutung zurückführen: Die Bedeutungsfunktion muss jede syntaktische Komposition auf die entsprechende semantische abbilden. Wie Conal es ausdrückt, liefert die Denotation „eine eindeutige Definition dessen, *was* implementiert werden soll, lässt aber viel Spielraum für Kreativität beim *Wie*.“

In Rust bringen mehrere Artefakte Teile dieser Spezifikation zum Ausdruck, und manche davon sind zufällig ausführbar. Die Ausführbarkeit ist nebensächlich; sie macht ein Artefakt nicht zur Spezifikation:

*   Prosa formuliert die beabsichtigte Bedeutung
*   Traits legen verfügbare Primitive fest
*   Erweiterungen formulieren Ableitungen
*   Gesetze formulieren erforderliche Gleichheiten
*   Interpreter zeigen die Realisierbarkeit
*   Tests liefern endliche Nachweise

Lies sie gemeinsam und gib Bedeutung und Gesetzen Vorrang vor konkreten Mechanismen.

## Weiterführende Lektüre {#further-reading}

*   [Denotational Design: from programs to meanings (BayHac 2014)](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [Denotational design with type class morphisms](http://conal.net/papers/type-class-morphisms/)
*   [Conal Elliott's writings and talks](http://conal.net/)
