<!-- reader: {"title":"Intérpretes y efectos"} -->

# Intérpretes y efectos {#interpreters-and-effects}

```admonish tip title="Relacionado"
La perspectiva semántica: [Leyes e interpretaciones](../denotational-design/laws-and-interpretations.md)  
Diseño por significado en Rust: [Álgebras de capacidades](capability-algebras.md), [Leyes, escenarios y evidencia](laws.md)  
Conceptos: [Mónada libre](../concepts/free_monad.md)  
Perspectivas: [Álgebra de EVM](../insights/evm-alg.md)
```

```admonish note title="Orientación"
Un intérprete elige una representación o efecto para una capacidad. Realiza las operaciones primitivas sin redefinir el comportamiento del dominio derivado por encima de ella, de modo que se mantienen las mismas leyes en todos los intérpretes.
```

Un intérprete realiza una capacidad semántica mediante una representación o efecto concreto. Debe elegir los mecanismos sin redefinir el comportamiento del dominio.

## Un intérprete ligero {#a-thin-interpreter}

Una representación de ramas mediante rutas de bits podría ser:

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

La implementación almacena y observa hechos primitivos. `branch_left`, `branch_right` y `branch_is_ancestor` siguen en la extensión compartida.

## Los intérpretes son relativos al límite {#interpreters-are-boundary-relative}

El mismo tipo puede ser un intérprete en un límite y una entrada semántica en otro.

| Límite | Consume | Interpreta |
| --- | --- | --- |
| Adaptador del sistema de archivos | Acceso al sistema de archivos | Búsqueda de código fuente |
| Entorno de normalización | Búsqueda de código fuente como capacidad primitiva | Construcción del lenguaje normalizado |
| Canalización del compilador | Términos normalizados | Construcción del ejecutable |

No existe una única «capa de implementación» universal. Hay límites semánticos anidados.

## Efectos en el borde {#effects-at-the-edge}

Los intérpretes concretos son dueños de elecciones como:

*   disposición de base de datos
*   entorno de ejecución asíncrono
*   propiedad de tareas
*   estrategia de reintentos
*   tipos del framework HTTP o RPC
*   serialización
*   bloqueos y canales
*   caché

Mantén estas elecciones fuera de los traits semánticos, a menos que los llamadores necesiten observarlas.

Por ejemplo, una capacidad semántica de fuente puede devolver un valor de código fuente y un error. Su intérprete de producción puede almacenar archivos en caché y realizar lecturas asíncronas. Un intérprete de pruebas puede usar un mapa inmutable. La lógica de normalización derivada debería funcionar con ambos.

## Propiedad del entorno de ejecución {#runtime-ownership}

Los callbacks de un framework suelen exigir un estado propio, clonable y seguro entre hilos. Esa es una restricción del intérprete, no necesariamente del dominio.

````admonish warning title="Mantén los portadores del framework fuera de las primitivas"
Evita contaminar una operación primitiva con portadores del framework:

```rust,noplayground
async fn status(data: FrameworkData<Arc<AppState>>) -> FrameworkJson<Status>;
```
````

Prefiere la aplicación semántica:

```rust,noplayground
trait StatusAlg {
    type Status;

    async fn status(&self) -> Self::Status;
}
```

El intérprete web puede elegir `Arc<Context>`, extraer las entradas de la petición, llamar a `status` y convertir el resultado. Los llamadores del dominio no necesitan saber que existe un servidor web.

## Intérpretes neutrales {#neutral-interpreters}

No todos los intérpretes necesitan ejecutar efectos.

Un intérprete textual para un programa de API puede registrar:

| Método | Ruta | Entrada | Salida |
| --- | --- | --- | --- |
| `GET` | `/status` | — | JSON `Status` |
| `POST` | `/temperature` | JSON `f32` | JSON `Status` |

Un intérprete de metadatos puede generar documentación. Uno de pruebas puede recopilar nombres de operaciones. Uno de producción puede construir rutas de servidor.

