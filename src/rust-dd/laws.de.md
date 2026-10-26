<!-- reader: {"title":"Gesetze, Szenarien und Nachweise"} -->

# Gesetze, Szenarien und Nachweise {#laws-scenarios-and-evidence}

```admonish tip title="Verwandte Themen"
The Semantic View: [Gesetze und Interpretationen](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Interpreter und Effekte](interpreters.md), [Capability-Algebren](capability-algebras.md)  
Concepts: [Verzweigung und Konfluenz](../concepts/branching.md), [Referenzielle Transparenz](../concepts/referential_transparency.md)
```

```admonish note title="Orientierung"
Tests liefern Nachweise für eine Spezifikation. Prüfe die öffentlichen Beobachtungen und die Gesetze, die der gewählte Bereich unterstützt, nicht interne Ausführungsschritte. Formuliere diese Gesetze generisch über die Capability, damit sie für jeden Interpreter gelten.
```

Bedeutungsorientierter Code braucht bedeutungsorientierte Tests. Prüfe öffentliche Beobachtungen und Gesetze statt interner Ausführungsschritte.

## Die Oberfläche der Spezifikation testen {#test-the-specification-surface}

````admonish warning title="An die Repräsentation gekoppelter Test"
Diese Assertion greift auf die Felder eines Trägers zu, daher kann kein anderer Interpreter sie mitverwenden:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

Semantischer Test:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

Der erste Test kann für ein Serialisierungsmodul passend sein, dessen Gegenstand die Bitkodierung ist. Als Nachweis für die Verzweigungsalgebra ist er schwach, da alternative Repräsentationen ihn nicht gemeinsam verwenden können.

## Wiederverwendbare Gesetzeserweiterungen {#reusable-law-extensions}

Gilt eine Eigenschaft für jeden kompatiblen Interpreter, formuliere sie einmal:

```rust,noplayground
use anyhow::{Result, bail, ensure};
use extend::ext;

#[ext(name = BranchLawsExt)]
pub impl<This> This
where
    This: BranchAlg,
    This::Branch: Clone + Eq,
{
    fn check_branch_root_round_trip(&self, directions: &[Direction]) -> Result<()> {
        let root = self.branch_root();
        let branch = directions.iter().copied().fold(root.clone(), |branch, direction| self.branch_grow(&branch, direction));

        let Some(path) = self.branch_path(&root, &branch) else {
            bail!("grown branch has no path from root");
        };
        ensure!(path == directions, "root path did not round-trip");
        Ok(())
    }
}
```

Jeder Interpreter führt dieselbe Prüfung aus. `anyhow::Result` trägt das Ergebnis; `bail!` meldet die fehlende Beobachtung und `ensure!` prüft das Rundlaufgesetz. Die Prüfung unterscheidet die beiden Fehlerfälle, ohne von einer bestimmten Verzweigungsrepräsentation abzuhängen.

## Nützliche Gesetzesfamilien {#useful-law-families}

Suche nach Eigenschaften, die sich bereits aus der semantischen Struktur ergeben:

*   Identität
*   Assoziativität
*   Kommutativität, wenn sie tatsächlich beabsichtigt ist
*   Idempotenz
*   Rundlauf
*   Kanonisierung
*   Verfeinerung
*   Monotonie
*   Substitution
*   Übereinstimmung der Interpretationen

```admonish warning title="Nur Gesetze behaupten, die der Fachbereich trägt"
Füge keine vertrauten algebraischen Begriffe hinzu, nur weil sie mathematisch klingen. Formuliere nur Gesetze, die der gewählte Bereich unterstützt.
```

## Gesetze und Repräsentationsinvarianten {#laws-versus-representation-invariants}

Halte diese Aussagen auseinander:

*   **Semantisches Gesetz:** Einen Zweig aus seinem Wurzelpfad zu rekonstruieren, bezeichnet denselben Zweig.
    
