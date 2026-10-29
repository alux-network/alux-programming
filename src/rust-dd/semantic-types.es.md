<!-- reader: {"title":"Tipos semánticos en Rust","sourceHash":"sha256:f260bada57ff228ad424bf6ea7f98dc225853e8a47e5611be37891f06f97e8af"} -->

# Tipos semánticos en Rust {#semantic-types-in-rust}

```admonish tip title="Relacionado"
La perspectiva semántica: [Tipos dependientes y pruebas](../denotational-design/dependent-types.md), [Diseño denotacional](../denotational-design/design.md)  
Diseño por significado en Rust: [Álgebras de capacidades](capability-algebras.md), [Programas de primer orden](first-order-programs.md), [Leyes, escenarios y evidencia](laws.md)  
Conceptos: [Transparencia referencial](../concepts/referential_transparency.md)
```

```admonish note title="Orientación"
Rust centrado en el significado usa tipos para mantener visible la estructura semántica. Los tipos asociados nombran familias de portadores, las restricciones expresan relaciones entre ellas y las extensiones derivan operaciones nuevas de premisas explícitas. Las leyes siguen determinando qué debe preservar toda interpretación.
```

En Rust, varios roles distintos se escriben igual: `type`. Mantenerlos diferenciados evita que el significado se reduzca a la representación.

| Rol | Ejemplo | Qué expresa |
| --- | --- | --- |
| Tipo semántico | `Direction` | Qué distinciones del dominio importan |
| Portador elegido por el intérprete | `BranchAlg::Branch` | Qué representación elige el intérprete |
| Operación derivada | `BranchExt::branch_child` | Qué se deduce de las capacidades declaradas |
| Tipo de fase | `Syntax`, `CoreProgram`, `Executable` | Qué transformación ha atravesado un valor |
| Tipo de representación | `BitBranch` | Cómo almacena un intérprete el significado de ramificación |
| Programa de evidencia | Un escenario o una extensión de ley reutilizable | Qué observaciones deben satisfacer los intérpretes compatibles |

## Tipos semánticos antes que representación {#semantic-types-before-representation}

