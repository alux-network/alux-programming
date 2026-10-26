<!-- reader: {"title":"De la semántica a las máquinas"} -->

# De la semántica a las máquinas {#semantics-to-machines}

```admonish tip title="Relacionado"
Diseño basado en el significado en Rust: [Programas de primer orden](../rust-dd/first-order-programs.md), [Lenguaje y procesos de compilación](../rust-dd/compiler-pipelines.md)  
Conceptos: [Semántica operacional](../concepts/operational_semantics.md), [Mónada libre](../concepts/free_monad.md), [Estilo de paso de continuaciones](../concepts/cps.md), [Defuncionalización](../concepts/defunctionalization.md)
```

## Qué describe la semántica operacional {#what-operational-semantics-describes}

La semántica operacional especifica cómo se comporta una representación de programa elegida. Define juicios de evaluación o una relación de transición sobre configuraciones como:

$$ (\mathit{program}, \mathit{state}) \longrightarrow (\mathit{program}', \mathit{state}') $$

El programa puede ser sintaxis fuente, un valor de mónada libre, un término CPS, bytecode o un estado de máquina defuncionalizado. Ninguna de esas representaciones *es* semántica operacional. La semántica operacional describe cómo se evalúan o avanzan los valores de la representación elegida.

Esta dirección importa. Una representación nos ofrece algo cuyo comportamiento se puede describir; añadir una descripción operacional no explica qué debería significar el lenguaje.

## Programas de mónada libre {#free-monad-programs}

Una mónada libre proporciona sintaxis de instrucciones junto con una secuenciación generada libremente. No define el comportamiento de esas instrucciones.

Una semántica operacional para un programa de mónada libre puede definir configuraciones que contengan la instrucción actual, su continuación y cualquier estado de máquina. Las reglas explican, por ejemplo, cómo una instrucción suspendida modifica el estado y pasa su resultado al resto del programa.

Esa es una posible interpretación. El mismo programa libre también puede plegarse en un modelo denotacional, compilarse a otro lenguaje, analizarse o representarse sin ejecutarse.

<details>
<summary><strong>De libre a freer: qué reveló la investigación</strong></summary>

Quienes conocieron las mónadas libres como una arquitectura general para programas con efectos quizá se pregunten por qué el debate pasó después a las construcciones freer, los efectos extensibles y los manejadores. La investigación no descartó sin más las mónadas libres. Aisló qué aportan realmente, midió dónde fallan sus representaciones habituales y conservó la estructura útil.

Kiselyov e Ishii derivan mónadas freer al eliminar progresivamente restricciones y código repetitivo de las representaciones de términos con efectos. En la representación freer, una instrucción puede producir un tipo intermedio oculto en el tipo final del programa, y una continuación explícita conecta ese resultado con el resto del cálculo. Por ello, la signatura de instrucciones ya no necesita una instancia `Functor`.

Ese cambio mejora la expresividad, pero no resuelve por sí mismo el rendimiento. Una representación freer directa sigue componiendo continuaciones como la concatenación de listas asociada a la izquierda: procesar una cadena de solicitudes $n$ puede requerir $O(n^2)$ trabajo. Al hacer explícita la continuación, se revela la verdadera oportunidad: se puede almacenar como una secuencia alineada por tipos, cuyos tipos de resultado y entrada adyacentes coinciden por construcción. La concatenación eficiente de esa secuencia elimina el recorrido sensible a la asociación.

Las uniones abiertas permiten luego que un intérprete de efectos extensibles añada, combine y elimine tipos de solicitud seleccionados. Esto resuelve la composición modular de efectos y la estructura de manejadores. Aun así, no proporciona las ecuaciones de un dominio concreto ni decide cuándo dos programas con efectos tienen el mismo significado.

