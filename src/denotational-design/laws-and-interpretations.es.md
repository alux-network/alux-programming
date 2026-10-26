<!-- reader: {"title":"Leyes e interpretaciones"} -->

# Leyes e interpretaciones {#laws-and-interpretations}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](design.md)  
Diseño por significado en Rust: [Leyes, escenarios y evidencia](../rust-dd/laws.md), [Intérpretes y efectos](../rust-dd/interpreters.md)  
Conceptos: [Ramificación y confluencia](../concepts/branching.md)
```

```admonish note title="Idea central"
Las leyes expresan cómo se relacionan las operaciones de una interfaz semántica, y una interpretación asigna portadores concretos que deben preservar esas leyes. La igualdad elegida fija qué diferencias entre intérpretes tienen significado y cuáles son libres.
```

Una interfaz semántica nombra operaciones. Las leyes expresan cómo se relacionan. Sin leyes, dos implementaciones pueden cumplir las mismas firmas de Rust y aun así discrepar sobre la abstracción.

## Las leyes completan el vocabulario {#laws-complete-the-vocabulary}

Para las posiciones de ramificación, algunas leyes útiles son:

$$ \begin{aligned} \operatorname{path}(b,b) &= \lbrack\,\rbrack \\ \operatorname{path}(\operatorname{root}, \operatorname{from\_path}(d_s)) &= d_s \\ \operatorname{from\_path}(\operatorname{path}(\operatorname{root},b)) &= b \\ \operatorname{is\_ancestor}(b,b) &= \mathsf{true} \\ \operatorname{left}(b) &\ne \operatorname{right}(b) \end{aligned} $$

Estas leyes explican más de lo que pueden hacerlo los comentarios de métodos. Describen identidad, reconstrucción, reflexividad y separación.

No todas las ecuaciones atractivas son válidas. Por ejemplo, una representación de ancho fijo puede desbordarse a una profundidad extrema. Eso puede ser:

*   una limitación del intérprete fuera del dominio admitido
*   un error semántico que la interfaz debe exponer
*   evidencia de que el portador elegido es incorrecto

El diseño debe indicar cuál de estas opciones se aplica.

## Interpretación {#interpretation}

Una **interpretación** asigna portadores y operaciones concretos a un álgebra semántica.

| Programa semántico | Interpretaciones posibles |
| --- | --- |
| Posición de ramificación | Ruta de bits, árbol numérico, forma simbólica |
| Programa de expresiones | Evaluador, impresor de formato, optimizador |
| Programa de API tipada | Rutas de servidor ejecutables, documentación, generador de clientes |

Un mismo programa puede tener varias interpretaciones porque no es idéntico a ningún resultado concreto.

## Obligaciones de implementación {#implementation-obligations}

Un intérprete debe preservar la estructura que afirma la especificación.

Si la fusión es asociativa en el programa semántico:

$$ (a \oplus b) \oplus c = a \oplus (b \oplus c) $$

los intérpretes deben preservar entonces el significado observable de esa asociación. Si también se especifica el orden de las rutas, la igualdad debe incluirlo. Si se omite intencionalmente, las implementaciones pueden diferir operacionalmente y seguir siendo semánticamente iguales.

Por eso hay que elegir el dominio semántico y la igualdad antes de escribir leyes.

## Leyes, pruebas y tests {#laws-proofs-and-tests}

Estos términos no son intercambiables:

*   Una **ley** es una propiedad que se pretende universal para la abstracción.
*   Una **prueba** establece una ley bajo supuestos declarados.
*   Un **test de propiedades** comprueba muchos ejemplos generados.
*   Un **test de escenario** comprueba una situación finita con significado.
*   Un **test unitario** comprueba un comportamiento concreto.

Los tests son evidencia ejecutable, no una prueba universal. Aun así, son valiosos porque se pueden reutilizar con todos los intérpretes.

## Evidencia ejecutable {#executable-evidence}

Las leyes semánticas son independientes de sus implementaciones. Las comprobaciones ejecutables aportan evidencia finita de que un intérprete preserva esas leyes: los tests de propiedades ejercitan afirmaciones semejantes a ecuaciones, mientras que los escenarios ejercitan interacciones observables. Si se expresan solo en términos de operaciones semánticas, la misma evidencia puede reutilizarse entre intérpretes compatibles. Los tests respaldan una especificación; no la definen ni la demuestran.

Las codificaciones de Rust se desarrollan en [Leyes, escenarios y evidencia](../rust-dd/laws.md).

## Varios intérpretes aclaran el significado {#multiple-interpreters-clarify-meaning}

No se necesita una segunda implementación para cada trait pequeño, pero es una potente prueba de diseño.

Si una supuesta ley abstracta solo puede expresarse mediante campos de la primera implementación, probablemente el límite semántico sea incorrecto. Si un segundo intérprete puede implementar las primitivas y cumplir las mismas leyes sin imitar la primera representación, la abstracción gana credibilidad.

Los intérpretes neutrales son especialmente útiles:

*   un intérprete textual revela la estructura del programa
*   un modelo puro en memoria aísla las leyes
*   un intérprete de trazas revela las observaciones elegidas
*   un intérprete de producción realiza efectos reales

## La igualdad determina la libertad de refactorización {#equality-determines-refactoring-freedom}

Cada igualdad semántica concede libertad a la implementación. Si dos representaciones son iguales según la denotación elegida, una implementación puede sustituir una por la otra.

Toda observación omitida también concede libertad. Si el orden de asignación no es semántico, puede cambiar. Si el orden de los métodos sí lo es, no debe cambiar.

Por tanto, las leyes no son solo restricciones de corrección. Definen el espacio seguro para optimizar, sustituir y evolucionar.

## Punto de control {#checkpoint}

Antes de pasar a las codificaciones de Rust, verifica que puedes responder:

1.  ¿Cuál es el portador semántico?
2.  ¿Qué omite intencionalmente la abstracción?
3.  ¿Qué operaciones son primitivas?
4.  ¿Qué operaciones son derivadas?
5.  ¿Qué igualdad se está usando?
6.  ¿Qué leyes debe preservar cada intérprete?
7.  ¿Qué evidencia se compartirá entre intérpretes?

El resto del libro muestra una respuesta práctica en Rust. Es una codificación de esta imagen semántica, no un reemplazo de ella.
