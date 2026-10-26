<!-- reader: {"title":"Denotaciones y composicionalidad","sourceHash":"sha256:f23d995771d04278d7ee0f0a93000f60dfc435559082912084c4a6f5828256b2"} -->

# Denotaciones y composicionalidad {#denotations-and-compositionality}

```admonish tip title="Relacionado"
La perspectiva semántica: [Por qué el significado va primero](semantic-view.md), [Diseño denotacional](design.md), [Leyes e interpretaciones](laws-and-interpretations.md)  
Diseño por significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md)  
Conceptos: [Transparencia referencial](../concepts/referential_transparency.md), [Ramificación y confluencia](../concepts/branching.md)
```

```admonish note title="Idea central"
Una denotación es una función de significado desde la sintaxis hacia un dominio semántico elegido. Una semántica es composicional cuando el significado del todo queda determinado por los significados de sus partes, lo que permite la igualdad semántica y la sustitución segura.
```

Una **denotación** es el significado asignado a un fragmento de sintaxis o a una construcción de programación. A menudo escribimos:

$$ \llbracket e \rrbracket $$

para «el significado de la expresión `e`».

Los corchetes no exigen que la denotación sea un número. Según el dominio, un programa puede denotar:

*   un valor
*   una función
*   una relación
*   un conjunto de resultados posibles
*   una transformación de estado
*   una distribución de probabilidad
*   el comportamiento de un proceso
*   un resultado parcial

Por tanto, la primera decisión de diseño no es «¿qué estructura debe contener esto?», sino «¿qué dominio semántico contiene los significados que nos importan?».

## Dominios semánticos {#semantic-domains}

Para expresiones aritméticas, un dominio sencillo puede ser el de los números enteros:

$$ \llbracket e \rrbracket_{eval} \in \mathbb{Z} $$

Para el formato, el mismo lenguaje de expresiones puede interpretarse como texto:

$$ \llbracket e \rrbracket_{pretty} \in \mathsf{String} $$

Para un cálculo con efectos, el dominio podría ser una transformación de estado:

$$ \llbracket p \rrbracket : \mathsf{State} \to \mathsf{Result} \times \mathsf{State} $$

Para un lenguaje concurrente, el dominio puede describir el comportamiento observable del proceso en lugar de una única traza predeterminada.

El dominio elegido determina qué diferencias tienen significado. Si el tiempo no forma parte del dominio, dos implementaciones con distintos tiempos pueden denotar el mismo programa. Si se incluye el consumo de recursos, esa misma diferencia puede volverse semántica.

## La abstracción omite detalles intencionalmente {#abstraction-forgets-intentionally}

Una denotación útil omite detalles irrelevantes de la máquina.

Para una posición de ramificación, la denotación puede conservar el camino desde la raíz y omitir:

*   disposición de bytes
*   estrategia de asignación
*   comportamiento de la caché
*   formato de serialización

Para un programa HTTP, una denotación portable puede conservar el método, la ruta, los roles de entrada, la operación y el rol de salida, y omitir qué enrutador o ejecutor lo alojará.

Para una fase del compilador, la denotación puede conservar la traducción desde el código fuente normalizado hasta el significado ejecutable, y omitir los búferes temporales y el orden de recorrido.

Omitir no es un defecto. Es lo que hace equivalentes a representaciones alternativas.

## Composicionalidad {#compositionality}

Una semántica es **composicional** cuando el significado del todo viene determinado por los significados de sus partes y por cómo se combinan.

Para la suma:

$$ \llbracket a + b \rrbracket = \llbracket a \rrbracket + \llbracket b \rrbracket $$

Para la composición secuencial de funciones:

$$ \llbracket g \circ f \rrbracket = \llbracket g \rrbracket \circ \llbracket f \rrbracket $$

Para un operador de procesos paralelos, el dominio semántico necesita una composición paralela correspondiente:

$$ \llbracket P \mid Q \rrbracket = \llbracket P \rrbracket \otimes \llbracket Q \rrbracket $$

El operador exacto $\otimes$ depende del modelo de proceso elegido. Lo importante es que la composición sintáctica se corresponda sistemáticamente con la composición semántica.

La composicionalidad permite razonar localmente. Si dos partes tienen la misma denotación, una puede sustituirse por la otra dentro de cualquier contexto composicional:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket \implies \llbracket C(P) \rrbracket = \llbracket C(Q) \rrbracket $$

Esta es la base de la sustitución segura y la refactorización semántica.

## Igualdad semántica {#semantic-equality}

Los programas no necesitan ser idénticos textual u operacionalmente para ser semánticamente iguales.

Considera dos implementaciones de una posición de ramificación:

$$ \lbrack \mathsf{Left}, \mathsf{Right}, \mathsf{Left} \rbrack $$

y una codificación entera que denota el mismo camino. Sus valores en memoria son distintos, pero sus denotaciones pueden ser iguales.

Del mismo modo, dos pasadas del compilador pueden recorrer la sintaxis en órdenes distintos y producir ejecutables con el mismo comportamiento especificado. Exigir igualdad byte por byte es una ley aparte y más fuerte.

Nombra siempre la igualdad que afirmas:

*   igualdad de valores
*   igualdad estructural
*   igualdad de representación canónica
*   equivalencia de trazas
*   bisimilaridad
*   equivalencia observacional
*   igualdad denotacional

Confundir estas igualdades es una fuente común de leyes falsas.

## La externalidad es relativa {#externality-is-relative}

Supongamos que un cálculo tiene el siguiente significado:

$$ H \times E \to O $$

Respecto de `H`, la evidencia `E` es externa. Si una nueva abstracción elige `H × E` como su portador, esa evidencia pasa a ser interna al nuevo límite.

Esta observación importa para los efectos y el contexto. Ningún hecho es «ambiental» de forma absoluta. La cuestión es si el portador semántico actual lo incluye y qué leyes lo rigen.

```admonish warning title="Evita un objeto de contexto universal"
No resuelvas esta cuestión de límites con un objeto de contexto universal. Nombra cada significado admitido como capacidad o valor explícito.
```

## Significado primitivo y derivado {#primitive-and-derived-meaning}

Las operaciones primitivas son el vocabulario elegido para el dominio semántico. Las operaciones derivadas se definen a partir de ellas.

Para posiciones de ramificación, un pequeño vocabulario primitivo podría incluir:

*   Una posición raíz
*   Crecer en una dirección
*   Observar el camino de una posición a otra

A partir de ello se pueden derivar:

*   Crecer a la izquierda
*   Crecer a la derecha
*   Construir a partir de un camino
*   Comprobar si una posición es antecesora de otra
*   Comprobar si una posición es descendiente de otra

La distinción es una decisión de diseño, no un hecho metafísico. Prefiere un conjunto primitivo reducido que facilite expresar leyes e interpretaciones alternativas.

## Una prueba útil {#a-useful-test}

Antes de introducir una interfaz de programación, completa estas frases:

*   Los valores de esta abstracción significan ...
*   Las observaciones primitivas son ...
*   Las composiciones significativas son ...
*   Dos valores son equivalentes cuando ...
*   Toda implementación debe preservar ...
*   La abstracción omite intencionalmente ...

Si no puedes completar estas frases, más mecanismos de implementación no aportarán el significado que falta.
