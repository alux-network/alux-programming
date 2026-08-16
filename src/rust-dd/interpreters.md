# Interpreters and effects

```admonish tip title="Related"
The Semantic View: [Laws and interpretations](../denotational-design/laws-and-interpretations.md)  
Design by Meaning in Rust: [Capability algebras](capability-algebras.md), [Laws, scenarios, and evidence](laws.md)  
Concepts: [Free monad](../concepts/free_monad.md)  
Insights: [EVM algebra](../insights/evm-alg.md)
```

```admonish note title="Orientation"
An interpreter chooses a representation or effect for a capability. It realizes the primitive operations without redefining the domain behavior derived above it, so the same laws hold across every interpreter.
```

An interpreter realizes a semantic capability with a concrete representation or effect. It should choose machinery without redefining domain behavior.

## A thin interpreter

A bit-path representation of branches might be:

```rust,noplayground
#[derive(Clone, Debug, PartialEq, Eq)]
struct BitBranch(Vec<Direction>);

struct BitBranchImpl;

impl BranchAlg for BitBranchImpl {
    type Branch = BitBranch;

    fn branch_root(&self) -> Self::Branch {
        BitBranch(Vec::new())
    }

    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch {
        let mut grown = branch.0.clone();
        grown.push(direction);
        BitBranch(grown)
    }

    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>> {
        descendant.0.strip_prefix(&ancestor.0[..]).map(<[Direction]>::to_vec)
    }
}
```

The implementation stores and observes primitive facts. `branch_left`, `branch_right`, and `branch_is_ancestor` remain in the shared extension.

## Interpreters are boundary-relative

The same type can be an interpreter at one boundary and a semantic input at another.

| Boundary | Consumes | Interprets |
| --- | --- | --- |
| Filesystem adapter | Filesystem access | Source lookup |
| Normalizer environment | Source lookup as a primitive capability | Normalized-language construction |
| Compiler pipeline | Normalized terms | Executable construction |

There is no single universal “implementation layer.” There are nested semantic boundaries.

## Effects at the edge

Concrete interpreters own choices such as:

* database layout
* asynchronous runtime
* task ownership
* retry strategy
* HTTP or RPC framework types
* serialization
* locks and channels
* caching

Keep these choices out of semantic traits unless callers need to observe them.

For example, a semantic source capability can return a source value and error. Its production interpreter may cache files and perform asynchronous reads. A test interpreter may use an immutable map. Derived normalization logic should work with both.

## Runtime ownership

Framework callbacks often require owned, cloneable, thread-safe state. That is an interpreter constraint, not necessarily a domain constraint.

````admonish warning title="Keep framework carriers out of primitives"
Avoid polluting a primitive operation with framework carriers:

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

Prefer semantic application:

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

The web interpreter can choose `Arc<Context>`, extract request inputs, call `status`, and convert the result. Domain callers need not know that a web server exists.

## Neutral interpreters

Not every interpreter needs to execute effects.

A text interpreter for an API program can record:

| Method | Path | Input | Output |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

A metadata interpreter can construct documentation. A test interpreter can collect operation names. A production interpreter can build server routes.

Neutral interpreters demonstrate that the program carries meaning independently of one runtime.

## Adapters and delegation

Concrete wrappers often forward capabilities:

```rust,noplayground
struct Shared<T>(Arc<T>);
```

If `Shared<T>` truthfully behaves as the same interpreter as `T`, delegation is appropriate. If a larger environment merely stores `T` among unrelated services, projection is more honest.

Generated delegation removes boilerplate but does not establish semantic substitutability. Review the claim before applying the macro.

## Errors belong to a boundary

Errors should communicate failure meaning at the boundary that handles them.

| Error | Boundary translation |
| --- | --- |
| Domain error | Transport interpreter maps it to a protocol response |
| Parse error | Compiler front end maps it to a diagnostic |
| Storage error | Source interpreter maps it to a semantic source failure |

Do not force HTTP status codes, RPC error objects, or database errors into primitive domain traits. Translate them at interpreter boundaries.

## Performance is an interpretation concern until observed

Batching, parallelism, caching, and data layout usually belong to interpreters. They become semantic only when the specification promises observable ordering, timing, resource use, fairness, or failure behavior.

This separation allows optimization without semantic drift:

* Same laws
* Same declared observations
* Different operational strategy

## Review checks

* Does the interpreter implement primitives rather than duplicate derivations?
* Are runtime and framework constraints confined to the consuming boundary?
* Could a neutral or test interpreter implement the same capability?
* Are transport and storage errors translated at the edge?
* Is delegation semantically truthful?
* Are performance differences unobservable under the stated denotation?
