<!-- reader: {"title":"Leyes, escenarios y evidencia","sourceHash":"sha256:0e0b9c287cb808a9461b5c166cd42c27ed33514e8f6cafdbb803b8a6d2bdf1a5"} -->

# Leyes, escenarios y evidencia {#laws-scenarios-and-evidence}

```admonish tip title="Relacionado"
La perspectiva semántica: [Leyes e interpretaciones](../denotational-design/laws-and-interpretations.md)  
Diseño por significado en Rust: [Intérpretes y efectos](interpreters.md), [Álgebras de capacidades](capability-algebras.md)  
Conceptos: [Ramificación y confluencia](../concepts/branching.md), [Transparencia referencial](../concepts/referential_transparency.md)
```

```admonish note title="Orientación"
Los tests son evidencia para una especificación. Comprueba las observaciones públicas y las leyes que admite el dominio elegido, no los pasos privados de ejecución, y expresa esas leyes de forma genérica sobre la capacidad para que rijan todos los intérpretes.
```

El código centrado en el significado necesita tests centrados en el significado. Comprueba las observaciones públicas y las leyes, no los pasos privados de ejecución.

## Prueba la superficie de la especificación {#test-the-specification-surface}

````admonish warning title="Test acoplado a la representación"
Esta aserción accede a los campos de un portador, así que ningún otro intérprete puede reutilizarla:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

Test semántico:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

El primer test puede ser apropiado para un módulo de serialización cuyo objeto sea la codificación de bits. Es evidencia débil para el álgebra de ramificación, porque las representaciones alternativas no pueden compartirlo.

## Extensiones de leyes reutilizables {#reusable-law-extensions}

Cuando una propiedad se aplica a todos los intérpretes compatibles, escríbela una sola vez:

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

Todos los intérpretes ejecutan el mismo comprobador. `anyhow::Result` transporta el resultado; `bail!` informa de la observación ausente, mientras `ensure!` comprueba la ley de ida y vuelta. El comprobador distingue los dos fallos sin depender de una representación de ramificación concreta.

## Familias de leyes útiles {#useful-law-families}

Busca propiedades que ya sugiera la estructura semántica:

*   identidad
*   asociatividad
*   conmutatividad, cuando realmente se pretenda
*   idempotencia
*   ida y vuelta
*   canonización
*   refinamiento
*   monotonía
*   sustitución
*   acuerdo entre interpretaciones

```admonish warning title="Afirma solo las leyes que admite el dominio"
No añadas términos algebraicos conocidos solo porque suenen matemáticos. Enuncia únicamente las leyes que admite el dominio elegido.
```

## Leyes frente a invariantes de representación {#laws-versus-representation-invariants}

Manténlos diferenciados:

*   **Ley semántica:** reconstruir una rama a partir de su camino desde la raíz denota la misma rama.
    
*   **Invariante de representación:** los bits altos no utilizados son cero.
    
*   **Ley de serialización:**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **Ley de formato canónico:**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

Todas pueden ser importantes. Pertenecen a especificaciones distintas.

## Escenarios compartidos {#shared-scenarios}

Un escenario es una interacción reutilizable escrita contra capacidades públicas. El framework de pruebas de ALUX representa los escenarios así: el código autor construye un valor mediante las capacidades `Scenario`, `DeployerIds`, `PlayAst` y `ScenarioSchedule` sin nombrar un ejecutor concreto.

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

Cada llamada describe el significado definido por el autor, no los mecanismos del ejecutor. `under_comprehensive(100)` exige el registro esperado en una ejecución secuencial, 100 ejecuciones concurrentes sin restricciones y hasta 100 ejecuciones con permutaciones. El escenario fija la observación mientras el ejecutor varía el orden de ejecución.

El mismo principio se aplica entre intérpretes: si varios ejecutores implementan las capacidades que usa un escenario, cada uno puede interpretar la misma interacción escrita. La configuración específica del ejecutor y la inspección de límites quedan fuera del escenario.

## Concordancia entre intérpretes {#cross-interpreter-agreement}

Cuando dos intérpretes exponen la misma observación, compáralos:

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

Esto detecta desviaciones que pasan inadvertidas en instantáneas independientes. Resulta especialmente valioso para definiciones de API, fases del compilador y representaciones de datos alternativas.

## La evidencia finita no es una prueba {#finite-evidence-is-not-proof}

Un test aprobado demuestra el comportamiento para las entradas y las implementaciones probadas. No demuestra una ley para todos los valores.

Aumenta deliberadamente el nivel de garantía:

1.  tests de ejemplo
2.  tests de escenarios reutilizables
3.  tests de propiedades generados
4.  comprobaciones exhaustivas sobre dominios finitos
5.  comparación de modelos
6.  artefactos de prueba formal

Elige el nivel según el riesgo y la fuerza de la afirmación.

## Los nombres de los tests deben expresar significado {#test-names-should-state-meaning}

Prefiere:

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

Evita nombres que solo narren la implementación:

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

Los tests operacionales siguen siendo válidos cuando el orden de las operaciones está especificado. Nombra la observación que hace significativo ese orden.

## Comprobaciones de revisión {#review-checks}

*   ¿Cada operación semántica nueva tiene una ley o aserción específica?
*   ¿Las obligaciones reutilizables son genéricas respecto a las capacidades públicas?
*   ¿Los escenarios están separados de los ejecutores concretos?
*   ¿Se distinguen las leyes semánticas de los invariantes de representación?
*   ¿Se comparan varios intérpretes cuando es práctico?
*   ¿La documentación evita llamar pruebas a los tests finitos?
