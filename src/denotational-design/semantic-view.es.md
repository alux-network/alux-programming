<!-- reader: {"title":"Por qué el significado va primero","sourceHash":"sha256:f316bc5e61f5570df8820fe1d5d9eb783f05f51b36294ddf29e34e1a9fa6617d"} -->

# Por qué el significado va primero {#why-meaning-comes-first}

![The semantic view — choosing what a program means before how it runs](../assets/semantic-view.png)

```admonish tip title="Relacionado"
La perspectiva semántica: [Denotaciones y composicionalidad](denotations.md), [Diseño denotacional](design.md)  
Diseño por significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md)  
Conceptos: [Introducción](../concepts/index.md)
```

```admonish note title="Orientación"
El Diseño denotacional elige primero el significado de un programa y después deriva el vocabulario, la representación y la estrategia de ejecución necesarios para preservarlo. Esta página contrasta ese orden semántico con el orden centrado en la representación que sigue la mayor parte del software.
```

La mayoría del software se diseña en el orden en que se ejecutará:

1.  Elegir el estado.
2.  Elegir el flujo de control.
3.  Exponer métodos alrededor de esos mecanismos.
4.  Explicar después qué significado se pretendía dar a los métodos.

El Diseño denotacional invierte ese orden:

1.  Elegir el significado.
2.  Identificar su estructura composicional.
3.  Derivar un vocabulario a partir de esa estructura.
4.  Elegir representaciones y estrategias de ejecución.
5.  Verificar que preservan el significado.

Esta inversión es la perspectiva semántica.

```admonish quote title="Mecanismos frente a significado"
[Conceptos](../concepts/index.md) y [Perspectivas](../insights/index.md) explican mecanismos de programación útiles. El [Diseño denotacional](design.md) explica cómo decidir qué deben preservar esos mecanismos.
```

## Tres preguntas {#three-questions}

Al diseñar un programa, mantén separadas tres preguntas.

| Perspectiva | Pregunta | Artefactos habituales |
| --- | --- | --- |
| Semántica | ¿Qué significa este programa? | valores, relaciones, funciones, ecuaciones, leyes |
| Representacional | ¿Cómo se codifica ese significado? | tipos de Rust, traits, AST, tablas, árboles, bytecode |
| Operacional | ¿Cómo se ejecuta la representación? | bucles, mutaciones, tareas, mensajes, intérpretes, máquinas virtuales |

Las tres perspectivas importan. El error consiste en permitir que la representación o la ejecución definan silenciosamente la perspectiva semántica.

La semántica operacional ofrece una explicación precisa y valiosa de la ejecución. Puede describir cada transición que realiza un evaluador. Aun así, responde a una pregunta de diseño distinta de la perspectiva denotacional. La pregunta denotacional es qué valor matemático observable denota el programa completo y qué ecuaciones deben cumplirse independientemente de la estrategia de ejecución.

## Un ejemplo sencillo {#a-small-example}

Supongamos que un sistema identifica posiciones en un proceso de ramificación.

Un diseño centrado en la representación puede empezar con un vector de bits:

```rust,noplayground
struct BranchId(Vec<bool>);
```

Después se añaden métodos alrededor de los campos: agregar un bit, extraer un prefijo, comparar vectores y serializar bytes.

La perspectiva semántica empieza en otro lugar:

*   Existe una posición raíz.
*   Una posición puede crecer hacia la izquierda o hacia la derecha.
*   Una posición puede ser antecesora de otra.
*   Se puede observar el camino entre una posición antecesora y una descendiente.

Estas afirmaciones siguen teniendo sentido si más adelante la representación se convierte en un entero, una coordenada de árbol, un valor híbrido compacto o una clave de base de datos. El vector de bits es una interpretación de la posición de ramificación, no su definición.

## El significado no es documentación posterior {#meaning-is-not-documentation-after-the-fact}

Escribir prosa sobre una API concreta no convierte el diseño en denotacional. El significado debe restringir la API antes de elegir la representación.

Una descripción semántica debe indicar:

*   qué distinciones importan
*   qué observaciones son primitivas
*   cómo se componen significados mayores
*   qué ecuaciones son válidas
*   qué debe preservar cada implementación
*   qué detalles se olvidan intencionalmente

Si el único artefacto preciso es una estructura de estado o un bucle de ejecución, la implementación sigue siendo dueña del significado.

## Abstracción frente a significado {#abstraction-versus-meaning}

````admonish warning title="Un trait de contexto no define el significado"
Una interfaz puede ocultar mecanismos sin explicar el significado:

```rust,noplayground
trait ApplicationContext {
    fn database(&self) -> &Database;
    fn settings(&self) -> &Settings;
    fn runtime(&self) -> &Runtime;
}
```

Esta interfaz abstrae el acceso a componentes concretos. No especifica las observaciones semánticas que requiere un cálculo.
````

````admonish success title="Pregunta directamente por el significado"
Una interfaz orientada al significado solicita la propia observación:

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
````

La inversión de dependencias es útil, pero el Diseño denotacional exige más: el límite de abstracción debe organizarse en torno al significado, no a la ubicación del almacenamiento.

## La dirección de la autoridad {#the-direction-of-authority}

Cuando los artefactos discrepen, no concedas autoridad al que esté más cerca del código en ejecución. Pregunta qué debe preservar cada artefacto.

| Rol | Qué corresponde aquí | Responsabilidad |
| --- | --- | --- |
| **Significado** | Observaciones, distinciones e igualdades previstas del dominio | Decide qué significa la corrección |
| **Especificación** | Dominios semánticos, denotaciones, tipos, operaciones primitivas, leyes y composiciones derivadas | Expresa ese significado con precisión |
| **Realización** | Representaciones concretas, intérpretes, compiladores, entornos de ejecución, almacenamiento y planificación | Implementa la especificación sin cambiarla |
| **Evidencia** | Pruebas, verificaciones de leyes, escenarios y comparaciones entre intérpretes | Conecta una realización con la especificación; no define por sí sola el significado |

Esto ofrece una regla práctica para resolver discrepancias:

*   Si una implementación infringe una ley semántica, cambia la implementación.
*   Si una prueba contradice la ley que pretendía comprobar, cambia la prueba.
*   Si la especificación formal no expresa el significado previsto del dominio, revisa la especificación.

Un artefacto se clasifica por su función, no por su sintaxis. Un trait de Rust o un programa de primer orden puede formar parte de la especificación cuando preserva directamente la estructura semántica elegida; otro tipo de Rust puede ser solo una codificación concreta. Una semántica operacional formal también puede formar parte de una especificación de lenguaje, pero sus transiciones siguen respondiendo a las observaciones y equivalencias que pretende el lenguaje.

Ahora se pueden ubicar CPS, la defuncionalización, las mónadas libres, las máquinas virtuales, los entornos de ejecución de protocolos y las canalizaciones de compilación sin preguntarse cuál es la abstracción definitiva. Cada técnica es una representación o estrategia de ejecución útil para ciertos consumidores. La especificación semántica indica qué debe preservar toda técnica elegida.