*   **Repräsentationsinvariante:** Ungenutzte hohe Bits sind null.
    
*   **Serialisierungsgesetz:**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **Gesetz für kanonisches Format:**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

Alle können wichtig sein. Sie gehören jedoch zu unterschiedlichen Spezifikationen.

## Gemeinsam genutzte Szenarien {#shared-scenarios}

Ein Szenario ist eine wiederverwendbare Interaktion, formuliert über öffentliche Capabilities. Das ALUX-Testframework stellt Szenarien auf diese Weise dar: Der Szenariocode erstellt einen Wert über die Capabilities `Scenario`, `DeployerIds`, `PlayAst` und `ScenarioSchedule`, ohne einen konkreten Runner zu benennen.

```rust,noplayground
#[ext(name = HelloScenarioExt)]
pub impl<This> This
where
    This: StandaloneScenario,
    This::Step: PlayAst<Ast = RProc>,
{
    fn hello(self) -> This::Scenario {
        self.scenario()
            .under_comprehensive(100)
            .step(
                self.play_ast(
                    self.deployer(0),
                    tolang! {
                        let x in {
                            x ! "hello" |
                            ? (a <- x) a.log()
                        }
                    },
                )
                .expect_log(r#""hello""#),
            )
    }
}
```

Jeder Aufruf beschreibt die im Szenario festgelegte Bedeutung statt der Mechanik des Runners. `under_comprehensive(100)` verlangt das erwartete Protokoll bei einem sequenziellen Lauf, 100 frei nebenläufigen Läufen und bis zu 100 permutierten Läufen. Das Szenario legt die Beobachtung fest, während der Runner die Ausführungsreihenfolge variiert.

Dasselbe Prinzip gilt über verschiedene Interpreter hinweg: Wenn mehrere Runner die in einem Szenario verwendeten Capabilities implementieren, kann jeder dieselbe vom Autor formulierte Interaktion interpretieren. Runner-spezifische Einrichtung und Prüfung der Grenzen bleiben außerhalb des Szenarios.

## Übereinstimmung zwischen Interpretern {#cross-interpreter-agreement}

Wenn zwei Interpreter dieselbe Beobachtung bereitstellen, vergleiche sie:

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

So wird eine Abweichung erkannt, die unabhängige Momentaufnahmen übersehen. Das ist besonders wertvoll für API-Definitionen, Compilerstufen und alternative Datenrepräsentationen.

## Endliche Nachweise sind keine Beweise {#finite-evidence-is-not-proof}

Ein erfolgreicher Test zeigt das Verhalten für die geprüften Eingaben und Implementierungen. Er beweist kein Gesetz für alle Werte.

Erhöhe die Sicherheit gezielt:

1.  Beispieltests
2.  wiederverwendbare Szenariotests
3.  generierte Eigenschaftstests
4.  erschöpfende Prüfungen über endliche Bereiche
5.  Modellvergleiche
6.  Beweisartefakte

Wähle das Niveau entsprechend dem Risiko und der Stärke der Behauptung.

## Testnamen sollten die Bedeutung nennen {#test-names-should-state-meaning}

Bevorzuge:

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

Vermeide Namen, die nur die Implementierung beschreiben:

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

Operationale Tests bleiben gültig, wenn die Operationsreihenfolge selbst spezifiziert ist. Benenne die Beobachtung, durch die diese Reihenfolge relevant wird.

## Prüfpunkte für das Review {#review-checks}

*   Hat jede neue semantische Operation ein gezieltes Gesetz oder eine Assertion?
*   Sind wiederverwendbare Anforderungen generisch über öffentliche Capabilities formuliert?
*   Sind Szenarien von konkreten Runnern getrennt?
*   Sind semantische Gesetze von Repräsentationsinvarianten unterschieden?
*   Werden mehrere Interpreter dort verglichen, wo es praktisch ist?
*   Vermeidet die Dokumentation, endliche Tests als Beweise zu bezeichnen?
