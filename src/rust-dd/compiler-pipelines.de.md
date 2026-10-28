<!-- reader: {"title":"Sprach- und Compiler-Pipelines","sourceHash":"sha256:6ea1059eeaf723738c4e5ac542c9655cd8810817064c0ae84ef41b42ab894190"} -->

# Sprach- und Compiler-Pipelines {#language-and-compiler-pipelines}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Programme erster Ordnung](first-order-programs.md), [Interpreter und Effekte](interpreters.md)  
Concepts: [Operationale Semantik](../concepts/operational_semantics.md), [Defunktionalisierung](../concepts/defunctionalization.md)  
Insights: [EVM-Algebra](../insights/evm-alg.md)
```

```admonish note title="Bedeutung ist nicht die Pipeline"
Ein Compiler ist am klarsten, wenn die Sprachbedeutung nicht mit Parserbäumen, Durchläufen, Bytecode oder der Maschinenschleife gleichgesetzt wird. Korrektheit ist ein kommutierendes Gesetz: Die Ausführung des kompilierten Programms muss mit seiner Denotation übereinstimmen.
```

Ein Compiler lässt sich am leichtesten durchdenken, wenn die Sprachbedeutung nicht mit Parserbäumen, Compiler-Durchläufen, Bytecode oder einer Schleife der virtuellen Maschine gleichgesetzt wird.

Dieses Kapitel verwendet eine vereinfachte nebenläufige Sprache nach dem Vorbild von Tolang und konzentriert sich auf die semantische Architektur.

## Vier verschiedene Ebenen {#four-distinct-layers}

Halte diese Ebenen auseinander:

1.  Quellsyntax
2.  Normalisierte Sprache
3.  Ausführbare Repräsentation
4.  Maschinenausführung

Eine typische Pipeline sieht so aus:

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

Die praktische Operation ist die Komposition:

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

Die zusammengesetzte Hilfsfunktion ist nicht die semantische Definition jeder Stufe.

## Syntax ist noch keine Bedeutung {#syntax-is-not-yet-meaning}

Die Ausgabe eines Parsers spiegelt Entscheidungen der Grammatik wider:

*   Zeichensetzung
*   syntaktische Vereinfachungen
*   Vorrangregeln
*   Quelltextbereiche
*   generierte Parserrepräsentation

Diese Fakten sind für Diagnosen und Werkzeuge wichtig, müssen aber nicht die Kernsprache definieren.

Die Normalisierung beseitigt zufällige syntaktische Variation und führt eine kleinere Form ein, die Bedeutung trägt. Beispielsweise können mehrere oberflächliche Bindungsformen auf eine einzige Kernoperation zur Einschränkung normalisiert werden.

**Viele Quellformen** → **ein normalisierter Konstruktor**

Dadurch entsteht ein einzelner Ort, an dem spätere Gesetze für Compiler und Laufzeit festgelegt werden können.

## Denotationelle und kompilierte Bedeutung {#denotational-and-compiled-meaning}

Sei:

$$ \llbracket - \rrbracket : Core \to D $$

Bedeutungen im semantischen Bereich `D` zuweisen.

Die Kompilierung erzeugt ausführbare Werte:

$$ compile : Core \to Executable $$

und die Ausführung beobachtet sie:

$$ run : Executable \to D $$

Die zentrale Korrektheitsverpflichtung ist ein kommutierendes Diagramm:

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

Bei nichtdeterministischen oder nebenläufigen Systemen kann die Gleichheit eine beobachtungsbezogene Äquivalenz, eine Ergebnismenge, Spuräquivalenz oder Bisimilarität statt gewöhnlicher Wertgleichheit sein. Das semantische Modell muss diese Wahl treffen.

## Bedeutung nebenläufiger Prozesse {#concurrent-process-meaning}

Der grundlegende reflektive Kalkül umfasst Ideen wie:

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang erweitert den grundlegenden Kalkül auf kompositionale Weise. Eine solche Erweiterung fügt die Oberflächenform hinzu

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

Diese Bindung erzeugt einen frischen Kanal und beschränkt seinen Namen auf den Gültigkeitsbereich von $P$. In der Prozesskalkül-Literatur heißt diese Operation *restriction*. Der reflektive Kern besitzt keinen primitiven Restriktionsoperator. Siehe [*A Reflective Higher-order Calculus*](https://doi.org/10.1016/j.entcs.2005.05.016) von Meredith und Radestock.

Die operationale Maschine kann dies mit einem Tupelraum, Warteschlangen, Matching-Indizes, Fortsetzungsdatensätzen und nebenläufigen Tasks implementieren. Diese Mechanismen definieren nicht die Sprache.

Die semantische Ebene bestimmt das beobachtbare Prozessverhalten und strukturelle Gesetze. Zu den möglichen Gesetzen der parallelen Kernkomposition gehören:

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

Gesetze für diese Erweiterung um frische Bindungen sind davon getrennt. Übliche mögliche Schemata sind Alpha-Umbenennung, Vertauschung verschiedener Bindungen und Scope Extrusion:

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

Hier bedeutet $y \mathrel{\#} P$, dass $y$ frisch bezüglich $P$ ist; $P\{y/x\}$ steht für eine Umbenennung unter Vermeidung von Variablenfang, und $\operatorname{FN}(P)$ ist die Menge der freien Kanalnamen in $P$. Diese Schemata werden nur dann zu Gesetzen, wenn die gewählte beobachtungsbezogene Äquivalenz sie bestätigt. Sie dürfen weder aus der Oberflächensyntax abgeleitet noch aus einem einzelnen Bytecode-Layout geschlossen werden.

## Normalisierung als bedeutungserhaltende Abbildung {#normalization-as-a-meaning-preserving-map}

Unterscheiden sich Quellprogramme `s₁` und `s₂` nur durch zugelassene syntaktische Vereinfachungen, sollte die Normalisierung ihre gemeinsame Bedeutung explizit machen:

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

Weitere nützliche Verpflichtungen sind:

*   Alpha-Umbenennung bewahrt die normalisierte Bedeutung
*   Der lexikalische Gültigkeitsbereich löst Namen zum vorgesehenen Binder auf
*   Quelltextpositionen bleiben erhalten, wenn Diagnosen sie benötigen
*   Kompilierzeitkonstanten werden ohne Laufzeitverhalten entfernt
*   Fehlerhafte Syntax sammelt Diagnosen gemäß dem Vertrag der jeweiligen Stufe

Manche Projekte benötigen kanonische normalisierte Werte. Andere verlangen nur semantische Gleichwertigkeit. Gib an, was zutrifft.

## Stufen-Capabilities {#stage-capabilities}

```admonish warning title="Kein Alleskönner-Compilerobjekt"
Mache nicht ein einziges riesiges Compilerobjekt zur alleinigen Schnittstelle aller Stufen.
```

Ein Normalisierer kann Capabilities benötigen wie:

*   Bindungsbereich lesen und erweitern
*   Quellnamen auflösen
*   Diagnosen sammeln
*   Normalisierte Terme konstruieren

Ein Codegenerator kann Folgendes benötigen:

*   Ausführbare Referenzen zuweisen
*   Instruktionen ausgeben
*   Normalisierte Variablen auflösen
*   Ausführbare Struktur abschließen

Formuliere Stufeneinstiege als Erweiterungen über diese Capabilities. Konkrete Umgebungen speichern Maps, Arenen, Zähler und Diagnosen, besitzen aber nicht die Bedeutung der jeweiligen Stufe.

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

Die genauen Capability-Namen unterscheiden sich je nach Compiler. Entscheidend sind explizite Abhängigkeiten und stabile Stufenübergänge.

## Parser und Laufzeit dürfen operational geprägt bleiben {#parser-and-runtime-can-remain-operational}

Nicht jedes Teilsystem muss in dieselbe Kodierung gezwungen werden.

Ein Parser kann stark von generierten Grammatikmechanismen geprägt sein. Eine virtuelle Maschine kann vor allem auf effiziente Mutation und Ablaufplanung ausgelegt sein. Beide können operational geformt bleiben und zugleich klar definierte Grenzen implementieren:

| Stufe | Vertrag |
| --- | --- |
| Parser | Erzeugt `Syntax` |
| Normalisierer | Erzeugt `Core`, das Bedeutung trägt |
| Codegenerator | Bewahrt die Bedeutung in der ausführbaren Form |
| Laufzeit | Erzeugt Beobachtungen, die mit dem Sprachmodell übereinstimmen |

Denotational Design schafft Maschinen nicht ab. Es verhindert, dass Maschinen unbemerkt zur Sprachsemantik werden.

## Compiler-Gesetze und Tests {#compiler-laws-and-tests}

Starke Nachweise ergeben sich aus mehreren Richtungen:

*   Normalisierungsgesetze für äquivalente Quellformen
*   Rundlauftests für Parsing und Pretty-Printing, sofern dies vorgesehen ist
*   direkter semantischer Vergleich zwischen Auswertung und kompilierter Ausführung
*   Bytecode-Äquivalenz, wenn kanonische Ausgabe zugesichert wird
*   Konformitätsszenarien für die Laufzeit
*   Differentialtests zwischen Interpretern

```admonish warning title="Bytegleichheit ist keine semantische Gleichheit"
Verwechsle Byte-für-Byte-Gleichheit nicht mit semantischer Gleichheit. Bytegleichheit ist nur dann eine nützliche, stärkere Eigenschaft, wenn eine kanonische Kompilierung zur Spezifikation gehört.
```

## Wie dies die Leser vorbereitet {#how-this-prepares-the-reader}

Achte beim Lesen einer bedeutungsorientierten Sprachimplementierung auf:

*   semantische Syntax oder Capability-Traits
*   abgeleitete Normalisierungsoperationen
*   explizite Verträge für die einzelnen Stufen
*   Programme des Kerns erster Ordnung
*   Gesetze zu Substitution, Gültigkeitsbereich und Komposition
*   schlanke Umgebungen, die Stufen-Capabilities interpretieren
*   operationale Mechanismen für Parser, Compiler und VM an den Grenzen

Diese Perspektive verbindet allgemeines Denotational Design mit Tolang und zeigt, wie semantische Grenzen Sprachentwurf, Kompilierung und Laufzeitinterpretation leiten.
