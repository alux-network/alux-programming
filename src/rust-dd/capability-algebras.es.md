<!-- reader: {"title":"Álgebras de capacidades","sourceHash":"sha256:0c3fefabad08ae4d7f39d28d5855e2983e2c46d3acba947e186a304d1e91139e"} -->

# Álgebras de capacidades {#capability-algebras}

![Design by meaning in Rust — building software from small capability traits](/design-by-meaning-rust.png)

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](../denotational-design/design.md), [Denotaciones y composicionalidad](../denotational-design/denotations.md)  
Diseño por significado en Rust: [Tipos semánticos en Rust](semantic-types.md), [Significado derivado y composición](derived-meaning.md)  
Conceptos: [Bài toán expresión](../concepts/expression-problem.md), [Ramificación y confluencia](../concepts/branching.md)
```

```admonish note title="Orientación"
Un trait de capacidad es un álgebra pequeña: nombra las observaciones y transformaciones primitivas que requiere un significado y deja la representación en manos del intérprete. Diseña el vocabulario desde el significado, no desde los campos que casualmente guarda la primera implementación.
```

Rust no tiene una construcción integrada llamada «Diseño denotacional». Codificamos vocabularios semánticos con funciones ordinarias del lenguaje. Los traits de capacidad pequeños son una codificación útil.

El sufijo `Alg` en este libro significa **álgebra**: un conjunto coherente de operaciones primitivas sobre portadores elegidos por el intérprete.

## Empieza por el significado {#start-from-meaning}

El significado de posición de ramificación de la parte anterior puede expresarse así:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Direction {
    Left,
    Right,
}

pub trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(&self, ancestor: &Self::Branch, descendant: &Self::Branch) -> Option<Vec<Direction>>;
}
```

El trait expresa tres significados primitivos:

*   construir la posición raíz
*   extender una rama en una dirección
*   observar el camino relativo cuando exista

No revela dónde se almacenan las ramas ni cómo se codifican los caminos.

## Las capacidades no son proyecciones de campos {#capabilities-are-not-field-projections}

````admonish warning title="Las proyecciones de campos no son capacidades semánticas"
Compara:

```rust,noplayground
trait BranchContext {
    fn branches(&self) -> &Vec<Vec<bool>>;
    fn branches_mut(&mut self) -> &mut Vec<Vec<bool>>;
}
```

Este trait oculta una estructura detrás de métodos, pero sigue exponiendo su representación. Cualquier lógica derivada queda acoplada a vectores, booleanos, propiedad y estrategia de mutación.
````

Una capacidad semántica expone la observación o transformación que requiere el significado posterior. Pregunta:

```admonish question title="Qué preguntar sobre cada capacidad"
Si la implementación usara una base de datos, un término simbólico, un entero compacto o un servicio remoto, ¿seguiría teniendo sentido esta operación?
```

Si la respuesta es sí, la operación puede pertenecer a la capacidad. Si los llamadores necesitan la disposición actual de los campos, probablemente no.

## Un significado primitivo por trait {#one-primitive-meaning-per-trait}

Los traits pequeños hacen visibles las dependencias:

```rust,noplayground
pub trait ClockAlg {
    type Instant;

    fn clock_now(&self) -> Self::Instant;
}

pub trait DeadlineAlg<Instant> {
    fn deadline_expired(&self, now: &Instant) -> bool;
}
```

Una operación derivada que necesite la hora y una fecha límite puede exigir ambos traits. No necesita un `ApplicationContext` que reúna registro, almacenamiento, redes, configuración y planificación.

«Pequeño» no significa limitar mecánicamente a un método. Agrupa operaciones cuando formen una estructura semántica inseparable. Sepáralas si expresan significados independientes o admiten intérpretes independientes.

## Los tipos asociados eligen portadores {#associated-types-select-carriers}

Usa tipos asociados cuando el intérprete elige la representación:

```rust,noplayground
pub trait SourceAlg {
    type Source;
    type Error;

    fn source_read(&self, name: &str) -> Result<Self::Source, Self::Error>;
}
```

No exijas `String`, `std::io::Error` ni un árbol de sintaxis concreto, salvo que formen parte de un vocabulario semántico estable en este límite.

A la inversa, los valores semánticos concretos son perfectamente válidos:

```rust,noplayground
pub enum Severity {
    Warning,
    Error,
}
```

La regla no es «haz abstractos todos los tipos», sino «no confundas los mecanismos del intérprete con el vocabulario semántico».

## Coloca las restricciones donde se usan {#put-bounds-where-they-are-used}

Mantén una primitiva libre de restricciones que no necesita:

```rust,noplayground
pub trait CandidateAlg {
    type Candidate;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

````admonish warning title="No añadas restricciones preventivas"
No restrinjas el tipo asociado solo porque un algoritmo futuro quizá lo necesite:

```rust,noplayground
pub trait CandidateAlg {
    // not recommended: every interpreter now pays for bounds
    // most operations never use
    type Candidate: Clone + Ord + Hash + Send + Sync;

    fn candidates(&self) -> impl Iterator<Item = Self::Candidate>;
}
```

La operación que ordena candidatos puede requerir `Ord`; la que los coloca en un conjunto hash puede requerir `Hash`.
````

Las restricciones en el sitio de uso mantienen reutilizables los significados primitivos y revelan el contrato real del comportamiento derivado.

## Los efectos pueden ser significados primitivos {#effects-can-be-primitive-meaning}

Los traits de capacidad no implican ejecución pura:

```rust,noplayground
pub trait PublishAlg {
    type Document;
    type Error;

    async fn publish(&self, document: Self::Document) -> Result<(), Self::Error>;
}
```

Publicar es un efecto. Aun así, puede ser una operación semántica primitiva en el límite actual. El intérprete concreto puede usar HTTP, una cola, un archivo o un búfer de prueba.

La capa semántica no debería prescribir reintentos, propiedad de sockets, creación de tareas o grupos de conexiones, a menos que esas distinciones formen parte del significado previsto.

## Nombrar el límite {#naming-the-boundary}

Las capacidades deben formularse desde la perspectiva semántica del consumidor:

| Orientado al significado | Orientado a la representación |
| --- | --- |
| `closed_outcome(slot)` | `get_runtime_map(slot)` |
| `source_read(name)` | `compiler_context().sources().lookup(name)` |
| `branch_path(ancestor, descendant)` | `raw_branch_bits(id)` |

Nombrar forma parte del diseño. Un nombre mecánico invita al acoplamiento mecánico.

## Comprobaciones de revisión {#review-checks}

*   ¿El trait expone un significado primitivo coherente?
*   ¿Podría implementarlo un intérprete independiente sin copiar la primera representación?
*   ¿Los tipos asociados son abstractos solo cuando el intérprete realmente puede elegirlos?
*   ¿Los tipos concretos forman un vocabulario semántico estable?
*   ¿Las restricciones están ausentes hasta que una operación las utiliza?
*   ¿El trait evita devolver gestores, contextos y almacenamiento sin procesar?
