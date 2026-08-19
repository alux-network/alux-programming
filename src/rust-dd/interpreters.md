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

## Composing interpreters by delegation

Because meaning lives in small capability traits, an interpreter is usually *assembled* rather than written out. A carrier gains a capability by delegating to whatever already provides it, so the forwarding is generated, not hand-written. Two forms cover almost everything.

**Forward a capability to a field.** ambassador's `#[derive(Delegate)]` forwards a whole trait to an inner value. A carrier that holds several components delegates each capability to the field that owns it, with no forwarding bodies:

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

**Grant a capability through a getter.** Give a type one getter, and a blanket impl supplies the whole capability to every type that has that getter:

```rust,noplayground
trait Logger {
    fn log(&self, message: &str);
}

trait HasLogger {
    type Logger;

    fn logger(&self) -> &Self::Logger;
}

// Any carrier that can hand back a logger is itself a `Logger`.
impl<T> Logger for T
where
    T: HasLogger,
    T::Logger: Logger,
{
    fn log(&self, message: &str) {
        self.logger().log(message)
    }
}
```

The consequence is that many structs never need to exist. A monolithic context object — one large trait carrying several associated types and a dozen methods, plus its single concrete implementation — becomes a handful of small capability traits and a thin carrier that delegates each to the field or getter that provides it. Derived operations, such as checking whether a deadline has passed, are written once as extensions over the primitives rather than re-implemented on each carrier.

```admonish warning title="Delegation forwards operations, not meaning"
Generated delegation removes boilerplate but does not establish semantic substitutability. A `derive` macro such as ambassador's `#[derive(Delegate)]` proves the impls compile, not that the carrier denotes the same interpreter. If `Shared<T>(Arc<T>)` is to stand in for `T`, check the laws on the carrier — a wrapper that changes sharing or identity (`Arc`, pooling, caching) can forward every method correctly and still break a freshness or uniqueness law. When the carrier merely stores `T` among unrelated services, projection is more honest than delegation.
```

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
