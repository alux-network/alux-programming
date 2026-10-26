<!-- reader: {"title":"Significado derivado y composición","sourceHash":"sha256:c7473063df63eb2d15fda98f9a500fae54294e9185911fd432265986a9f87f56"} -->

# Significado derivado y composición {#derived-meaning-and-composition}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](../denotational-design/design.md)  
Diseño por significado en Rust: [Álgebras de capacidades](capability-algebras.md), [Intérpretes y efectos](interpreters.md)  
Conceptos: [Problema de las expresiones](../concepts/expression-problem.md)
```

```admonish note title="Orientación"
El comportamiento derivado pertenece a las capacidades que utiliza: se escribe una sola vez como extensión sobre esas restricciones, no en cualquier tipo concreto que las implemente. La cláusula `where` expresa honestamente de qué depende una derivación.
```

Las capacidades primitivas proporcionan el vocabulario. La mayor parte del comportamiento de la aplicación debería derivarse una vez de ese vocabulario y compartirse entre todos los intérpretes.

## Las extensiones son dueñas de las derivaciones {#extensions-own-derivations}

Con el crate [`extend`](https://docs.rs/extend/latest/extend/), las operaciones de ramificación pueden derivarse independientemente de la representación:

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

La cláusula `where` es la declaración completa de dependencia semántica: `BranchAlg`, y nada más. Ningún tipo de rama concreto es dueño de estas definiciones.

El macro solo elimina el código repetitivo de trait e implementación. Un trait de extensión ordinario puede expresar el mismo diseño. El Diseño denotacional está en el límite semántico y en la derivación, no en el atributo.

## ¿Por qué no colocarlo en la estructura? {#why-not-put-it-on-the-struct}

````admonish warning title="No sueldes el significado derivado a la estructura"
Esto está centrado en la representación. Si se introduce un portador de ramificación numérico, la derivación se copia o se vuelve a implementar, y el primer tipo concreto se convierte accidentalmente en la especificación.

```rust,noplayground
impl BitBranchStore {
    // not recommended: derived branch meaning welded to one bit representation
    fn is_ancestor(&self, a: &BitBranch, b: &BitBranch) -> bool {
        // derived branch meaning mixed with bit storage
    }
}
```
````

Las extensiones invierten la propiedad:

| Capa | Responsabilidad |
| --- | --- |
| Capacidad semántica | Es dueña del significado derivado |
| Tipo concreto | Interpreta el significado primitivo |

## Componer con restricciones {#compose-with-bounds}

Cuando un mismo receptor interpreta varias capacidades, usa restricciones directas:

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

````admonish warning title="No agrupes las capacidades"
No crees un trait superior solo para acortar la restricción:

```rust,noplayground
trait AppContext: DocumentAlg + PublishAlg {}
```

El grupo oculta qué operación consume qué capacidades y crea otra interfaz que todos los intérpretes deben satisfacer.
````

## Cinco significados de composición distintos {#five-different-composition-meanings}

Elige la forma que describa fielmente la relación.

| Situación | Forma en Rust |
| --- | --- |
| Un receptor interpreta varias capacidades | Restricciones directas |
| Un valor independiente elige el comportamiento | Parámetro de política explícito |
| Las políticas independientes se componen estáticamente | Producto o estructura ordinaria |
| Un entorno contiene otro intérprete | Proyección `HasX` reducida |
| Un envoltorio sustituye a un intérprete interno | Delegación |

### Política explícita {#explicit-policy}

Si se elige una estrategia de manera independiente, pásala explícitamente a la extensión:

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

La extensión es dueña de la derivación compartida, mientras que la política sigue siendo una entrada elegida de forma independiente. No queda oculta en el entorno ni la elige `Default`.

### Producto de políticas {#product-of-policies}

Las políticas independientes pueden componerse sin inventar herencia:

```rust,noplayground
struct CompilePolicy<Optimize, Diagnostics> {
    optimize: Optimize,
    diagnostics: Diagnostics,
}
```

### Proyección {#projection}

Un trait `HasClock` solo expresa que un entorno puede proyectar un valor de reloj separado:

```rust,noplayground
trait HasClock {
    type Clock;

    fn clock(&self) -> &Self::Clock;
}
```

Una operación que lee la hora añade `This::Clock: ClockAlg` en su propia cláusula `where`. La proyección sigue tratando de contención; la operación consumidora declara la capacidad que necesita. Usa este patrón solo cuando la separación sea real. No introduzcas `HasX` simplemente para organizar campos.

### Delegación {#delegation}

Delegar significa que el propio envoltorio puede sustituir al intérprete interno. Es apropiado para newtypes transparentes, punteros compartidos y adaptadores que preservan el contrato completo de capacidad.

La proyección dice «tiene». La delegación dice «es». No son intercambiables.

## Los valores predeterminados también son decisiones semánticas {#defaults-are-semantic-decisions-too}

Los estados vacíos mecánicos pueden implementar `Default`. La política del dominio normalmente debería ser explícita.

Los casos útiles suelen tener una explicación algebraica: el valor predeterminado es el elemento identidad de la composición natural del tipo. Añadir un búfer vacío, combinar con un mapa vacío o acumular cero diagnósticos no aporta nada. Cuando esa composición es asociativa, el tipo y la operación forman un monoide, y `Default` puede nombrar su elemento neutro en lugar de elegir una política.

Buenos valores predeterminados:

*   Búfer vacío
*   Mapa vacío
*   Cero diagnósticos acumulados

Valores predeterminados sospechosos:

*   Umbral de quórum
*   Política de liderazgo
*   Semántica de reintentos
*   Profundidad de confirmación
*   Formato de salida

Esta es la distinción importante: un elemento neutro no introduce ninguna decisión, mientras que un quórum, una estrategia de liderazgo o una regla de reintento elige el comportamiento del dominio. Si cambiar un valor predeterminado cambia el significado del dominio, compón la política explícitamente.

## El significado derivado debe mantenerse cerrado {#derived-meaning-should-stay-closed}

Una extensión solo debe usar sus capacidades declaradas y entradas explícitas. El acceso directo a campos, el estado global y las conversiones descendentes a tipos concretos hacen deshonesta la cláusula `where`.

Revisa el cuerpo como si fuera una prueba de la declaración de dependencias:

```admonish question title="Prueba cada derivación"
¿Se puede justificar cada operación de este cuerpo a partir de estas restricciones?
```

Si no, las restricciones están incompletas o el código pertenece a otra capa.

## Comprobaciones de revisión {#review-checks}

*   ¿Se define una sola vez el comportamiento derivado sobre las capacidades?
*   ¿La extensión evita campos concretos y tipos de contexto?
*   ¿Se usan restricciones directas para un intérprete?
*   ¿Las políticas son valores explícitos cuando se eligen de forma independiente?
*   ¿La proyección y la delegación hacen afirmaciones veraces?
*   ¿Los valores predeterminados del dominio son visibles en la composición?
