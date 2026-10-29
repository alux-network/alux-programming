<!-- reader: {"title":"Semántica operacional","sourceHash":"sha256:b0fd7a80a655265ccf484572fd71d0f46ba654a5b34cf4e5fd573d569b4198ed"} -->

# Semántica operacional {#operational-semantics}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](../denotational-design/design.md)  
Diseño basado en el significado en Rust: [Lenguaje y procesos de compilación](../rust-dd/compiler-pipelines.md)  
Conceptos: [Mónada libre](free_monad.md), [Estilo de paso de continuaciones](cps.md), [Defuncionalización](defunctionalization.md)  
Perspectivas: [De la semántica a las máquinas](../insights/operational_semantics.md)
```

## Definición {#definition}

La **semántica operacional** describe el comportamiento de un programa mediante juicios de evaluación o transiciones entre **configuraciones**. Una configuración puede contener un fragmento de programa junto con un entorno, un almacén, una continuación u otro estado abstracto de máquina.

La descripción es matemática: establece qué evaluaciones o transiciones son válidas. Un intérprete o una máquina virtual puede implementar esas reglas, pero una implementación concreta no es en sí misma la definición.

```admonish note title="Ubicación semántica"
La semántica operacional es una semántica precisa, no un mero detalle informal de implementación. Explica el comportamiento mediante reglas de evaluación o transición. [El diseño denotacional](../denotational-design/design.md) plantea una pregunta de diseño previa y complementaria: ¿qué significados composicionales y ecuaciones deberían preservar esas reglas?
```

## Estilos de semántica operacional {#styles-of-operational-semantics}

### Pequeños pasos (semántica operacional estructural) {#small-step-structural-operational-semantics}

El cálculo se divide en transiciones atómicas:

$$ \begin{aligned} 2 + 3 &\to 5 \\ (2 + 3) \cdot 4 &\to 5 \cdot 4 \to 20 \end{aligned} $$

Útil para modelar la concurrencia, la intercalación y la ejecución parcial.

### Grandes pasos (semántica natural) {#big-step-natural-semantics}

Describe la evaluación en términos de resultados finales:

$$ (2 + 3) \cdot 4 \Downarrow 20 $$

Suele facilitar el razonamiento sobre programas que terminan.

## Reglas formales {#formal-rules}

La semántica operacional suele expresarse mediante **reglas de inferencia**. Para un lenguaje aritmético sencillo:

$$ E ::= n \mid E + E $$

Para la evaluación de izquierda a derecha, se necesitan tres reglas:

$$ \frac{E_1 \to E_1'}{E_1 + E_2 \to E_1' + E_2} \qquad \frac{E_2 \to E_2'}{n + E_2 \to n + E_2'} \qquad n_1 + n_2 \to n_3 \quad \text{where } n_3 = n_1 + n_2 $$

Las dos primeras reglas seleccionan la siguiente subexpresión reducible. La tercera realiza la suma cuando ambos operandos son valores.

Traza de evaluación:

$$ (1 + 2) + 3 \to 3 + 3 \to 6 $$

## Por qué es importante {#why-it-matters}

*   Proporciona un **modelo de ejecución preciso, similar a una máquina**.
*   Sirve de base para intérpretes y máquinas virtuales.
*   Permite razonar sobre corrección, uso de recursos y seguridad.

## Relación con otros conceptos {#relation-to-other-concepts}

*   Una **mónada libre** proporciona sintaxis de instrucciones y secuenciación. Las reglas operacionales pueden describir cómo se evalúa un programa en esa representación.
*   **CPS** hace explícito el resto del cálculo mediante una continuación. Las reglas operacionales pueden describir cómo se pasan valores a esas continuaciones.
*   La **defuncionalización** reemplaza una familia conocida de funciones por datos de primer orden y una operación `apply`. Las reglas operacionales pueden describir los estados explícitos de máquina resultantes.

Estos son objetos y transformaciones a los que se puede asignar una semántica operacional. No son semántica operacional en sí mismos.

## En la práctica {#in-practice}

Las reglas operacionales pueden guiar un intérprete y ofrecer un modelo preciso con el que comprobarlo:

*   La **EVM** se puede modelar de manera natural como un sistema de transición de estados de pequeños pasos, mientras que una ejecución completa que termina también puede relacionarse mediante un juicio de grandes pasos.
*   Las reglas de pequeños pasos suelen corresponder directamente a `match` brazos de coincidencia en un intérprete de Rust.

$$ n_1 + n_2 \to n_3 $$

La relación completa de izquierda a derecha anterior se puede representar con código Rust:

```rust,noplayground
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
}

fn step(expr: Expr) -> Option<Expr> {
    match expr {
        Expr::Num(_) => None,
        Expr::Add(left, right) => match (*left, *right) {
            (Expr::Num(a), Expr::Num(b)) => Some(Expr::Num(a + b)),
            (left @ Expr::Num(_), right) => step(right).map(|next| {
                Expr::Add(Box::new(left), Box::new(next))
            }),
            (left, right) => step(left).map(|next| {
                Expr::Add(Box::new(next), Box::new(right))
            }),
        },
    }
}
```

Esta función realiza una transición. Las aplicaciones repetidas producen la traza mostrada; devolver `None` significa que la expresión ya es un valor.

## Preguntas operacionales y denotacionales {#operational-and-denotational-questions}

Las reglas operacionales pueden demostrar seguridad, progreso, límites de recursos y correspondencia con las implementaciones. La limitación aparece cuando se elige primero la maquinaria operacional, antes de definir el significado abstracto pretendido: las decisiones de implementación pueden convertirse accidentalmente en compromisos semánticos.

El diseño denotacional no rechaza la semántica operacional. Nos pide definir primero el dominio semántico, la composición y las leyes, y después relacionarlos con el modelo operacional.

| Perspectiva | Pregunta |
| --- | --- |
| Denotacional | ¿Qué significa el programa completo? |
| Operacional | ¿Mediante qué transiciones se evalúa? |
| Corrección | ¿Preservan esas transiciones el significado pretendido? |

Los siguientes vídeos ilustran el peligro de tratar las descripciones operacionales como la única fuente de conocimiento.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=jx2yItB8ZvudwCr1&amp;clip=UgkxKN5lzq4a3MYoVuIS777H2gAV9GZt7wRz&amp;clipt=EMjRxAUYh-jHBQ&amp;start=11610&amp;end=11663" title="Talk clip — operational description is not the whole meaning (1 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>La descripción operacional no abarca todo el significado (1 de 2)</figcaption></figure>

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=8imhBQPvY7AS-Nld&amp;clip=UgkxNwvDlj5QXGj_A9GAyZm4hQsq9cXeiOqe&amp;clipt=EL3qrwMYmuSxAw&amp;start=7075&amp;end=7108" title="Talk clip — operational description is not the whole meaning (2 of 2)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>La descripción operacional no abarca todo el significado (2 de 2)</figcaption></figure>
