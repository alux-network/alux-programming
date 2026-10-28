<!-- reader: {"title":"Acerca del libro","sourceHash":"sha256:dc574b72cd9d99b223d155921c54f7cf34eb8ee02ac5655eb0c184c2c520199a"} -->

# Acerca del libro {#about}

Este libro condensa una manera de pensar sobre el software inspirada en el **diseño denotacional** de Conal Elliott. La idea central es sencilla, pero profunda:

```admonish note title="Diseño denotacional"
*Define el significado de un programa antes de decidir cómo se ejecuta.*
```

Desde este punto de vista, el cálculo no es una secuencia opaca de pasos, sino un objeto matemático transparente. Empezamos con **especificaciones** como descripciones puras y composicionales de *lo que* significa un programa. Se expresan como estructuras algebraicas, a menudo en forma de rasgos o signaturas de tipos. La **implementación**, es decir, *cómo* se realizan esos significados, constituye una capa separada e intercambiable.

Al separar el significado de la mecánica, obtenemos:

*   **Claridad**: los programas se leen como definiciones precisas.
*   **Componibilidad**: las partes encajan algebraicamente.
*   **Capacidad de refactorización**: el significado permanece fijo mientras evoluciona la implementación.
*   **Corrección**: el razonamiento sobre programas se vuelve ecuacional y no operacional.

Estas pautas buscan ofrecer técnicas prácticas para aplicar este estilo en lenguajes de programación modernos, especialmente Rust, sin perder la elegancia ni el rigor de sus raíces matemáticas.

El libro distingue intencionalmente tres niveles:

*   **Significado** define qué valores, relaciones y transformaciones se diseñan.
*   **Representación** determina cómo se codifican esos significados en tipos y datos.
*   **Ejecución** determina cómo se ejecuta una representación en una máquina.

ALUX y Tolang motivan muchos de los ejemplos, pero no es necesario conocerlos para seguir esta edición. El libro desarrolla primero el vocabulario.

## Documentación de mdbook {#reference-of-mdbook}

[Documentación de mdBook](https://rust-lang.github.io/mdBook/index.html)

## Documentación del plugin mdbook **admonish** (cuadros emergentes) {#reference-of-admonish-mdbook-plugin-tooltip-boxes}

[Documentación de admonish](https://tommilligan.github.io/mdbook-admonish/)
