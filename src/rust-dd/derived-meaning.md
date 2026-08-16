# Derived meaning and composition

```admonish tip title="Related"
The Semantic View: [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability algebras](capability-algebras.md), [Interpreters and effects](interpreters.md)  
Concepts: [Expression Problem](../concepts/expression-problem.md)
```

```admonish note title="Orientation"
Derived behavior belongs to the capabilities it uses, written once as an extension over those bounds, not to any concrete type that happens to implement them. The `where` clause is the honest statement of what a derivation depends on.
```

Primitive capabilities provide vocabulary. Most application behavior should be derived from that vocabulary once and shared by every interpreter.

## Extensions own derivations

Using the [`extend`](https://docs.rs/extend/latest/extend/) crate, branch operations can be derived independently of representation:

```rust,noplayground
use extend::ext;

#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(&self, branch: &This::Branch, direction: Direction) -> This::Branch {
        self.branch_grow(branch, direction)
    }

    fn branch_left(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Left)
    }

    fn branch_right(&self, branch: &This::Branch) -> This::Branch {
        self.branch_child(branch, Direction::Right)
    }

    fn branch_is_ancestor(&self, ancestor: &This::Branch, descendant: &This::Branch) -> bool {
        self.branch_path(ancestor, descendant).is_some()
    }
}
```

The `where` clause is the complete semantic dependency declaration: `BranchAlg`, and nothing more. No concrete branch type owns these definitions.

The macro only removes trait-and-impl boilerplate. An ordinary extension trait can express the same design. Denotational Design is in the semantic boundary and derivation, not in the attribute.

## Why not put it on the struct?

````admonish warning title="Do not weld derived meaning to the struct"
This is representation-first. If a numeric branch carrier is introduced, the derivation is copied or reimplemented, and the first concrete type has accidentally become the specification.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

Extensions reverse the ownership:

| Layer | Responsibility |
| --- | --- |
| Semantic capability | Owns derived meaning |
| Concrete type | Interprets primitive meaning |

## Compose with bounds

When one receiver interprets several capabilities, use direct bounds:

```rust,noplayground
#[ext(name = PublishCurrentExt)]
pub impl<This, Document, Error> This
where
    This: DocumentAlg<Document = Document> + PublishAlg<Document = Document, Error = Error>,
{
    async fn publish_current(&self) -> Result<(), Error> {
        self.publish(self.document_current()).await
    }
}
```

````admonish warning title="Do not bundle capabilities"
Do not create a supertrait merely to shorten the bound:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

The bundle hides which operation consumes which capabilities and creates another interface every interpreter must satisfy.
````

## Five different composition meanings

Choose the form that truthfully describes the relationship.

| Situation | Rust shape |
| --- | --- |
| One receiver interprets several capabilities | Direct bounds |
| A separate value selects behavior | Explicit policy parameter |
| Independent policies compose statically | Product or ordinary struct |
| An environment carries another interpreter | Small `HasX` projection |
| A wrapper substitutes for an inner interpreter | Delegation |

### Explicit policy

If a strategy is independently selected, pass it explicitly to the extension:

```rust,noplayground
#[ext(name = CandidateSelectExt)]
pub impl<This> This
where
    This: CandidateAlg,
{
    fn select_with<Policy>(&self, policy: &Policy) -> This::Candidate
    where
        Policy: SelectionPolicyAlg<Candidate = This::Candidate>,
    {
        policy.select(self.candidates())
    }
}
```

The extension owns the shared derivation, while the policy remains an independently selected input. It is not hidden in the environment or chosen by `Default`.

### Product of policies

Independent policies can be composed without inventing inheritance:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### Projection

A `HasClock` trait says only that an environment can project a separate clock value:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

An operation that reads time adds `This::Clock: ClockAlg` in its own `where` clause. The projection remains about containment; the consuming operation states the capability it needs. Use this pattern only when the separation is real. Do not introduce `HasX` merely to organize fields.

### Delegation

Delegation means a wrapper itself can substitute for the inner interpreter. This is appropriate for transparent newtypes, shared pointers, and adapters that preserve the whole capability contract.

Projection says “has.” Delegation says “is.” They are not interchangeable.

## Defaults are semantic decisions too

Mechanical empty states may implement `Default`. Domain policy should usually be explicit.

The useful cases often have an algebraic explanation: the default is the identity element for the type's natural composition. Appending an empty buffer, combining with an empty map, or accumulating zero diagnostics contributes nothing. When that composition is associative, the type and operation form a monoid, and `Default` can name its neutral element rather than choose a policy.

Good defaults:

* Empty buffer
* Empty map
* Zero accumulated diagnostics

Suspicious defaults:

* Quorum threshold
* Leader policy
* Retry semantics
* Confirmation depth
* Output format

This is the important distinction: a neutral element introduces no decision, while a quorum, leader strategy, or retry rule selects domain behavior. If changing a default changes domain meaning, compose the policy explicitly.

## Derived meaning should stay closed

An extension must use only its declared capabilities and explicit inputs. Direct field access, global state, and concrete downcasts make the `where` clause dishonest.

Review the body as if it were a proof of the dependency declaration:

```admonish question title="Test each derivation"
Could every operation in this body be justified from these bounds?
```

If not, either the bounds are incomplete or the code belongs at another layer.

## Review checks

* Is derived behavior defined once over capabilities?
* Does the extension avoid concrete fields and context types?
* Are direct bounds used for one interpreter?
* Are policies explicit values when independently selected?
* Do projection and delegation make truthful claims?
* Are domain defaults visible in composition?
