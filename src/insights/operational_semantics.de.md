<!-- reader: {"title":"Von der Semantik zu Maschinen"} -->

# Von der Semantik zu Maschinen {#semantics-to-machines}

```admonish tip title="Verwandte Themen"
Design by Meaning in Rust: [Programme erster Ordnung](../rust-dd/first-order-programs.md), [Sprach- und Compiler-Pipelines](../rust-dd/compiler-pipelines.md)  
Concepts: [Operationale Semantik](../concepts/operational_semantics.md), [Freie Monade](../concepts/free_monad.md), [Continuation-Passing Style](../concepts/cps.md), [Defunktionalisierung](../concepts/defunctionalization.md)
```

## Was operationale Semantik beschreibt {#what-operational-semantics-describes}

Operationale Semantik spezifiziert das Verhalten einer gewählten Programmrepräsentation. Sie definiert Auswertungsurteile oder eine Übergangsrelation über Konfigurationen wie:

$$ (\mathit{program}, \mathit{state}) \longrightarrow (\mathit{program}', \mathit{state}') $$

Das Programm kann Quellsyntax, ein Wert einer freien Monade, ein CPS-Term, Bytecode oder ein defunktionalisierter Maschinenzustand sein. Keine dieser Repräsentationen *ist* operationale Semantik. Diese beschreibt, wie Werte der gewählten Repräsentation ausgewertet werden oder Übergänge durchlaufen.

Diese Richtung ist wichtig. Eine Repräsentation liefert einen Gegenstand, dessen Verhalten beschrieben werden kann; eine operationale Beschreibung erklärt nicht, was die Sprache bedeuten sollte.

## Programme mit freien Monaden {#free-monad-programs}

Eine freie Monade stellt Instruktionssyntax samt frei erzeugter Sequenzierung bereit. Sie legt nicht das Verhalten dieser Instruktionen fest.

Eine operationale Semantik für ein Programm mit freier Monade kann Konfigurationen mit der aktuellen Instruktion, ihrer Fortsetzung und einem möglichen Maschinenzustand definieren. Ihre Regeln erklären dann beispielsweise, wie eine ausgesetzte Instruktion den Zustand ändert und ihr Ergebnis an das restliche Programm übergibt.

Das ist eine mögliche Interpretation. Dasselbe freie Programm kann stattdessen in ein denotationelles Modell gefaltet, in eine andere Sprache kompiliert, analysiert oder dargestellt werden, ohne es auszuführen.

<details>
<summary><strong>Von free zu freer: Was die Forschung herausgefunden hat</strong></summary>

Leser, die freie Monaden als allgemeine Architektur für Programme mit Effekten kennengelernt haben, fragen sich vielleicht, warum sich die Diskussion später zu freer-Konstruktionen, erweiterbaren Effekten und Handlern verlagert hat. Die Forschung hat freie Monaden nicht einfach verworfen. Sie hat herausgearbeitet, was sie tatsächlich leisten, untersucht, wo ihre verbreiteten Repräsentationen scheitern, und die brauchbare Struktur weiterentwickelt.

Kiselyov und Ishii leiten freer-Monaden her, indem sie Beschränkungen und Boilerplate von Repräsentationen effektvoller Terme schrittweise entfernen. In der freer-Repräsentation kann eine Instruktion einen Zwischentyp liefern, der im endgültigen Programmtyp verborgen bleibt; eine explizite Fortsetzung verbindet dieses Ergebnis mit dem restlichen Berechnungsablauf. Die Instruktionssignatur benötigt daher keine `Functor`\-Instanz mehr.

Das verbessert die Ausdrucksmöglichkeiten, löst aber nicht von selbst das Leistungsproblem. Eine direkte freer-Repräsentation verkettet Fortsetzungen weiterhin wie linksassoziiertes Anhängen an eine Liste: Das Verarbeiten einer Folge von $n$ Anfragen kann $O(n^2)$ Aufwand erfordern. Die explizite Fortsetzung macht die eigentliche Chance sichtbar — man kann sie als typausgerichtete Sequenz speichern, deren benachbarte Ergebnis- und Eingabetypen konstruktionsbedingt zusammenpassen. Effizientes Verketten dieser Sequenz beseitigt den von der Assoziation abhängigen Durchlauf.