Supongamos que un dominio de ramificación distingue dos direcciones:

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction` nombra directamente la distinción. Un intérprete puede codificar el camino de forma compacta:

```rust,noplayground
struct BitBranch(Vec<bool>);
```

Los valores booleanos pertenecen a esa representación. No definen izquierda y derecha, y otro intérprete no tiene por qué usarlos.

```admonish warning title="Una codificación compacta no es el tipo semántico"
No definas el comportamiento del dominio mediante posiciones de bits, desplazamientos de bytes o ramas de máquina. Esos artefactos deben codificar las distinciones semánticas, no apropiarse de ellas.
```

Esta separación permite cambiar la disposición del almacenamiento y la ejecución sin alterar silenciosamente el dominio.

## Los tipos asociados eligen portadores {#associated-types-choose-carriers}

Un álgebra de capacidades puede dejar el portador en manos de cada intérprete:

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

`Self::Branch` no es un tipo de campo oculto, sino el portador que elige una interpretación del significado de ramificación. Una ruta de bits, una posición numérica en un árbol, un término simbólico u otra representación pueden satisfacer la misma álgebra.

Para un intérprete `T`, la notación `T::Branch` puede leerse como una familia de portadores $\mathsf{Branch}(T)$. Cambiar de intérprete puede cambiar el portador, mientras que todas las operaciones siguen indexadas coherentemente con la misma elección.

## Las extensiones derivan consecuencias {#extensions-derive-consequences}

Una extensión puede construir una operación nueva a partir de exactamente las premisas que necesita:

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

La cláusula `where` es la premisa: `This` interpreta el álgebra de ramificación. El método es la consecuencia: para el portador de ese intérprete, una rama y una dirección determinan una rama hija.

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

La derivación no elige ninguna representación concreta de rama. El resultado permanece en la familia de portadores elegida por el intérprete.

## Las restricciones de igualdad expresan compatibilidad {#equality-bounds-state-compatibility}

A veces dos capacidades deben coincidir en un portador. Una igualdad de tipo asociado puede expresar ese requisito sin elegir una representación concreta:

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

Lee la restricción como una proposición local: `Left` y `Right` interpretan operaciones de ramificación sobre el mismo portador. Coloca esta igualdad en la operación que necesita la concordancia, en vez de imponerla globalmente a cualquiera de las dos álgebras.

Esta restricción es más fuerte y precisa que aceptar un contexto concreto solo porque contiene ambas implementaciones.

## Los tipos de fase hacen visibles los contratos del compilador {#stage-types-make-compiler-contracts-visible}

Una canalización de compilación no debería pasar el mismo árbol indiferenciado por todas las fases. Los tipos de fase distintos indican qué transformación se ha producido:

| Fase | Entrada | Salida | Contrato |
| --- | --- | --- | --- |
| Análisis sintáctico | Texto fuente | `Syntax` | Reconoce la gramática superficial |
| Normalización | `Syntax` | `CoreProgram` | Produce el significado central elegido |
| Generación de código | `CoreProgram` | `Executable` | Preserva las observaciones del programa en la forma ejecutable |
| Entorno de ejecución | `Executable` | Comportamiento observable | Interpreta el ejecutable de forma coherente con el modelo del lenguaje |

Estos tipos evitan confusiones accidentales entre fases, pero sus nombres por sí solos no demuestran que se preserve el significado. Las transformaciones siguen necesitando leyes explícitas, escenarios representativos y evidencia entre intérpretes.

## Lee el contrato {#read-the-contract}

La estructura a nivel de tipos permite una lectura lógica útil:

| Forma de Rust | Lectura |
| --- | --- |
| `This: BranchAlg` | `This` proporciona una interpretación del significado de ramificación |
| `This::Branch` | El portador de ramificación lo elige `This` |
| `Right: BranchAlg<Branch = Left::Branch>` | Dos interpretaciones coinciden en el portador |
| `-> This::Branch` | El resultado permanece en la familia de portadores seleccionada |

Esta lectura anima a las API a exponer qué determina un tipo, qué igualdades requiere la composición y qué conclusiones se siguen de esas premisas. Los tipos asociados, los tipos asociados genéricos, los genéricos constantes, typestate y los testigos de tamaño cero pueden expresar partes de estos contratos cuando la distinción subyacente es real.

No fabriques mecanismos a nivel de tipos solo para que una implementación parezca más formal. Un tipo debe exponer significado o preservar una relación necesaria, no adornar una representación.

## Los tipos no sustituyen a las leyes {#types-do-not-replace-laws}

Una firma de tipo restringe qué programas pueden formarse. Las leyes restringen cómo se relacionan sus operaciones. Se necesitan ambas cosas.

Por ejemplo, `BranchAlg::Branch` indica que cada intérprete elige un portador de ramificación. Por sí solo no establece que:

*   el camino de una rama a sí misma esté vacío
*   reproducir un camino desde la raíz reconstruya la rama
*   los hijos opuestos sean distintos

Esas son leyes semánticas compartidas por los intérpretes compatibles. Las afirmaciones específicas de una representación —como que los bits no utilizados sean cero— pertenecen al intérprete que eligió esa representación.

```admonish quote title="Lee los tipos como afirmaciones"
Pregunta qué afirma cada tipo, qué lo determina, qué leyes lo completan y qué intérprete lo realiza.
```

## Comprobaciones de revisión {#review-checks}

*   ¿Aparece una distinción del dominio antes de su codificación compacta de máquina?
*   ¿Es un tipo asociado un portador elegido por el intérprete, y no un estado concreto disfrazado?
*   ¿Las restricciones de igualdad expresan solo la compatibilidad necesaria en ese sitio de uso?
*   ¿Las fases distintas del compilador tienen tipos distintos y contratos explícitos?
*   ¿Se separan las proposiciones semánticas de los invariantes de representación?
*   ¿Las afirmaciones que Rust no puede expresar están respaldadas por leyes o escenarios reutilizables?
