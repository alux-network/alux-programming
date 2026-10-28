<!-- reader: {"title":"Introducción","sourceHash":"sha256:aea0854cd288084035720b57d882094019b47b9cb967dc1c0115a6acb9d122a3"} -->

# Introducción a los conceptos {#concepts-introduction}

![Concepts — the programming machinery](/concepts.png)

```admonish tip title="Relacionado"
La perspectiva semántica: [Por qué el significado va primero](../denotational-design/semantic-view.md)  
Diseño basado en el significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md)  
Perspectivas: [Introducción](../insights/index.md)
```

Los capítulos de esta parte explican mecanismos importantes de programación y herramientas teóricas:

*   la semántica operacional describe reglas de ejecución
*   CPS hace explícita la continuación del control
*   la defuncionalización convierte comportamientos de orden superior conocidos en datos de primer orden
*   los mónadas libres representan sintaxis de efectos con secuenciación
*   las codificaciones del problema de expresiones gestionan la extensibilidad
*   la transparencia referencial facilita la sustitución
*   la confluencia, las trazas y la bisimulación comparan formas de comportamiento

El diseño denotacional no sustituye estos conceptos; los integra.

```admonish quote title="Maquinaria y significado"
[Conceptos](index.md) y [Perspectivas](../insights/index.md) explican mecanismos de programación útiles. [El diseño denotacional](../denotational-design/design.md) explica cómo decidir qué debe preservar esa maquinaria.
```

Al leer cada capítulo, formula estas tres preguntas:

1.  ¿Este concepto describe significado, representación, ejecución o una transformación entre ellos?
2.  ¿Qué observaciones e igualdades preserva?
3.  ¿Es la especificación, una de sus codificaciones o uno de sus intérpretes?

Varios capítulos se escribieron antes de que el libro adoptara esta progresión semántica explícita. Sus ejemplos mantienen intencionalmente un enfoque operativo. Los enlaces contextuales y los capítulos de Perspectivas los conectan de nuevo con la visión semántica.
