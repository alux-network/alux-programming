# Laws, scenarios, and evidence

```admonish tip title="Related"
The Semantic View: [Laws and interpretations](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Interpreters and effects](interpreters.md), [Capability algebras](capability-algebras.md)  
Concepts: [Branching and confluence](../concepts/branching.md), [Referential transparency](../concepts/referential_transparency.md)
```

```admonish note title="Orientation"
Tests are evidence for a specification. Assert the public observations and the laws the chosen domain supports, not private execution steps, and keep those laws generic over the capability so every interpreter is held to them.
```

Meaning-first code needs meaning-first tests. Test public observations and laws rather than private execution steps.

## Test the specification surface

````admonish warning title="Representation-coupled test"
This assertion reaches into one carrier's fields, so no other interpreter can share it:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

Semantic test:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

The first test may be appropriate for a serialization module whose subject is the bit encoding. It is weak evidence for the branch algebra because alternative representations cannot share it.

## Reusable law extensions

When a property applies to every compatible interpreter, write it once:

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

Every interpreter runs the same checker. `anyhow::Result` carries the outcome; `bail!` reports the missing observation, while `ensure!` checks the round-trip law. The checker distinguishes the two failures without depending on one branch representation.

## Useful law families

Look for properties already suggested by the semantic structure:

* identity
* associativity
* commutativity, when genuinely intended
* idempotence
* round-trip
* canonicalization
* refinement
* monotonicity
* substitution
* interpretation agreement

```admonish warning title="Only claim laws the domain supports"
Do not add familiar algebraic words merely because they sound mathematical. State only laws the chosen domain supports.
```

## Laws versus representation invariants

Keep these distinct:

* **Semantic law:** reconstructing a branch from its root path denotes the same branch.
* **Representation invariant:** unused high bits are zero.
* **Serialization law:**

  $$
  \operatorname{decode}(\operatorname{encode}(b)) = b
  $$

* **Canonical-format law:**

  $$
  \operatorname{encode}(\operatorname{decode}(x)) = x
  \qquad \text{for canonical byte sequences }x
  $$

All may be important. They belong to different specifications.

## Shared scenarios

A scenario is a reusable interaction written against public capabilities. The ALUX test framework represents scenarios this way: authoring code builds a value through `Scenario`, `DeployerIds`, `PlayAst`, and `ScenarioSchedule` capabilities without naming a concrete runner.

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

Every call describes authored meaning rather than runner machinery. `under_comprehensive(100)` requires the expected log under one sequential run, 100 freely concurrent runs, and up to 100 permuted runs. The scenario fixes the observation while the runner varies execution order.

The same principle applies across interpreters: when several runners implement the capabilities used by a scenario, each can interpret the same authored interaction. Runner-specific setup and boundary inspection remain outside the scenario.

## Cross-interpreter agreement

When two interpreters expose the same observation, compare them:

$$
\operatorname{interpret\_text}(p).\mathit{route\_names}
=
\operatorname{interpret\_server}(p).\mathit{registered\_route\_names}
$$

This catches drift that independent snapshots miss. It is particularly valuable for API definitions, compiler stages, and alternate data representations.

## Finite evidence is not proof

A passing test demonstrates behavior for tested inputs and implementations. It does not prove a law for all values.

Increase assurance deliberately:

1. example tests
2. reusable scenario tests
3. generated property tests
4. exhaustive checks over finite domains
5. model comparison
6. proof artifacts

Choose the level according to risk and claim strength.

## Test names should state meaning

Prefer:

* `reconstructs_every_generated_branch_from_its_root_path`
* `preserves_child_programs_when_routes_are_merged`
* `normalization_is_invariant_under_alpha_renaming`

Avoid names that only narrate implementation:

* `pushes_three_bits`
* `calls_helper_twice`
* `visits_left_node_first`

Operational tests remain valid when operation order is itself specified. Name the observation that makes the order meaningful.

## Review checks

* Does every new semantic operation have a focused law or assertion?
* Are reusable obligations generic over public capabilities?
* Are scenarios separated from concrete runners?
* Are semantic laws distinguished from representation invariants?
* Are multiple interpreters compared where practical?
* Does documentation avoid calling finite tests proofs?
