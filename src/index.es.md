<!-- reader: {"title":"Programación ALUX","parts":{"Welcome":"Bienvenida","The Semantic View":"La perspectiva semántica","Design by Meaning in Rust":"Diseño basado en el significado en Rust","Concepts":"Conceptos","Insights":"Perspectivas","Contributing":"Contribuir"},"sourceHash":"sha256:81b904efbe52746e7c430050f24b67bda84b62fab618ace269ce404c69b04146"} -->

```admonish warning title="Proyecto ALUX"
La base de código de ALUX está en desarrollo activo y aún no está disponible públicamente.
```

# <img src="/alux-logo.png" style="margin-right: 10px; width: 60px;"> Directrices de programación de ALUX {#alux-programming-guidelines}

```admonish note title="nota"
Este libro desarrolla los fundamentos necesarios para comprender y contribuir a la base de código de ALUX, centrada en el significado. Comienza con un principio central del [Diseño denotacional](denotational-design/design.md): definir qué significan los programas antes de decidir cómo funcionan.

Siguiendo a Conal Elliott, trata el cálculo como un objeto matemático claro, no como una secuencia opaca de pasos.

Las especificaciones se expresan mediante [traits de capacidad](rust-dd/capability-algebras.md) simples y composicionales que describen *qué* significa un programa. Los [intérpretes](rust-dd/interpreters.md) ofrecen formas intercambiables de *realizar* esos significados.

El resultado es un software cuyas reglas de composición, obligaciones de implementación y [ecuaciones válidas](denotational-design/laws-and-interpretations.md) son más fáciles de ver y probar.
```

```admonish quote title="Mecanismos frente a significado"
[Conceptos](concepts/index.md) y [Perspectivas](insights/index.md) explican mecanismos de programación útiles. El [Diseño denotacional](denotational-design/design.md) explica cómo decidir qué deben preservar esos mecanismos.
```

## Cómo leer este libro {#how-to-read-this-book}

Lee el libro en tres capas:

*   [**La perspectiva semántica**](denotational-design/semantic-view.md) presenta [denotaciones y composicionalidad](denotational-design/denotations.md), [leyes e interpretaciones](denotational-design/laws-and-interpretations.md), y la relación entre significado y representación.
*   [**Diseño por significado en Rust**](rust-dd/capability-algebras.md) convierte esa perspectiva en [capacidades pequeñas](rust-dd/capability-algebras.md), [extensiones derivadas](rust-dd/derived-meaning.md), [programas de primer orden](rust-dd/first-order-programs.md) e [intérpretes ligeros](rust-dd/interpreters.md).
*   [**Conceptos**](concepts/index.md) y [**Perspectivas**](insights/index.md) explican modelos de ejecución, codificaciones, transformaciones y conexiones importantes.

Los principios semánticos son independientes del lenguaje. Rust es el lenguaje de implementación principal, y [una canalización de lenguaje concurrente](rust-dd/compiler-pipelines.md) conecta estos principios con Tolang.

## A quién va dirigido este libro {#who-this-book-is-for}

*   Programadores que quieren que el software complejo siga siendo **modular, componible, comprobable y mantenible** a medida que evoluciona.
*   Desarrolladores que buscan **conectar la teoría de categorías, los sistemas de tipos y el diseño de programas**.
*   Lectores familiarizados con técnicas de representación y operacionales —como [**mónadas libres**](concepts/free_monad.md), [**estilo de paso de continuaciones (CPS)**](concepts/cps.md) y [**defuncionalización**](concepts/defunctionalization.md)— que quieran entender cómo esos mecanismos sirven al diseño centrado en el significado, en vez de definirlo.
*   Lectores familiarizados con [**tipos dependientes**](denotational-design/dependent-types.md) y programación orientada a pruebas que quieran aplicar ese modelo mental al escribir Rust de alto rendimiento.
*   Colaboradores que necesitan leer [especificaciones de Rust centradas en el significado](rust-dd/capability-algebras.md) y comprender cómo [compilar un lenguaje concurrente](rust-dd/compiler-pipelines.md) sin convertir su compilador en la definición del lenguaje.
