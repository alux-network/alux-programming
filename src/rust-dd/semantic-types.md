# Semantic types in Rust

```admonish tip title="Related"
The Semantic View: [Dependent types and proofs](../denotational-design/dependent-types.md), [Denotational Design](../denotational-design/design.md)  
Design by Meaning in Rust: [Capability algebras](capability-algebras.md), [First-order programs](first-order-programs.md), [Laws, scenarios, and evidence](laws.md)  
Concepts: [Referential transparency](../concepts/referential_transparency.md)
```

```admonish note title="Orientation"
Meaning-first Rust uses types to keep semantic structure visible. Associated types name carrier families, bounds state relationships between them, and extensions derive new operations from explicit premises. Laws still determine what every interpretation must preserve.
```

Several different roles are all spelled `type` in Rust. Keeping them distinct prevents meaning from collapsing into representation.

| Role | Example | What it says |
| --- | --- | --- |
| Semantic type | `Direction` | Which domain distinctions matter |
| Interpreter-selected carrier | `BranchAlg::Branch` | Which representation an interpreter chooses |
| Derived operation | `BranchExt::branch_child` | What follows from declared capabilities |
| Stage type | `Syntax`, `CoreProgram`, `Executable` | Which transformation a value has passed |
| Representation type | `BitBranch` | How one interpreter stores branch meaning |
| Evidence program | A scenario or reusable law extension | Which observations compatible interpreters must satisfy |

## Semantic types before representation

Suppose a branching domain distinguishes two directions:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction` names the distinction directly. One interpreter may encode a path compactly:

```rust,noplayground
struct BitBranch(Vec<bool>);
```

The booleans belong to that representation. They are not the definition of left and right, and another interpreter need not use them.

```admonish warning title="A compact encoding is not the semantic type"
Do not define domain behavior by bit positions, byte offsets, or machine branches. Those artifacts must encode the semantic distinctions; they do not own them.
```

This separation lets storage and execution layouts change without silently changing the domain.

## Associated types choose carriers

A capability algebra can leave its carrier to each interpreter:

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```

`Self::Branch` is not a hidden field type. It is the carrier chosen by an interpretation of branch meaning. A bit path, numeric tree position, symbolic term, or another representation can satisfy the same algebra.

For an interpreter `T`, the notation `T::Branch` can be read as a carrier family $\mathsf{Branch}(T)$. Changing the interpreter may change the carrier, while every operation remains indexed consistently by the same choice.

## Extensions derive consequences

An extension can construct a new operation from exactly the premises it needs:

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

The `where` clause is the premise: `This` interprets the branch algebra. The method is the consequence: for that interpreter's carrier, a branch and a direction determine a child branch.

$$
\bigl(T : \mathsf{BranchAlg}\bigr)
\Longrightarrow
\mathsf{branchChild}_T
  : \mathsf{Branch}(T) \times \mathsf{Direction}
  \to \mathsf{Branch}(T)
$$

Nothing in the derivation chooses a concrete branch representation. The result remains in the carrier family selected by the interpreter.

## Equality bounds state compatibility

Two capabilities sometimes need to agree on a carrier. An associated-type equality can state that requirement without selecting a concrete representation:

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

Read the bound as a local proposition: `Left` and `Right` interpret branch operations over the same carrier. Put this equality at the operation that needs the agreement rather than forcing it onto either algebra globally.

Such a bound is stronger and more precise than accepting one concrete context merely because it happens to contain both implementations.

## Stage types make compiler contracts visible

A compiler pipeline should not pass one undifferentiated tree through every phase. Distinct stage types state which transformation has occurred:

| Stage | Input | Output | Contract |
| --- | --- | --- | --- |
| Parse | Source text | `Syntax` | Recognizes surface grammar |
| Normalize | `Syntax` | `CoreProgram` | Produces the chosen core meaning |
| Code generation | `CoreProgram` | `Executable` | Preserves program observations in executable form |
| Runtime | `Executable` | Observable behavior | Interprets the executable consistently with the language model |

These types prevent accidental stage confusion, but their names alone do not prove preservation. The transformations still need stated laws, representative scenarios, and cross-interpreter evidence.

## Read the contract

The type-level structure admits a useful logical reading:

| Rust form | Reading |
| --- | --- |
| `This: BranchAlg` | `This` supplies an interpretation of branch meaning |
| `This::Branch` | The branch carrier is selected by `This` |
| `Right: BranchAlg<Branch = Left::Branch>` | Two interpretations agree on their carrier |
| `-> This::Branch` | The result remains in the selected carrier family |

This reading encourages APIs to expose what determines a type, which equalities composition requires, and which conclusions follow from those premises. Associated types, generic associated types, const generics, typestate, and zero-sized witnesses can all express parts of such contracts when the underlying distinction is real.

Do not manufacture type-level machinery merely to make an implementation look more formal. A type should expose meaning or preserve a necessary relationship, not decorate a representation.

## Types do not replace laws

A type signature constrains which programs can be formed. Laws constrain how their operations relate. Both are required.

For example, `BranchAlg::Branch` says that each interpreter chooses a branch carrier. It does not by itself establish that:

* the path from a branch to itself is empty
* replaying a root path reconstructs the branch
* opposite children are distinct

Those are semantic laws shared by compatible interpreters. Representation-specific claims—such as unused bits being zero—belong to the interpreter that chose that representation.

```admonish quote title="Read types as claims"
Ask what each type claims, what determines it, which laws complete it, and which interpreter realizes it.
```

## Review checks

* Does a domain distinction appear before its compact machine encoding?
* Is an associated type an interpreter-selected carrier rather than disguised concrete state?
* Do equality bounds state only the compatibility required at that use site?
* Do distinct compiler stages have distinct types and explicit contracts?
* Are semantic propositions separated from representation invariants?
* Are claims that Rust cannot express backed by reusable laws or scenarios?
