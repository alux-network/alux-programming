<!-- reader: {"title":"Estilo de paso de continuaciones"} -->

# Estilo de paso de continuaciones (CPS) {#continuation-passing-style-cps}

```admonish tip title="Relacionado"
Diseño basado en el significado en Rust: [Programas de primer orden](../rust-dd/first-order-programs.md), [Lenguaje y procesos de compilación](../rust-dd/compiler-pipelines.md)  
Conceptos: [Mónada libre](free_monad.md), [Defuncionalización](defunctionalization.md)  
Perspectivas: [Álgebra EVM](../insights/evm-alg.md)
```

```admonish note title="Ubicación semántica"
CPS es una representación y transformación de programas que hace explícito el control. Que preserve el significado depende de una semántica de origen y otra de destino, además de la correspondencia entre ellas.
```

## Definición {#definition}

El estilo de paso de continuaciones (CPS) es una forma de escribir programas en la que las funciones no devuelven valores directamente. En su lugar, pasan el resultado a otra función llamada *continuación*, que representa el resto del programa.

## Motivación {#motivation}

*   Hace explícito el flujo de control y permite programarlo.
*   Permite transformaciones avanzadas, como la E/S no bloqueante, las salidas anticipadas, las corutinas, el retroceso y la planificación concurrente.
*   Se usa en representaciones intermedias de compilador para simplificar la optimización y el análisis.

## Forma básica {#basic-form}

En estilo directo:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    let y = add_one(41);
    println!("{}", y);
}
```

En CPS:

```rust
fn add_one_cps(x: i32, k: impl Fn(i32)) {
    k(x + 1)
}

fn main() {
    add_one_cps(41, |y| {
        println!("{}", y);
    });
}
```

Aquí, `k` es la continuación. En lugar de devolver `x + 1`, llamamos a `k(x + 1)`.

## Propiedades clave {#key-properties}

*   Todas las llamadas a funciones son *llamadas de cola* a continuaciones.
*   El cálculo actual nunca «vuelve» al llamador; en su lugar, salta a la continuación.
*   El flujo de control queda explícito en el programa.

## Relación con las funciones de orden superior {#relation-to-higher-order-functions}

*   En CPS, las continuaciones no son más que funciones de orden superior.
*   Cada paso del cálculo recibe una continuación que representa lo que debe hacerse a continuación.

## Relación con la defuncionalización {#relation-to-defunctionalization}

*   En CPS, la continuación es un valor de función real.
*   La defuncionalización reemplaza la función de continuación por una estructura de datos (una enumeración) que representa los siguientes pasos posibles, junto con una función `apply` que los interpreta.

## Relación con las mónadas libres {#relation-to-free-monads}

*   El constructor `FlatMap` de una mónada libre almacena precisamente una continuación.
*   Interpretar una mónada libre es como ejecutar código CPS cuya continuación forma parte de los datos del programa.
*   Las codificaciones adecuadas de mónadas libres pueden relacionarse con CPS y con las representaciones de continuaciones defuncionalizadas.

## Ventajas {#advantages}

*   Representación flexible del flujo de control.
*   Facilita el razonamiento sobre el orden de evaluación.
*   Es muy útil para implementar intérpretes, depuradores, optimizadores y entornos de ejecución asíncronos.

## Desventajas {#disadvantages}

*   Es más verboso que el estilo directo.
*   Puede ser más difícil de leer para las personas.
*   Requiere optimización de llamadas de cola para ser eficiente en lenguajes que no la admiten de forma nativa.
