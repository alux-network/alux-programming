<!-- reader: {"title":"Lenguaje y procesos de compilación"} -->

# Canalizaciones de lenguaje y compilador {#language-and-compiler-pipelines}

```admonish tip title="Relacionado"
Diseño por significado en Rust: [Programas de primer orden](first-order-programs.md), [Intérpretes y efectos](interpreters.md)  
Conceptos: [Semántica operacional](../concepts/operational_semantics.md), [Defuncionalización](../concepts/defunctionalization.md)  
Perspectivas: [Álgebra de EVM](../insights/evm-alg.md)
```

```admonish note title="El significado no es la canalización"
Un compilador es más claro cuando el significado del lenguaje no se identifica con árboles del analizador, pasadas, bytecode o el bucle de máquina. La corrección es una ley de conmutación: ejecutar el programa compilado concuerda con la denotación del programa.
```

Es más fácil razonar sobre un compilador cuando el significado del lenguaje no se identifica con los árboles del analizador, las pasadas del compilador, el bytecode ni el bucle de una máquina virtual.

Este capítulo utiliza un lenguaje concurrente simplificado inspirado en Tolang para centrarse en la arquitectura semántica.

## Cuatro capas distintas {#four-distinct-layers}

Mantén separadas estas capas:

1.  Sintaxis fuente
2.  Lenguaje normalizado
3.  Representación ejecutable
4.  Ejecución de máquina

Una canalización típica es:

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

La operación de conveniencia es la composición:

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

El auxiliar compuesto no es la definición semántica de cada fase.

## La sintaxis aún no es significado {#syntax-is-not-yet-meaning}

La salida del analizador refleja las decisiones gramaticales:

*   puntuación
*   azúcar sintáctico
*   precedencia
*   fragmentos de texto fuente
*   representación generada del analizador

Estos aspectos importan para el diagnóstico y las herramientas, pero no tienen por qué definir el lenguaje central.

La normalización elimina variaciones sintácticas accidentales e introduce una forma menor que porta significado. Por ejemplo, varias formas superficiales de enlace pueden normalizarse a una sola operación central de restricción.

**Muchas formas fuente** → **un único constructor normalizado**

Esto crea un lugar donde enunciar las leyes posteriores del compilador y del entorno de ejecución.

## Significado denotacional y compilado {#denotational-and-compiled-meaning}

Sea:

$$ \llbracket - \rrbracket : Core \to D $$

asigna significados en el dominio semántico `D`.

La compilación produce valores ejecutables:

$$ compile : Core \to Executable $$

y la ejecución los observa:

$$ run : Executable \to D $$

La obligación central de corrección es un diagrama conmutativo:

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

En sistemas no deterministas o concurrentes, la igualdad puede ser equivalencia observacional, un conjunto de resultados, equivalencia de trazas o bisimilaridad, y no una igualdad ordinaria de valores. El modelo semántico debe elegir.

## Significado de los procesos concurrentes {#concurrent-process-meaning}

El cálculo reflexivo básico incluye ideas como:

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang amplía el cálculo básico de manera composicional. Una extensión de ese tipo añade la forma superficial

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

