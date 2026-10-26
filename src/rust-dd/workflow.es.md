<!-- reader: {"title":"Un flujo de trabajo guiado por el significado","sourceHash":"sha256:4e52a8067c665db3ce38a802a1615b5d660d1aeee86656c13b53a33c6ebd2dff"} -->

# Un flujo de trabajo guiado por el significado {#a-meaning-first-workflow}

```admonish tip title="Relacionado"
La perspectiva semántica: [Por qué el significado va primero](../denotational-design/semantic-view.md)  
Diseño basado en el significado en Rust: [Álgebras de capacidades](capability-algebras.md), [Significado derivado y composición](derived-meaning.md), [Leyes, escenarios y pruebas](laws.md)
```

```admonish note title="Una disciplina repetible"
El diseño denotacional es un flujo de trabajo, no solo una explicación del código terminado: formula el cambio semántico, identifica las capacidades primitivas mínimas, compónlas con fidelidad, implementa intérpretes delgados y comprueba las leyes.
```

El diseño denotacional resulta más útil como disciplina de desarrollo repetible que como simple explicación del código terminado.

## El flujo de trabajo central {#the-core-workflow}

Para una nueva funcionalidad o refactorización:

1.  Formula el cambio semántico en una frase.
2.  Identifica el portador y la igualdad observable.
3.  Encuentra las capacidades primitivas mínimas necesarias.
4.  Define el comportamiento derivado a partir de capacidades explícitas.
5.  Elige una forma de composición fiel al significado.
6.  Reifica un programa de primer orden solo si su estructura necesita varias interpretaciones.
7.  Implementa intérpretes concretos y delgados.
8.  Añade leyes o escenarios compartidos.
9.  Valida las interpretaciones alternativas.
10.  Documenta el significado antes que la maquinaria.

## Formula el cambio semántico {#state-the-semantic-change}

Formulación débil:

> Añadir una caché y un método al gestor.

Formulación orientada al significado:

> Resolver el mismo nombre de origen inmutable denota el mismo valor de origen durante una compilación.

La segunda formulación plantea una posible ley. Más adelante, se puede elegir el almacenamiento en caché como una implementación.

## Encuentra el límite primitivo {#find-the-primitive-boundary}

Pregunta:

*   ¿Qué nueva observación o transformación hace falta?
*   ¿Es primitiva en este límite o puede derivarse del significado existente?
*   ¿Hace falta un nuevo portador asociado?
*   ¿La supuesta dependencia es solo una ubicación de almacenamiento?
*   ¿Qué distinciones deberían permanecer invisibles?

Añade una capacidad solo cuando haya un significado primitivo realmente nuevo.

## Elige la composición con fidelidad {#choose-composition-truthfully}

Usa esta tabla de decisión:

| Pregunta | Opción |
| --- | --- |
| ¿Un mismo receptor interpreta todos los significados requeridos? | Restricciones directas |
| ¿El comportamiento se elige de manera independiente? | Valor de política explícito |
| ¿Se pueden componer las políticas de forma independiente? | Producto |
| ¿Un entorno contiene otro intérprete? | Proyección |
| ¿Un envoltorio debe sustituir al intérprete interno? | Delegación |

No introduzcas un rasgo de contexto grande como respuesta predeterminada.

## Refactoriza un significado cada vez {#refactor-one-meaning-at-a-time}

Cuando el código existente priorice la representación:

1.  Identifica una observación semántica.
2.  Define una capacidad pequeña.
3.  Traslada una derivación a una extensión.
4.  Mantén la estructura actual como su intérprete.
5.  Añade una prueba basada en una ley.

```admonish warning title="El diseño denotacional no busca maximizar las abstracciones"
Evita reescribir todo un subsistema con abstracciones especulativas. El diseño denotacional no busca maximizar las abstracciones.
```

## Revisa desde el significado hasta la maquinaria {#review-from-meaning-to-machinery}

Lee el código en este orden:

1.  rasgos de capacidades
2.  tipos de valores semánticos
3.  extensiones derivadas
4.  sintaxis de programas de primer orden, si existe
5.  leyes y escenarios compartidos
6.  intérpretes concretos
7.  orquestación del entorno de ejecución

