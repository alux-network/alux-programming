# First-order programs

```admonish tip title="Related"
Design by Meaning in Rust: [Derived meaning and composition](derived-meaning.md), [Language and compiler pipelines](compiler-pipelines.md)  
Concepts: [Continuation-passing style](../concepts/cps.md), [Defunctionalization](../concepts/defunctionalization.md), [Free monad](../concepts/free_monad.md)  
Insights: [Expression Problem reloaded](../insights/expression-problem.md)
```

```admonish note title="When to reify application"
Ordinary functions and extensions already express derived behavior. Turn application into first-order data only when another interpreter must inspect, compose, serialize, or compile a program before running it.
```

Ordinary functions and extension methods are usually the best way to express derived behavior. Sometimes another interpreter must inspect, combine, document, serialize, or compile the structure of a program before applying it. Then application itself must become first-order data.

## Execution erases structure

Consider:

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

Calling this method yields a status. After the call begins, an external interpreter cannot generally recover:

* the semantic context type
* the ordered arguments
* source argument names
* the result type
* the identity of the operation

That information was present in the source-level function type, but ordinary execution consumes it.

## Defunctionalizing application

Defunctionalization replaces a member of a known family of functions with a first-order tag and a shared application operation.

A minimal operation vocabulary is:

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

A zero-sized `CurrentStatusOperation<App>` can denote application of the original extension method. It should invoke that method, not contain a second copy of its body.

1. Begin with the extension method.
2. Reify it as an operation type.
3. Preserve its context, argument product, argument names, and output.
4. Interpret it through `ApplyAlg`.

The method remains ergonomic for normal calls. The operation value exists for contexts that require first-order structure.

## Do not reify without a consumer

First-order programs add type machinery. Use them when they enable a real second interpretation:

* runtime registration
* documentation or schema generation
* static inspection
* program composition before execution
* serialization
* compilation

If code only needs to call a function, keep the function.

## Portable interface programs

Suppose an HTTP surface contains:

| Method | Path | Input | Operation | Output |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | Body: `f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | Streamed file |

A portable program must preserve:

* method and path selectors
* input roles such as path, query, body, header, and authentication
* the operation value
* output role such as JSON or file
* route merge and nesting

It should not preserve a particular framework request, router, or response type.

One fluent notation might be:

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

The fluent calls construct a typed program. They do not have to register a server route immediately.

## One program, several folds

The same first-order program can support several interpretations:

| Program | Interpretations |
| --- | --- |
| Typed HTTP program | Text documentation, executable routes, OpenAPI metadata, client bindings, conformance tests |
| Typed JSON-RPC program | Method registry, schema, client, test harness |

Do not maintain separate route or method lists for execution and documentation. That creates competing specifications.

## Input and output roles

The operation already knows its argument and result types. A transport declaration should add only transport meaning.

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`, `query`, and `json` identify roles. They should not force the author to restate an output type already determined by `ApplyAlg`.

Output conversion belongs to the transport interpreter. A server may convert one result to JSON and another to a streamed attachment. The semantic operations remain unaware of either representation.

## Composition is program meaning

Programs should preserve general composition:

* Empty program
* Merge programs
* Nest a program under a prefix
* Lift an endpoint into a program

These are more fundamental than one framework's router methods. Familiar fluent names such as `get`, `post`, `merge`, and `nest` can be aliases over the neutral algebra.

Independent specifications can publish small programs:

| Input programs | Composition | Result |
| --- | --- | --- |
| Status and download programs | Merge | Service program |
| Catalog program | Nest | Service program |

An application selects and interprets the resulting composition.

## Macros must lower to public meaning

Rust macros can make first-order declarations pleasant:

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

The macro is healthy only when it lowers to a public, manually constructible first-order program. Generated callbacks must not become the sole definition of the interface.

Good direction:

1. Convenient syntax
2. Public operation and program values
3. Generic fold
4. Concrete framework

Representation-first direction:

1. Framework annotation
2. Opaque generated callbacks
3. Reverse-engineered documentation

## Relation to existing concepts

First-order interface programs build on techniques from other chapters: defunctionalization is the general transformation, extensible syntax and interpretations are the Expression Problem, and a free monad is one particular syntax-with-sequencing representation. The Related links at the top of the page lead to each.

Do not identify these techniques with DD itself. DD determines what structure matters; first-order representations preserve that structure when ordinary calls would erase it.

## Review checks

* Is reification required by a real second interpreter?
* Does the operation invoke the authored method rather than duplicate it?
* Are arguments and output inferred from the operation?
* Does transport syntax add only transport roles?
* Can the program be constructed without its convenience macro?
* Do runtime and metadata interpret the same program?