Este enlace crea un canal nuevo y limita su nombre al ámbito $P$; la literatura sobre cálculos de procesos llama *restricción* a esta operación. El núcleo reflexivo no tiene un operador de restricción primitivo. Véase [*A Reflective Higher-order Calculus*](https://doi.org/10.1016/j.entcs.2005.05.016) de Meredith y Radestock.

La máquina operacional puede implementarlos mediante un espacio de tuplas, colas, índices de coincidencia, registros de continuación y tareas concurrentes. Esos mecanismos no definen el lenguaje.

La capa semántica identifica el comportamiento observable de los procesos y las leyes estructurales. Algunas leyes candidatas para la composición paralela central son:

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

Las leyes para esta extensión de enlace nuevo son independientes. Algunos esquemas candidatos habituales son el renombrado alfa, la conmutación de enlaces distintos y la extrusión de alcance:

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

Aquí, $y \mathrel{\#} P$ significa que $y$ es nuevo respecto de $P$; $P\{y/x\}$ es un renombrado que evita la captura, y $\operatorname{FN}(P)$ es el conjunto de nombres de canal libres en $P$. Estos esquemas solo son leyes cuando la equivalencia observacional elegida los valida; no deben suponerse a partir de la sintaxis superficial ni inferirse de una disposición concreta de bytecode.

## La normalización como aplicación que preserva significado {#normalization-as-a-meaning-preserving-map}

Si los programas fuente `s₁` y `s₂` solo difieren por azúcar aceptado, la normalización debería hacer explícito su significado común:

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

Otras obligaciones útiles son:

*   el renombrado alfa preserva el significado normalizado
*   el ámbito léxico resuelve al enlace previsto
*   las posiciones fuente se conservan cuando los diagnósticos las requieren
*   las constantes de compilación se eliminan sin comportamiento en tiempo de ejecución
*   la sintaxis mal formada acumula diagnósticos según el contrato de la fase

Algunos proyectos requieren valores normalizados canónicos. Otros solo exigen equivalencia semántica. Indica cuál de los dos casos aplica.

## Capacidades de las etapas {#stage-capabilities}

```admonish warning title="Evita el compilador omnipotente"
No conviertas un único objeto de compilador gigantesco en la única interfaz de las etapas.
```

Un normalizador puede necesitar capacidades como:

*   Leer y ampliar el ámbito de vinculaciones
*   Resolver nombres del código fuente
*   Acumular diagnósticos
*   Construir términos normalizados

Un generador de código puede necesitar:

*   Asignar referencias ejecutables
*   Emitir instrucciones
*   Resolver variables normalizadas
*   Finalizar la estructura ejecutable

Expresa las entradas de cada etapa como extensiones de estas capacidades. Los entornos concretos almacenan mapas, arenas, contadores y diagnósticos, pero no son dueños del significado de la etapa.

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

Los nombres precisos de las capacidades varían según el compilador. Lo importante es explicitar las dependencias y mantener un mapa estable de las etapas.

## El analizador y el entorno de ejecución pueden conservar su forma operativa {#parser-and-runtime-can-remain-operational}

No es necesario obligar a todos los subsistemas a usar la misma codificación.

Un analizador puede depender principalmente de la maquinaria de gramática generada. Una máquina virtual puede depender de la mutación eficiente y la planificación. Pueden conservar su forma operativa y, aun así, implementar límites bien definidos:

| Etapa | Contrato |
| --- | --- |
| Analizador | Produce `Syntax` |
| Normalizador | Produce `Core` portador de significado |
| Generador de código | Preserva el significado en la forma ejecutable |
| Entorno de ejecución | Produce observaciones coherentes con el modelo del lenguaje |

El diseño denotacional no elimina las máquinas. Evita que las máquinas se conviertan silenciosamente en la semántica del lenguaje.

## Leyes y pruebas del compilador {#compiler-laws-and-tests}

Las pruebas más sólidas proceden de varias fuentes:

*   leyes de normalización para formas fuente equivalentes
*   conversiones de ida y vuelta entre análisis y formato legible, cuando corresponda
*   comparación de la evaluación semántica directa con la ejecución compilada
*   equivalencia de bytecode cuando se promete una salida canónica
*   escenarios de conformidad del entorno de ejecución
*   pruebas diferenciales entre intérpretes

```admonish warning title="La igualdad de bytes no es igualdad semántica"
No confundas la igualdad byte a byte con la igualdad semántica. La igualdad de bytes es una propiedad más estricta y útil solo cuando la compilación canónica forma parte de la especificación.
```

## Cómo prepara al lector {#how-this-prepares-the-reader}

Al leer una implementación de lenguaje guiada por el significado, busca:

*   sintaxis semántica o rasgos de capacidades
*   operaciones de normalización derivadas
*   contratos explícitos para las etapas
*   programas centrales de primer orden
*   leyes de sustitución, ámbito y composición
*   entornos delgados que interpretan capacidades de las etapas
*   maquinaria operativa de análisis, compilador y máquina virtual en los extremos

Esta perspectiva conecta el diseño denotacional con Tolang y muestra cómo los límites semánticos guían el diseño del lenguaje, la compilación y la interpretación durante la ejecución.