Empezar por la estructura más grande que contiene el estado inclina la revisión hacia su representación.

## Modos de fallo habituales {#common-failure-modes}

````admonish warning title="Un estado concreto con forma de rasgo no es diseño denotacional"
```rust,noplayground
trait ContextAlg {
    fn state(&self) -> &ConcreteState;
}
```

El rasgo cambia la sintaxis, pero no quién es dueño del significado. El núcleo semántico sigue dependiendo de la representación concreta.
````

### Lógica derivada en cada intérprete {#derived-logic-in-every-interpreter}

Si cada implementación define por separado el mismo algoritmo de dominio, la especificación está duplicada.

### Capacidad omnipotente {#god-capability}

Un superrasgo que reúne operaciones sin relación oculta las dependencias e impide la interpretación independiente.

### Especificación propiedad del framework {#framework-owned-specification}

Si las anotaciones de rutas o el registro de RPC son la única definición de interfaz, la documentación y la ejecución pueden divergir.

### Significado propiedad de la macro {#macro-owned-meaning}

Si el código generado carece de un destino público de primer orden, la expansión de la macro se convierte accidentalmente en la especificación.

### Política oculta en valores predeterminados {#policy-hidden-in-defaults}

Si `Default` elige silenciosamente una política de quórum, reintentos, ordenación o compilación, la composición deja de ser explícita.

### Pruebas de pasos privados {#tests-of-private-steps}

Las pruebas acopladas a la disposición de campos o al orden de recorrido desincentivan intérpretes alternativos válidos.

## Lista de comprobación para la solicitud de integración {#pull-request-checklist}

### Significado {#meaning}

*   ¿Se ha formulado el cambio semántico?
*   ¿Están claros el portador y la igualdad?
*   ¿Se han nombrado las omisiones intencionales?

### Capacidades {#capabilities}

*   ¿Cada rasgo expone un significado primitivo coherente?
*   ¿Las restricciones están donde se usan las operaciones?
*   ¿El código derivado evita los campos concretos?

### Composición {#composition}

*   ¿Se usan con fidelidad las restricciones directas, las políticas, los productos, las proyecciones y la delegación?
*   ¿Los valores semánticos predeterminados son explícitos?

### Programas e intérpretes {#programs-and-interpreters}

*   ¿Se introduce una estructura de primer orden solo cuando otra interpretación la necesita?
*   ¿Pueden las macros de conveniencia traducirse a valores de programa públicos?
*   ¿Los intérpretes concretos son delgados y específicos de cada límite?

### Pruebas {#evidence}

*   ¿Se incluye una ley o una afirmación semántica específica?
*   ¿Se puede ejecutar el mismo escenario con otro intérprete?
*   ¿Se presentan las pruebas finitas como indicios y no como demostración?

## Leer código al estilo de ALUX {#reading-alux-style-code}

La forma general que conviene reconocer es:

1.  rasgos de capacidades primitivas pequeñas
2.  extensiones derivadas sobre restricciones explícitas
3.  programas de primer orden cuando se requiere inspección o composición
4.  leyes y escenarios compartidos
5.  intérpretes concretos para entornos de ejecución, compiladores, HTTP, RPC o almacenamiento

Los grandes sistemas concurrentes aún contienen zonas dominadas por la orquestación. No des por sentado que todas las interfaces existentes ya son especificaciones denotacionales ideales. Busca los límites semánticos y lee desde ellos hacia afuera.

Tolang aplica la misma perspectiva a escala de lenguaje: la sintaxis se normaliza en formas portadoras de significado, la compilación preserva ese significado y un entorno de ejecución concurrente interpreta la representación ejecutable. La explicación operativa sigue siendo esencial, pero viene después del contrato semántico.

## Principio final {#final-principle}

En caso de duda, vuelve a una sola pregunta:

```admonish quote title="La pregunta a la que debes volver"
¿Qué significado debe preservar esta maquinaria?
```

Esa pregunta no resuelve todos los problemas de ingeniería. Hace visible el problema en el nivel correcto.