La conclusión es más precisa que «freer es mejor que free». Las mónadas libres revelaron una separación valiosa entre solicitudes e interpretación. Las codificaciones freer eliminaron una restricción innecesaria; las colas alineadas por tipos abordaron un problema de rendimiento medido; los efectos extensibles mejoraron la composición. Cada paso conservó lo aprendido en el anterior y delimitó mejor la afirmación. La interpretación semántica siguió siendo una decisión independiente.

Consulta Kiselyov e Ishii, [*Freer Monads, More Extensible Effects*](https://okmij.org/ftp/Haskell/extensible/more.pdf).

</details>

## Programas CPS {#cps-programs}

El estilo de paso de continuaciones (CPS) representa explícitamente el resto del cálculo mediante una continuación. Una semántica operacional de CPS describe comportamientos como:

*   evaluar la expresión CPS actual;
*   pasar un valor producido a su continuación;
*   transferir el control al aplicar esa continuación.

CPS expone el control de una forma cómoda para describir operacionalmente, pero es una representación o transformación de programas, no una semántica operacional. Relacionar un programa de estilo directo con su traducción CPS requiere especificar las semánticas de origen y destino y demostrar su preservación.

<details>
<summary><strong>Más allá de CPS: cuándo hay que inspeccionar las continuaciones</strong></summary>

CPS es una solución estándar para el append y el bind sensibles a la asociación. En lugar de recorrer repetidamente una estructura asociada a la izquierda, representa el cálculo restante mediante composición de funciones. Esta representación puede ser eficiente cuando la única operación sobre la continuación es su aplicación final.

Van der Ploeg y Kiselyov identifican el límite: algunos consumidores deben examinar o modificar un resultado intermedio antes de continuar. La búsqueda no determinista, los iteratees, las mónadas libres y los efectos extensibles pueden requerir ese acceso. CPS oculta la secuencia conceptual dentro de una función, por lo que recuperar la estructura intermedia requiere convertirla de nuevo en datos y puede anular la ventaja de rendimiento.

Su alternativa representa directamente la secuencia oculta como una estructura de datos alineada por tipos. Permite una composición eficiente sin importar la asociación y conserva un acceso eficiente a los resultados intermedios. Los tipos garantizan que cada cálculo almacenado produzca la entrada que espera el siguiente.

La conclusión más amplia no es que las secuencias alineadas por tipos venzan a CPS. CPS es excelente para *aplicar* continuaciones y menos adecuado cuando un consumidor debe *inspeccionarlas*. La investigación sobre control delimitado afina aún más la lección: en lugar de tratar todo el futuro como una única continuación indiferenciada, los delimitadores especifican qué parte del cálculo circundante se puede capturar y manipular.

Estas ideas no desaparecieron. Sus lecciones continúan en los manejadores de efectos, las derivaciones de máquinas abstractas, los operadores de control tipados y las representaciones eficientes de efectos. Lo que cambió fue la expectativa de que CPS por sí solo debía ser la abstracción final.

Consulta van der Ploeg y Kiselyov, [*Reflection without Remorse*](https://okmij.org/ftp/Haskell/zseq.pdf). Para un panorama más amplio del control, consulta la [colección de Kiselyov sobre continuaciones y control delimitado](https://okmij.org/ftp/continuations/index.html).

</details>

## Máquinas defuncionalizadas {#defunctionalized-machines}

La defuncionalización reemplaza una familia conocida de valores de función, como las continuaciones CPS, por constructores de primer orden y una operación `apply`. La semántica operacional puede describir entonces las transiciones entre las configuraciones explícitas resultantes.

Tras aplicar una transformación CPS concreta seguida de una defuncionalización, esas transiciones pueden derivar una máquina abstracta. Es una derivación potente, pero no define la semántica operacional en general: las reglas operacionales no tienen por qué originarse en CPS, y una máquina arbitraria de primer orden no se convierte por ello en una máquina de continuaciones defuncionalizada.

<details>
<summary><strong>Reynolds: los orígenes de la defuncionalización</strong></summary>

John C. Reynolds introdujo la defuncionalización en su estudio de 1972 sobre los intérpretes denotacionales. No partió de una máquina virtual de primer orden, sino de un intérprete de orden superior: las funciones del lenguaje de definición representaban entornos, continuaciones y otros elementos del lenguaje definido.

La transformación identifica la familia finita de abstracciones de función que puede aparecer en todo el programa. Reemplaza cada abstracción por un constructor de primer orden que contiene los valores de sus variables libres; luego, sustituye la aplicación de funciones por una operación `apply` que distribuye la ejecución según esos constructores. Lo implícito en el lenguaje de definición se convierte en un álgebra explícita de cierres o continuaciones.

Aplicado a un intérprete basado en continuaciones, este paso revela una máquina: los constructores de continuación se convierten en estados de control, las variables capturadas pasan a ser datos almacenados en la máquina y `apply` se convierte en el despachador de transiciones. La máquina no se inventa de antemano; se deriva de un evaluador de orden superior.

Reynolds también subrayó el coste de esta claridad. La máquina resultante contiene decisiones de representación correctas, pero no únicas. Distintas elecciones de constructores o transformaciones previas pueden producir colecciones distintas de engranajes y piezas de máquina, sin cambiar el comportamiento. Por tanto, la defuncionalización revela una estructura operacional, no el único significado inevitable del lenguaje.

Danvy y Nielsen sistematizaron después la técnica de Reynolds como transformación de programas completos y estudiaron la refuncionalización como su inversa. Su conclusión más profunda es que la transformación sirve de puente: permite transferir especificaciones y argumentos de corrección entre definiciones de orden superior y máquinas de primer orden, y revela que programas aparentemente distintos pueden ser dos representaciones de la misma estructura.

Esta trayectoria de investigación confiere a la técnica su autoridad adecuada. La defuncionalización es más que reemplazar cierres por una enumeración, pero menos que un fundamento universal: es un paso que preserva la semántica entre representaciones y cuya correspondencia debe establecerse.

Consulta a Reynolds, [*Definitional Interpreters for Higher-Order Programming Languages*](https://homepages.inf.ed.ac.uk/wadler/papers/papers-we-love/reynolds-definitional-interpreters-1972.pdf), y a Danvy y Nielsen, [*Defunctionalization at Work*](https://tidsskrift.dk/brics/article/view/21684).

</details>

## El ciclo de representación operacional {#the-operational-representation-cycle}

Un error recurrente es buscar una única representación operacional que resuelva todos los problemas de programación. Cada representación recupera algo que la anterior ocultaba, pero dificulta otra preocupación:

$$ \text{higher-order program} \longrightarrow \text{free syntax} \longrightarrow \text{CPS} \longrightarrow \text{first-order machine} \longrightarrow \text{higher abstraction} $$

Las flechas no afirman que exista un proceso de compilación obligatorio. Muestran un movimiento de diseño recurrente: hacer explícito lo que la representación actual oculta y, después, ocultar la maquinaria que introdujo esa exposición.

| Representación | Qué permite representar | Qué dificultades introduce |
| --- | --- | --- |
| Funciones de orden superior | Composición directa y abstracción del lenguaje anfitrión | Un consumidor genérico puede llamar a una función, pero no inspeccionar su estructura oculta |
| Sintaxis libre con secuenciación | Programas como datos componibles e interpretables | La libertad no proporciona ecuaciones del dominio, normalización, evaluación eficiente ni inspección de funciones almacenadas |
| CPS | El orden de evaluación y el resto del cálculo se vuelven explícitos | Una codificación CPS de todo el programa propaga continuaciones por casi todas las interfaces |
| Control defuncionalizado de primer orden | Las continuaciones se convierten en casos inspeccionables y serializables | Hay que mantener explícitamente constructores, argumentos almacenados, estados de transición y una operación `apply` |
| Una abstracción de nivel superior sobre la máquina | La maquinaria se vuelve más fácil de usar | La estructura vuelve a quedar oculta cuando un compilador, planificador, depurador u optimizador necesita inspeccionarla |

Las dificultades son estructurales. Inspeccionar requiere datos. Convertir el comportamiento en datos introduce constructores y un intérprete. Ocultar esos constructores restaura una abstracción cómoda, pero elimina el acceso que necesitan los consumidores que analizan o transforman programas.

El equilibrio de las mónadas libres es especialmente ilustrativo. Una mónada libre resuelve un problema preciso: genera secuenciación para un functor de instrucciones sin imponer ecuaciones aparte de las leyes de mónada. Esa garantía también marca su límite: no conoce las leyes del dominio. Si dos escrituras a la misma celda deberían equivaler a conservar solo la última, el programa libre sigue conteniendo ambas instrucciones hasta que una normalización o interpretación específica del dominio las identifique. Por tanto, la optimización, la forma canónica y la igualdad semántica deben venir de otra parte.

Tampoco basta con reificar las instrucciones para hacer que todo el programa sea inspeccionable de manera uniforme. En las codificaciones habituales, la instrucción suspendida es visible, pero su continuación es una función del lenguaje anfitrión. Un analizador genérico no puede inspeccionar la estructura futura que hay detrás de esa función sin proporcionar un resultado y aplicarla. Reificar la continuación recupera la capacidad de inspección al pasar a una representación de primer orden o defuncionalizada; así se vuelve a la siguiente parte del ciclo.

El coste de evaluación también depende de la representación. Un árbol ingenuo de binds asociados a la izquierda puede requerir recorridos repetidos y trabajo cuadrático. Una transformación que duplique subprogramas residuales puede provocar un crecimiento exponencial. Las codificaciones estilo Codensity, freer o especializadas pueden mejorar costes concretos, pero lo hacen eligiendo otras representaciones y equilibrios. El crecimiento exponencial es posible, pero no es una ley intrínseca de las mónadas libres.

Por eso una mónada libre no es una solución universal. Proporciona sintaxis con secuenciación sujeta a leyes, pero no las ecuaciones del dominio pretendido, una forma normal canónica, visibilidad estructural completa ni una implementación automáticamente eficiente. Del mismo modo, CPS no tiene por qué extenderse por todo un sistema si se usa localmente, y la defuncionalización solo resulta engorrosa en proporción a la familia de funciones y los valores capturados que deba reificar.

El ciclo aparece cuando se pretende que cada nueva codificación se convierta en el fundamento universal. Resuelve el inconveniente operacional anterior y luego se convierte en la siguiente fuente de complejidad accidental.

Por eso los debates sobre la «mejor abstracción» no llegan a una conclusión cuando permanecen exclusivamente en el plano operacional. Se comparan las funciones de orden superior, la sintaxis libre, CPS y las máquinas de primer orden como si una debiera dominar a las demás. Pero *mejor* no significa nada hasta que la comparación especifica qué debe preservarse y quién consumirá el resultado:

*   la ejecución directa favorece las llamadas habituales y la representación oculta;
*   la transformación y el análisis requieren una estructura inspeccionable;
*   la serialización requiere datos de primer orden;
*   la extensibilidad puede favorecer la incorporación de interpretaciones o de sintaxis, pero rara vez ambas por igual;
*   la concurrencia puede exigir observaciones que ignoren deliberadamente muchas decisiones de planificación.

Son requisitos distintos, no pruebas sucesivas de que una abstracción sea universalmente superior. Las propiedades operacionales pueden ayudar a elegir una implementación para un propósito especificado; no pueden aportar ese propósito ni decidir qué distinciones son significativas.

La misma cautela se aplica al pensamiento secuencial. La semántica operacional puede describir sistemas concurrentes y no deterministas, pero una única secuencia de pasos de máquina es solo una representación posible de su comportamiento. Si se da autoridad demasiado pronto al orden de planificación, las ejecuciones equivalentes se vuelven distintas únicamente porque sus mecanismos se intercalaron de otra manera. El modelo semántico debe decidir primero qué observaciones distinguen los programas concurrentes; después se pueden evaluar las planificaciones operacionales según esa decisión.

## Ejemplo real: la EVM {#real-example-the-evm}

La máquina virtual de Ethereum (EVM) se puede entender operacionalmente:

*   **Estado**: contador de programa, pila, memoria, almacenamiento y gas
*   **Reglas de transición**: una por cada código de operación (`ADD`, `PUSH`, `SSTORE`, etc.)
*   **Ejecución**: se aplican repetidamente reglas de pequeños pasos hasta detenerse

El bytecode de la EVM son datos de instrucciones de primer orden. Una descripción operacional especifica cómo cambia una configuración de la EVM para cada código de operación; un cliente concreto implementa ese comportamiento.

Su ciclo de despacho y su contador de programa pueden parecerse a una máquina abstracta defuncionalizada. Sin embargo, llamarlos continuaciones defuncionalizadas exige un origen de orden superior, una transformación y una correspondencia concretos; no basta con que un ciclo tenga un aspecto parecido.

## Romper el ciclo: el significado antes que la maquinaria {#breaking-the-cycle-meaning-before-machinery}

Las descripciones operacionales y denotacionales responden a preguntas distintas:

$$ \begin{aligned} \llbracket p \rrbracket &\in D && \text{what does the program mean?} \\ c &\longrightarrow c' && \text{how does this representation step?} \end{aligned} $$

Un desarrollo guiado por el significado elige el dominio semántico, la composición, las observaciones y las leyes antes de comprometerse con una representación de máquina. Una vez elegido un sistema de transición, su obligación de corrección conecta ambas capas. Para un significado de configuraciones completas definido adecuadamente, una afirmación típica de preservación de pasos silenciosos tiene esta forma:

$$ c \longrightarrow c' \quad \Longrightarrow \quad \operatorname{meaning}(c) = \operatorname{meaning}(c') $$

La relación exacta puede usar equivalencia observacional, trazas o bisimilaridad. Lo importante es que la máquina responda ante el significado pretendido.

El diseño denotacional no elige un ganador del ciclo. Establece una fuente estable de autoridad fuera de él:

1.  Define el dominio semántico, las operaciones, la composición y las leyes.
2.  Escribe los programas en términos de ese significado.
3.  Elige una representación para un consumidor concreto: ejecución directa, inspección, compilación, planificación, serialización o análisis.
4.  Relaciona cada representación y transformación elegida con el mismo significado.

Por tanto, pueden coexistir un intérprete de orden superior y un programa de primer orden. Ninguno tiene que ser la definición del lenguaje. El primero puede servir para la ejecución directa; el segundo, para los consumidores que necesitan estructura. Que concuerden es una obligación semántica, no una suposición de que sus mecanismos sean idénticos.

```admonish note title="No existe una abstracción operacional definitiva"
Toda representación operacional expone parte de la estructura y oculta otra. El significado es el punto estable desde el que se pueden elegir y relacionar las representaciones adecuadas.
```

## Resumen {#summary}

*   La semántica operacional describe la evaluación o las transiciones de una representación elegida.
*   Las mónadas libres proporcionan sintaxis de instrucciones y secuenciación, cuyo comportamiento aún requiere interpretación.
*   CPS hace explícitas las continuaciones; las reglas operacionales pueden describir cómo los programas CPS pasan valores y control.
*   La defuncionalización puede convertir un programa concreto de orden superior en una máquina de primer orden cuyas transiciones se describen operacionalmente.
*   Tratar cualquiera de estas codificaciones como universal genera un ciclo de reificación y ocultación de estructuras.
*   El significado denotacional determina qué deben preservar esas transiciones.