Offene Vereinigungen ermöglichen es einem Interpreter für erweiterbare Effekte anschließend, ausgewählte Anfragetypen hinzuzufügen, zu kombinieren und zu eliminieren. Das löst Probleme bei der modularen Effektkomposition und Handlerstruktur. Die Gleichungen eines bestimmten Fachgebiets oder die Frage, wann zwei Programme mit Effekten dieselbe Bedeutung haben, werden dadurch weiterhin nicht festgelegt.

Das Fazit ist präziser als „freer ist besser als free“. Freie Monaden machten eine wertvolle Trennung zwischen Anfragen und Interpretation sichtbar. Freer-Kodierungen beseitigten eine unnötige Beschränkung; typausgerichtete Queues lösten ein gemessenes Leistungsproblem; erweiterbare Effekte verbesserten die Komposition. Jeder Schritt bewahrte Erkenntnisse aus dem vorherigen und schränkte zugleich die Behauptung ein. Die semantische Interpretation blieb dabei stets eine separate Entscheidung.

Siehe Kiselyov und Ishii, [*Freer Monads, More Extensible Effects*](https://okmij.org/ftp/Haskell/extensible/more.pdf).

</details>

## CPS-Programme {#cps-programs}

Continuation-Passing Style (CPS) stellt den Rest einer Berechnung ausdrücklich als Fortsetzung dar. Eine operationale Semantik für CPS beschreibt etwa:

*   den aktuellen CPS-Ausdruck auswerten;
*   einen erzeugten Wert an seine Fortsetzung übergeben;
*   die Kontrolle übertragen, wenn diese Fortsetzung angewendet wird.

CPS macht den Kontrollfluss auf eine operational leicht beschreibbare Weise sichtbar, ist aber eine Repräsentation oder Programmtransformation — keine operationale Semantik. Um ein Programm im direkten Stil mit seiner CPS-Übersetzung in Beziehung zu setzen, braucht es formulierte Quell- und Zielsemantiken sowie einen Bewahrungsnachweis.

<details>
<summary><strong>Über CPS hinaus: Wenn Fortsetzungen untersucht werden müssen</strong></summary>

CPS ist eine gängige Lösung für assoziationsabhängiges Anhängen und Binden. Statt eine linksassoziierte Struktur wiederholt zu durchlaufen, stellt es den verbleibenden Berechnungsablauf durch Funktionskomposition dar. Bleibt als einzige Operation auf der Fortsetzung ihre spätere Anwendung, kann diese Repräsentation effizient sein.

Van der Ploeg und Kiselyov benennen die Grenze: Manche Nutzer müssen ein Zwischenergebnis untersuchen oder verändern, bevor die Berechnung fortgesetzt wird. Nichtdeterministische Suche, Iteratees, freie Monaden und erweiterbare Effekte können diesen Zugriff benötigen. CPS verbirgt die begriffliche Sequenz in einer Funktion; die Rekonstruktion der Zwischenstruktur erfordert daher eine Rückwandlung in Daten und kann den Leistungsvorteil zunichtemachen.

Ihre Alternative stellt die verborgene Sequenz direkt als typausgerichtete Datenstruktur dar. Sie ermöglicht effiziente Komposition unabhängig von der Assoziation und bewahrt zugleich den effizienten Zugriff auf Zwischenergebnisse. Die Typen stellen sicher, dass jede gespeicherte Berechnung genau die Eingabe erzeugt, die die nächste erwartet.

Die weitergehende Schlussfolgerung lautet nicht, dass typausgerichtete Sequenzen CPS überlegen sind. CPS eignet sich hervorragend zum *Anwenden* von Fortsetzungen, aber weniger, wenn ein Nutzer sie *untersuchen* muss. Die Forschung zu begrenzter Kontrolle schärft diese Erkenntnis weiter: Statt die gesamte Zukunft als eine undifferenzierte Fortsetzung zu behandeln, legen Delimiter fest, welcher Teil der umgebenden Berechnung erfasst und bearbeitet werden darf.

Diese Ideen sind nicht verschwunden. Ihre Lehren leben in Effekt-Handlern, Herleitungen abstrakter Maschinen, typisierten Kontrolloperatoren und effizienten Repräsentationen von Effekten weiter. Verändert hat sich die Erwartung, CPS allein müsse die endgültige Abstraktion sein.

Siehe van der Ploeg und Kiselyov, [*Reflection without Remorse*](https://okmij.org/ftp/Haskell/zseq.pdf). Für den breiteren Kontrollflusskontext siehe Kiselyovs [continuations and delimited-control collection](https://okmij.org/ftp/continuations/index.html).

</details>

## Defunktionalisierte Maschinen {#defunctionalized-machines}

Defunktionalisierung ersetzt eine bekannte Familie von Funktionswerten, etwa CPS-Fortsetzungen, durch Konstruktoren erster Ordnung und eine `apply`\-Operation. Die operationale Semantik kann dann Übergänge zwischen den daraus entstehenden expliziten Konfigurationen beschreiben.

Auf eine konkrete CPS-Transformation kann Defunktionalisierung folgen, um eine abstrakte Maschine herzuleiten. Diese Herleitung ist leistungsstark, aber keine allgemeine Definition operationaler Semantik: Operationale Regeln müssen nicht aus CPS hervorgehen, und eine beliebige Maschine erster Ordnung ist deshalb noch keine defunktionalisierte Fortsetzungsmaschine.

<details>
<summary><strong>Reynolds: Der Ursprung der Defunktionalisierung</strong></summary>

John C. Reynolds führte Defunktionalisierung 1972 in seiner Untersuchung definierender Interpreter ein. Ausgangspunkt war keine virtuelle Maschine erster Ordnung, sondern ein Interpreter höherer Ordnung: Funktionen in der definierenden Sprache stellten Umgebungen, Fortsetzungen und andere Teile der zu definierenden Sprache dar.

Die Transformation betrachtet die endliche Familie von Funktionsabstraktionen, die im gesamten Programm auftreten kann. Sie ersetzt jede Abstraktion durch einen Konstruktor erster Ordnung, der die Werte ihrer freien Variablen enthält, und ersetzt anschließend die Funktionsanwendung durch eine einzige `apply`\-Operation, die anhand dieser Konstruktoren verzweigt. Was in der definierenden Sprache implizit war, wird zu einer expliziten Algebra von Abschlüssen oder Fortsetzungen.

Auf einen Interpreter mit Fortsetzungen angewandt, macht dieser Schritt eine Maschine sichtbar: Fortsetzungskonstruktoren werden zu Steuerzuständen, erfasste Variablen zu gespeicherten Maschinendaten und `apply` zum Übergangsverteiler. Die Maschine wird nicht zuerst erraten, sondern aus einem Auswerter höherer Ordnung hergeleitet.

Reynolds betonte auch den Preis dieser Klarheit. Die resultierende Maschine enthält Repräsentationsentscheidungen, die korrekt, aber nicht eindeutig sind. Andere Konstruktoren oder vorangehende Transformationen können andere Ansammlungen maschinenartiger „Rädchen und Zahnräder“ ergeben und dennoch dasselbe Verhalten bewahren. Defunktionalisierung legt also eine operationale Struktur offen, nicht die einzig mögliche Bedeutung der Sprache.

Danvy und Nielsen systematisierten Reynolds’ Technik später als Transformation für vollständige Programme und untersuchten Re-Funktionalisierung als ihre Umkehrung. Ihre weitergehende Schlussfolgerung lautet, dass diese Transformation eine Brücke bildet: Sie kann Spezifikationen und Korrektheitsargumente zwischen Definitionen höherer Ordnung und Maschinen erster Ordnung übertragen und zeigen, dass scheinbar unabhängige Programme zwei Repräsentationen derselben Struktur sind.

Diese Forschungslinie bestimmt den angemessenen Stellenwert der Technik. Defunktionalisierung ist mehr als der Ersatz von Closures durch ein Enum, aber weniger als eine universelle Grundlage: Sie ist ein bedeutungserhaltender Übergang zwischen Repräsentationen, deren Entsprechung nachgewiesen werden muss.

Siehe Reynolds, [*Definitional Interpreters for Higher-Order Programming Languages*](https://homepages.inf.ed.ac.uk/wadler/papers/papers-we-love/reynolds-definitional-interpreters-1972.pdf), sowie Danvy und Nielsen, [*Defunctionalization at Work*](https://tidsskrift.dk/brics/article/view/21684).

</details>

## Der Zyklus operationaler Repräsentationen {#the-operational-representation-cycle}

Ein wiederkehrender Fehler ist die Suche nach einer einzigen operationalen Repräsentation, die alle Programmierprobleme löst. Jede Repräsentation macht etwas sichtbar, das die vorige verbarg, erschwert dadurch jedoch einen anderen Aspekt:

$$ \text{higher-order program} \longrightarrow \text{free syntax} \longrightarrow \text{CPS} \longrightarrow \text{first-order machine} \longrightarrow \text{higher abstraction} $$

Die Pfeile behaupten keine notwendige Compiler-Pipeline. Sie zeigen eine wiederkehrende Entwurfsbewegung: sichtbar machen, was die aktuelle Repräsentation verbirgt, und anschließend die durch diese Offenlegung eingeführte Mechanik verbergen.

| Repräsentation | Was dadurch möglich wird | Welche Schwierigkeiten dadurch entstehen |
| --- | --- | --- |
| Funktionen höherer Ordnung | Direkte Komposition und Abstraktionen der Hostsprache | Ein generischer Nutzer kann eine Funktion aufrufen, aber nicht ihre verborgene Struktur untersuchen |
| Freie Syntax mit Sequenzierung | Programme als Daten, die sich zusammensetzen und interpretieren lassen | Fachliche Gleichungen, Normalisierung, effiziente Auswertung und Einsicht in gespeicherte Funktionen sind nicht durch Freiheit gegeben |
| CPS | Auswertungsreihenfolge und restlicher Berechnungsablauf werden explizit | Eine CPS-Kodierung des gesamten Programms führt Fortsetzungen durch nahezu alle Schnittstellen |
| Defunktionalisierte Steuerung erster Ordnung | Fortsetzungen werden zu untersuchbaren, serialisierbaren Fällen | Konstruktoren, gespeicherte Argumente, Übergangszustände und eine `apply`\-Operation müssen ausdrücklich gepflegt werden |
| Eine höhere Abstraktion über der Maschine | Die Mechanik wird leichter verwendbar | Die Struktur wird erneut verborgen, wenn Compiler, Scheduler, Debugger oder Optimierer sie untersuchen müssen |

Die Herausforderungen sind strukturell. Inspektion erfordert Daten. Wird Verhalten in Daten verwandelt, braucht es Konstruktoren und einen Interpreter. Werden diese Konstruktoren verborgen, entsteht wieder eine bequeme Abstraktion — doch genau der Zugriff, den Nutzer zur Analyse oder Transformation von Programmen benötigen, geht verloren.

Der Zielkonflikt freier Monaden ist besonders aufschlussreich. Eine freie Monade löst ein genau umrissenes Problem: Sie erzeugt Sequenzierung für einen Instruktionsfunktor, ohne über die Monadengesetze hinaus Gleichungen aufzuerlegen. Diese Garantie ist zugleich ihre Grenze. Sie kennt die Gesetze des Fachgebiets nicht. Sollen etwa zwei Schreibvorgänge in dieselbe Zelle dem letzten Schreibvorgang entsprechen, enthält das freie Programm weiterhin beide Instruktionen, bis eine fachgebietsspezifische Normalisierung oder Interpretation sie zusammenführt. Optimierung, kanonische Form und semantische Gleichheit müssen daher anderswoher kommen.

Auch die Reifizierung von Instruktionen macht nicht das gesamte Programm einheitlich untersuchbar. In verbreiteten Kodierungen ist eine ausgesetzte Instruktion sichtbar, ihre Fortsetzung jedoch eine Funktion der Hostsprache. Ein generischer Analysator kann die zukünftige Struktur hinter dieser Funktion nicht untersuchen, ohne ein Ergebnis zu liefern und sie anzuwenden. Die Reifizierung der Fortsetzung ermöglicht wieder Inspektion, indem sie in Richtung einer Darstellung erster Ordnung oder defunktionalisierten Repräsentation führt — und damit zum nächsten Teil des Zyklus zurückkehrt.

Auch die Auswertungskosten hängen von der Repräsentation ab. Ein naiver Baum linksassoziierter Bindungen kann wiederholte Durchläufe und quadratischen Aufwand erfordern. Eine Transformation, die verbleibende Teilprogramme dupliziert, kann exponentielles Wachstum verursachen. Kodierungen nach dem Codensity-Stil, freer-Kodierungen oder spezialisierte Darstellungen verbessern bestimmte Kosten, indem sie andere Repräsentationen und Zielkonflikte wählen. Exponentielles Wachstum ist möglich, aber kein inhärentes Gesetz freier Monaden.

Darum ist eine freie Monade keine Universallösung. Sie bietet Syntax mit gesetzmäßiger Sequenzierung, nicht die beabsichtigten Gleichungen des Fachgebiets, eine kanonische Normalform, vollständige strukturelle Sichtbarkeit oder eine automatisch effiziente Implementierung. Ebenso muss CPS nicht das gesamte System durchziehen, wenn es lokal verwendet wird; Defunktionalisierung wird nur im Verhältnis zur Familie von Funktionen und erfassten Werten umständlich, die reifiziert werden müssen.

Der Zyklus entsteht, wenn jede neue Kodierung zur universellen Grundlage gemacht werden soll. Sie löst die letzte operationale Unbequemlichkeit und wird anschließend selbst zur Quelle zufälliger Komplexität.

Darum kommen Debatten über die „beste Abstraktion“ nicht zu einem Ergebnis, wenn sie vollständig operational bleiben. Funktionen höherer Ordnung, freie Syntax, CPS und Maschinen erster Ordnung werden verglichen, als müsse eine davon allen anderen überlegen sein. Doch *besser* hat keine Bedeutung, bevor der Vergleich festlegt, was bewahrt werden muss und wer das Ergebnis nutzen wird:

*   direkte Ausführung begünstigt gewöhnliche Aufrufe und verborgene Repräsentationen;
*   Transformation und Analyse benötigen untersuchbare Strukturen;
*   Serialisierung benötigt Daten erster Ordnung;
*   Erweiterbarkeit kann das Hinzufügen von Interpretationen oder Syntax begünstigen, aber selten beides gleichermaßen;
*   Nebenläufigkeit kann Beobachtungen erfordern, die bewusst viele Entscheidungen des Schedulers ausblenden.

Das sind unterschiedliche Anforderungen, keine aufeinanderfolgenden Beweise dafür, dass eine Abstraktion universell überlegen ist. Operationale Eigenschaften können bei der Wahl einer Implementierung für einen klar benannten Zweck helfen; sie können weder den Zweck vorgeben noch bestimmen, welche Unterschiede Bedeutung haben.

Dieselbe Vorsicht gilt für sequenzielles Denken. Operationale Semantik kann nebenläufige und nichtdeterministische Systeme beschreiben, doch eine einzelne Folge von Maschinenschritten ist nur eine mögliche Repräsentation ihres Verhaltens. Wird die Reihenfolge des Schedulers zu früh als maßgeblich gesetzt, unterscheiden sich äquivalente Ausführungen allein deshalb, weil ihre Mechanismen anders verschränkt wurden. Das semantische Modell muss zuerst festlegen, welche Beobachtungen nebenläufige Programme unterscheiden; anschließend lassen sich operationale Abläufe daran messen.

## Reales Beispiel: die EVM {#real-example-the-evm}

Die Ethereum Virtual Machine (EVM) lässt sich operational verstehen:

*   **Zustand**: Programmzähler, Stapel, Speicher, dauerhafter Speicher, Gas
*   **Übergangsregeln**: je eine pro Opcode (`ADD`, `PUSH`, `SSTORE` usw.)
*   **Ausführung**: kleine Schritte wiederholt anwenden, bis die Ausführung anhält

EVM-Bytecode sind Instruktionsdaten erster Ordnung. Eine operationale Beschreibung legt fest, wie sich eine EVM-Konfiguration bei jedem Opcode ändert; ein konkreter Client implementiert dieses Verhalten.

Ihre Verteilerschleife und ihr Programmzähler können einer defunktionalisierten abstrakten Maschine ähneln. Sie jedoch als defunktionalisierte Fortsetzungen zu bezeichnen, erfordert eine konkrete Funktion höherer Ordnung als Quelle, eine Transformation und deren Entsprechungsnachweis — eine ähnlich aussehende Schleife genügt nicht.

## Den Zyklus durchbrechen: Bedeutung vor Mechanik {#breaking-the-cycle-meaning-before-machinery}

Operationale und denotationelle Beschreibungen beantworten unterschiedliche Fragen:

$$ \begin{aligned} \llbracket p \rrbracket &\in D && \text{what does the program mean?} \\ c &\longrightarrow c' && \text{how does this representation step?} \end{aligned} $$

Eine bedeutungsorientierte Entwicklung wählt den semantischen Bereich, Komposition, Beobachtungen und Gesetze, bevor sie sich auf eine Maschinenrepräsentation festlegt. Nach der Wahl eines Übergangssystems verbindet eine Korrektheitsverpflichtung beide Ebenen. Für eine passend definierte Bedeutung vollständiger Konfigurationen hat eine typische Behauptung zur Bewahrung stiller Schritte die Form:

$$ c \longrightarrow c' \quad \Longrightarrow \quad \operatorname{meaning}(c) = \operatorname{meaning}(c') $$

Die genaue Relation kann stattdessen beobachtungsbezogene Äquivalenz, Spuren oder Bisimilarität verwenden. Entscheidend ist, dass die Maschine der beabsichtigten Bedeutung verpflichtet bleibt.

Denotational Design kürt keinen Sieger im Zyklus. Es schafft eine stabile Autorität außerhalb davon:

1.  Semantischen Bereich, Operationen, Komposition und Gesetze festlegen.
2.  Programme in Begriffen dieser Bedeutung schreiben.
3.  Eine Repräsentation für einen konkreten Nutzer auswählen: direkte Ausführung, Inspektion, Kompilierung, Ablaufplanung, Serialisierung oder Analyse.
4.  Jede gewählte Repräsentation und Transformation auf dieselbe Bedeutung zurückführen.

Ein Interpreter höherer Ordnung und ein Programm erster Ordnung können daher nebeneinander bestehen. Keines davon muss die Sprachdefinition sein. Das erste kann der direkten Ausführung dienen, das zweite Nutzern, die Struktur benötigen. Ihre Übereinstimmung ist eine semantische Verpflichtung, keine Annahme, dass ihre Mechanismen identisch sind.

```admonish note title="Keine endgültige operationale Abstraktion"
Jede operationale Repräsentation macht manche Strukturen sichtbar und verbirgt andere. Bedeutung ist der stabile Ausgangspunkt, von dem aus sich geeignete Repräsentationen auswählen und zueinander in Beziehung setzen lassen.
```

## Zusammenfassung {#summary}

*   Operationale Semantik beschreibt die Auswertung oder Übergänge für eine gewählte Repräsentation.
*   Freie Monaden stellen Instruktionssyntax und Sequenzierung bereit; ihr Verhalten erfordert weiterhin eine Interpretation.
*   CPS macht Fortsetzungen sichtbar; operationale Regeln können beschreiben, wie CPS-Programme Werte und Kontrolle weitergeben.
*   Defunktionalisierung kann ein bestimmtes Programm höherer Ordnung in eine Maschine erster Ordnung überführen, deren Übergänge sich operational formulieren lassen.
*   Wird eine dieser Kodierungen als universell behandelt, entsteht ein Zyklus aus Reifizierung und Verbergen von Strukturen.
*   Die denotationelle Bedeutung bestimmt, was diese Übergänge bewahren müssen.
