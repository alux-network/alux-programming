<!-- reader: {"title":"Ramificación y confluencia","sourceHash":"sha256:5f5f2bd836aff683d4aeb745963ca7b9e19c5f2a9ed3cdd1f2b1038bacda97fa"} -->

# Ramificación y confluencia {#branching-and-confluence}

```admonish tip title="Relacionado"
La perspectiva semántica: [Denotaciones y composicionalidad](../denotational-design/denotations.md), [Leyes e interpretaciones](../denotational-design/laws-and-interpretations.md)  
Diseño basado en el significado en Rust: [Leyes, escenarios y pruebas](../rust-dd/laws.md)  
Conceptos: [Semántica operacional](operational_semantics.md)
```

La ramificación, el determinismo, la confluencia, la equivalencia de trazas y la bisimulación se refieren a alternativas en el cálculo. No son la misma propiedad.

```admonish note title="Ubicación semántica"
La ramificación del flujo de control es estructura operacional. La confluencia es una propiedad de una relación de reducción. La equivalencia de trazas y la bisimulación comparan comportamientos. La igualdad denotacional compara significados en un dominio semántico elegido. Un diseño sólido especifica qué igualdad necesita, en vez de alternar informalmente entre estas nociones.
```

## Equivalencia de comportamiento {#behavioral-equivalence}

Los programas concurrentes e interactivos rara vez tienen un único resultado final. Un punto de partida habitual es un **sistema de transición etiquetado**:

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

donde $S$ es un conjunto de estados, $A_{\tau}$ es un conjunto de etiquetas de acciones observables junto con una acción interna $\tau$, y $\to\;\subseteq S \times A_{\tau} \times S$ es la relación de transición. Escribimos $p \xrightarrow{a} p'$ cuando el estado $p$ puede realizar la acción $a$ y pasar al estado $p'$.

Una equivalencia de comportamiento especifica qué diferencias entre estos sistemas se omiten deliberadamente:

*   las **observaciones de tiempo lineal** siguen ejecuciones completas o parciales y registran lo que ocurrió durante ellas
*   las **observaciones de tiempo ramificado** también conservan dónde había alternativas disponibles y cuándo se resolvieron las elecciones

Por tanto, dos sistemas pueden admitir las mismas trazas y, aun así, diferir en su estructura de ramificación. Uno puede elegir entre dos acciones antes de una interacción, mientras que el otro aplaza la elección hasta después. Las secuencias de acciones coinciden, pero sus posibilidades futuras no.