Los intérpretes neutrales demuestran que el programa porta significado independientemente de un entorno de ejecución concreto.

## Componer intérpretes mediante delegación {#composing-interpreters-by-delegation}

Como el significado reside en traits de capacidad pequeños, un intérprete suele *ensamblarse* en vez de escribirse por completo. Un portador adquiere una capacidad delegando en quien ya la proporciona; así, el reenvío se genera en lugar de escribirse a mano. Dos formas cubren casi todos los casos.

**Reenvía una capacidad a un campo.** La macro `#[derive(Delegate)]` de ambassador reenvía un trait completo a un valor interno. Un portador que contiene varios componentes delega cada capacidad al campo que la posee, sin cuerpos de reenvío:

```rust,noplayground
#[derive(Delegate)]
#[delegate(Clock, target = "clock")]
#[delegate(Logger, target = "logger")]
struct Service {
    clock: SystemClock,
    logger: StdoutLogger,
}
```

**Concede una capacidad mediante un getter.** Proporciona un getter a un tipo y una implementación general concederá toda la capacidad a cada tipo que tenga ese getter:

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

La consecuencia es que muchos structs ni siquiera necesitan existir. Un objeto de contexto monolítico —un trait grande con varios tipos asociados y una docena de métodos, además de su única implementación concreta— se convierte en un puñado de traits de capacidad pequeños y un portador ligero que delega cada uno al campo o getter que lo proporciona. Las operaciones derivadas, como comprobar si ha vencido un plazo, se escriben una vez como extensiones de las primitivas, en lugar de volver a implementarse en cada portador.

```admonish warning title="La delegación reenvía operaciones, no significado"
La delegación generada elimina código repetitivo, pero no establece la sustituibilidad semántica. Un macro `derive` como `#[derive(Delegate)]` de ambassador demuestra que las implementaciones compilan, no que el portador denote el mismo intérprete. Si `Shared<T>(Arc<T>)` debe sustituir a `T`, comprueba las leyes en el portador: un envoltorio que cambia la compartición o identidad (`Arc`, agrupación, caché) puede reenviar todos los métodos correctamente y aun así infringir una ley de frescura o unicidad. Si el portador solo almacena `T` junto a servicios no relacionados, la proyección es más honesta que la delegación.
```

## Los errores pertenecen a un límite {#errors-belong-to-a-boundary}

Los errores deben comunicar el significado del fallo en el límite que los gestiona.

| Error | Traducción en el límite |
| --- | --- |
| Error del dominio | El intérprete de transporte lo convierte en una respuesta del protocolo |
| Error de análisis sintáctico | El front-end del compilador lo convierte en un diagnóstico |
| Error de almacenamiento | El intérprete de fuente lo convierte en un fallo semántico de fuente |

No fuerces códigos de estado HTTP, objetos de error RPC ni errores de base de datos dentro de traits primitivos del dominio. Tradúcelos en los límites de los intérpretes.

## El rendimiento es una cuestión de interpretación hasta que se observa {#performance-is-an-interpretation-concern-until-observed}

El procesamiento por lotes, el paralelismo, la caché y la disposición de datos suelen pertenecer a los intérpretes. Solo se vuelven semánticos cuando la especificación promete orden, temporización, uso de recursos, equidad o comportamiento ante fallos observables.

Esta separación permite optimizar sin desviación semántica:

*   Mismas leyes
*   Mismas observaciones declaradas
*   Distinta estrategia operacional

## Comprobaciones de revisión {#review-checks}

*   ¿El intérprete implementa las primitivas en lugar de duplicar las derivaciones?
*   ¿Las restricciones del entorno de ejecución y del framework quedan confinadas al límite consumidor?
*   ¿Podría un intérprete neutral o de pruebas implementar la misma capacidad?
*   ¿Los errores de transporte y almacenamiento se traducen en el borde?
*   ¿La delegación es veraz semánticamente?
*   ¿Las diferencias de rendimiento son inobservables según la denotación declarada?
