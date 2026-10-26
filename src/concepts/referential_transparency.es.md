<!-- reader: {"title":"Transparencia referencial"} -->

# Transparencia referencial {#referential-transparency}

```admonish tip title="Relacionado"
La perspectiva semántica: [Denotaciones y composicionalidad](../denotational-design/denotations.md), [Leyes e interpretaciones](../denotational-design/laws-and-interpretations.md)  
Perspectivas: [Transparencia referencial, reexaminada](../insights/referential-transparency.md)
```

```admonish note title="Ubicación semántica"
La transparencia referencial depende de la denotación y la igualdad elegidas. Permite la sustitución cuando reemplazar una expresión preserva el significado especificado, aunque las implementaciones difieran operacionalmente detrás del límite semántico.
```

La transparencia referencial (RT) es la propiedad de sustitución de las expresiones: se puede reemplazar una expresión por su denotación sin alterar el significado del programa.

Hoy en día, la RT se usa en la práctica como fundamento del razonamiento ecuacional, la refactorización segura y el diseño de API basado en leyes.

## Significado central {#core-meaning}

La RT afirma:

*   si `e` denota `v`
*   entonces usar `v` en lugar de `e` preserva el significado

Es una afirmación semántica, no un eslogan de estilo de programación.

### Pureza {#purity}

Una función pura devuelve el mismo resultado con las mismas entradas y no tiene efectos secundarios observables. La RT es la ley de sustitución para expresiones: reemplazar una expresión por su denotación debe preservar el significado. Por tanto, la pureza es una forma habitual de lograr la RT en la práctica, mientras que la RT es un criterio semántico más amplio. Consulta [Transparencia referencial, reexaminada](../insights/referential-transparency.md) para conocer la distinción del diseño denotacional entre pureza y RT.

## Contexto histórico {#historical-context}

En la semántica de los lenguajes de programación, la RT se asocia estrechamente con el planteamiento de Christopher Strachey. Su tratamiento separa el razonamiento sobre valores del comportamiento con abundantes actualizaciones:

*   **Valores R**: valores de expresiones.
*   **Valores L**: ubicaciones a las que se puede asignar un valor.

La idea clave es que la sustitución en el nivel de las expresiones es estable si razonamos sobre valores. La asignación introduce actualizaciones de ubicaciones y dificulta el razonamiento por sustitución, o lo invalida en su forma ingenua.

## Qué significan aquí la asignación y los efectos secundarios {#what-assignment-and-side-effects-mean-here}

En este contexto:

*   **asignación** significa actualizar una ubicación (por ejemplo, `x := x + 1`)
*   **efecto secundario** es cualquier cambio observable además de devolver un valor

La asignación es un tipo específico de efecto secundario.

Por eso falla la RT en muchos contextos imperativos: la evaluación puede depender del contexto observable externo a la interfaz de valores explícitos de la expresión o modificarlo.

## Cómo presentan la RT los lenguajes modernos {#how-modern-languages-present-rt}

### Haskell {#haskell}

La RT se enseña como el modo predeterminado de razonar sobre expresiones puras. Los efectos son explícitos en construcciones tipadas (`IO`, paso de estado y abstracciones relacionadas), por lo que las leyes de sustitución son fundamentales en el uso diario.

### Scala (Cats / Cats Effect) {#scala-cats--cats-effect}

En la práctica de la programación funcional en Scala, Cats Effect proporciona el enfoque de RT más habitual:

*   `IO[A]` es una descripción pura de un trabajo con efectos
*   la composición de valores `IO` tiene transparencia referencial
*   la ejecución es explícita en los límites del entorno de ejecución (`unsafeRun*`)

Cats Effect también contrasta esto con la evaluación `Future` ansiosa, una de las razones por las que los debates sobre RT en Scala hacen hincapié en la evaluación perezosa y la ejecución diferida.

## La RT hoy {#rt-today}

En los ecosistemas modernos, RT se usa como abreviatura de comportamiento seguro para la sustitución. En los sistemas que combinan paradigmas, los equipos suelen aplicar las afirmaciones de RT a módulos, API o regiones con efectos tipados concretos, en lugar de aplicarlas globalmente a todo el código.

Para consultar la interpretación de RT en el diseño denotacional, véase [Transparencia referencial, reexaminada](../insights/referential-transparency.md).

## Referencias {#references}

*   Strachey, C. *Fundamental Concepts in Programming Languages* (apuntes de clase del PRG de Oxford, 1967).  
    [https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf](https://reed.cs.depaul.edu/jriely/447/assets/articles/strachey-fundamental-concepts-in-programming-languages.pdf)
*   Documentación de Cats Effect: tipo de datos `IO` y notas sobre RT/evaluación perezosa.  
    [https://typelevel.org/cats-effect/docs/datatypes/io](https://typelevel.org/cats-effect/docs/datatypes/io)
*   Blog de Typelevel: *An IO monad for cats* (motivación sobre impureza en Scala frente a RT).  
    [https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html](https://typelevel.org/blog/2017/05/02/io-monad-for-cats.html)