El [espectro de tiempo lineal y tiempo ramificado](https://ir.cwi.nl/pub/5685/5685.pdf) de van Glabbeek ofrece el análisis sistemático estándar de estas equivalencias de comportamiento. No es una escala de débil a fuerte: cada punto conserva un conjunto distinto de observaciones.

## Ramificación en programas de Rust {#branching-in-rust-programs}

Un `if` selecciona una rama según una condición:

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

Un `match` selecciona una rama según un valor:

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

Con entradas fijas en un lenguaje determinista, estas construcciones seleccionan una ruta de flujo de control predecible. Esa propiedad es el **determinismo**, no la confluencia.

## Qué significa la confluencia {#what-confluence-means}

Una relación de reducción es confluente cuando dos reducciones desde el mismo término pueden volver a unirse:

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

Formalmente, si:

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

entonces debe existir algún `d` tal que:

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

La confluencia permite más de una ruta de reducción. Afirma que esas rutas son compatibles, en el sentido de que pueden alcanzar un sucesor común.

## Determinismo y confluencia {#determinism-and-confluence}

Una relación de reducción determinista tiene como máximo un siguiente paso desde cada estado. Por tanto, es confluente en un sentido directo: no hay elecciones simultáneas en conflicto que reconciliar.

La implicación inversa no se cumple. Un sistema puede permitir varios órdenes de reducción y seguir siendo confluente porque todos terminan coincidiendo.

Las expresiones `if` y `match` ordinarias de Rust muestran una selección determinista. Por sí solas no ilustran el contenido interesante de la confluencia.

## Church–Rosser {#churchrosser}

El teorema de Church–Rosser establece una propiedad de confluencia para la reducción del cálculo lambda. Si un término se reduce a dos resultados por rutas distintas, ambos tienen un reducto común.

Si existe una forma normal, la confluencia implica que es única. Esto respalda el razonamiento ecuacional, porque el orden de evaluación no cambia la forma normal final.

No generalices este resultado a programas imperativos arbitrarios. Los efectos secundarios, la planificación no determinista, los fallos y la observación de estados intermedios pueden distinguir los órdenes de reducción.

## Trazas {#traces}

Una **traza** registra una secuencia de acciones o estados observables. La semántica de trazas conserva intencionalmente más información operacional que una semántica basada solo en resultados.

Dos funciones puras pueden devolver el mismo resultado tras distintos pasos internos. Son iguales en una denotación de resultados si se omiten esos pasos. No necesariamente son iguales en una semántica de trazas.

Con efectos, cambiar el orden de las condiciones puede cambiar las observaciones:

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

Comprobar primero `is_admin` y después `is_user` puede dar clasificaciones equivalentes, pero producir trazas distintas.

La pregunta de diseño es si esas impresiones pertenecen al dominio semántico elegido.

## Equivalencia de trazas {#trace-equivalence}

Dos sistemas son equivalentes según las trazas cuando admiten las mismas trazas observables bajo el modelo de trazas seleccionado.

La equivalencia de trazas puede omitir la estructura de ramificación. Dos sistemas pueden generar las mismas trazas aunque uno se comprometa con una elección antes que el otro. En sistemas interactivos y concurrentes, esa diferencia puede importar.

## Bisimulación {#bisimulation}

La bisimulación relaciona dos sistemas de transición paso a paso. Cada vez que un sistema realiza un movimiento observable, el otro debe poder igualarlo, y los estados resultantes deben seguir relacionados.

Entre las variantes habituales se encuentran:

*   la **bisimulación fuerte**, que iguala transiciones individuales
*   la **bisimulación débil**, que abstrae ciertas transiciones internas
*   la **bisimulación ramificada**, que abstrae el trabajo interno y conserva estructuras de elección importantes

La bisimulación suele ser una comparación de comportamiento más fuerte que la equivalencia de trazas, porque observa cómo se mantienen disponibles las alternativas durante la interacción.

<details>
<summary><strong>Orígenes y definiciones formales</strong></summary>

Milner desarrolló la equivalencia observacional para procesos comunicantes en [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf). Park caracterizó después la equivalencia correspondiente mediante coinducción en [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf), e introdujo la relación de punto fijo mayor y el método de demostración que hoy conocemos como bisimulación. Milner adoptó y desarrolló este método como fundamento para razonar sobre el comportamiento de procesos.

**Bisimulación fuerte.** Para sistemas de transición etiquetados, una relación $R$ es una bisimulación fuerte cuando $p\mathrel{R}q$ implica, para cada acción $a$:

*   si $p\xrightarrow{a}p'$, entonces existe algún $q'$ que satisface $q\xrightarrow{a}q'$ y $p'\mathrel{R}q'$; y
*   si $q\xrightarrow{a}q'$, entonces existe algún $p'$ que satisface $p\xrightarrow{a}p'$ y $p'\mathrel{R}q'$.

Dos estados son bisimilares cuando alguna bisimulación los relaciona. La definición es coinductiva: tras igualar una transición, los estados sucesores deben volver a cumplir la misma obligación de comportamiento.

**Bisimulación ramificada.** En una formulación habitual que ignora la divergencia, una relación simétrica $R$ es una bisimulación ramificada cuando $p\mathrel{R}q$ y $p\xrightarrow{a}p'$ implican alguna de estas posibilidades:

*   $a = \tau$ y $p'\mathrel{R}q$, o
    
*   existen estados $q_0$ y $q'$ tales que
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

Aquí, $\xRightarrow{\tau}$ denota cero o más transiciones internas. Exigir que el estado intermedio $q_0$ siga relacionado con $p$ es lo que preserva el potencial de ramificación pertinente, a la vez que permite ignorar el trabajo interno. Van Glabbeek y Weijland introdujeron y desarrollaron esta equivalencia en [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf).

</details>

## Igualdad denotacional {#denotational-equality}

La igualdad denotacional depende del dominio semántico seleccionado:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

El dominio puede construirse a partir de trazas, sistemas de transición considerados módulo de bisimulación, conjuntos de resultados u otro modelo matemático. El diseño denotacional no prescribe una igualdad universal. Exige elegirla explícitamente y usarla de forma composicional.

La relación es la siguiente:

1.  Empieza por el sistema operacional.
2.  Selecciona las observaciones pertinentes.
3.  Elige el dominio semántico y la igualdad.

## Ramificación como dato {#branching-as-data}

La ramificación también aparece estructuralmente en árboles. Una ruta binaria puede representarse como una secuencia de decisiones izquierda/derecha. Esta representación resulta útil para tries, identificadores de ejecución, diagramas de decisión y direccionamiento de memoria.

El ejemplo de posición de rama semántica en [Por qué el significado va primero](../denotational-design/semantic-view.md) separa deliberadamente este significado arbóreo de una codificación con vectores de bits.

Conal Elliott ha descrito el direccionamiento de memoria mediante la estructura de árbol binario perfecto de hojas. La idea no es que todas las máquinas almacenen literalmente un árbol del código fuente, sino que un modelo composicional basado en árboles puede revelar estructuras útiles que quedan ocultas por las direcciones numéricas planas.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott: direccionamiento de memoria como árbol binario perfecto de hojas</figcaption></figure>

## Comparación {#comparison}

| Concepto | Objeto | Pregunta central |
| --- | --- | --- |
| Ramificación del flujo de control | Una ejecución del programa | ¿Qué continuación se selecciona? |
| Determinismo | Relación de transición | ¿El siguiente paso queda determinado de manera única? |
| Confluencia | Relación de reducción | ¿Se pueden volver a unir las reducciones divergentes? |
| Equivalencia de trazas | Secuencias de acciones observables | ¿Admiten los sistemas las mismas trazas? |
| Bisimulación | Estructura de transiciones ramificadas | ¿Pueden los sistemas igualar los movimientos del otro? |
| Igualdad denotacional | Dominio semántico elegido | ¿Tienen los programas el mismo significado especificado? |

Estas nociones pueden respaldarse entre sí, pero ninguna debe usarse como sinónimo de otra.

## Para seguir leyendo {#further-reading}

*   [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf) — desarrollo fundacional de CCS y de la equivalencia observacional de Milner
*   [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) — caracterización coinductiva de la bisimulación de Park
*   [*Algebraic Laws for Nondeterminism and Concurrency*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf) — análisis de Hennessy y Milner sobre congruencia observacional y leyes algebraicas
*   [*What Is Branching Time and Why Use It?*](https://theory.stanford.edu/~rvg/branching/) ([PDF comprimido](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)) — motivación concisa para preservar la estructura de ramificación
*   [*The Linear Time–Branching Time Spectrum*](https://ir.cwi.nl/pub/5685/5685.pdf) — taxonomía estándar de equivalencias de comportamiento
*   [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf) — estudio fundacional de la bisimulación ramificada
*   [*Three Logics for Branching Bisimulation*](https://ir.cwi.nl/pub/1370/1370D.pdf) — caracterizaciones lógicas mediante lógicas al estilo de Hennessy–Milner y CTL\* sin operador de tiempo siguiente
