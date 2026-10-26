<!-- reader: {"title":"Defuncionalización","sourceHash":"sha256:eb2496c232c1ef2750b59b1d678f25bd0220c3b91a597bbaa8714bcdfb620c6f"} -->

# Defuncionalización {#defunctionalization}

```admonish tip title="Relacionado"
Diseño basado en el significado en Rust: [Programas de primer orden](../rust-dd/first-order-programs.md), [Lenguaje y procesos de compilación](../rust-dd/compiler-pipelines.md)  
Conceptos: [Mónada libre](free_monad.md), [Estilo de paso de continuaciones](cps.md)  
Perspectivas: [Álgebra EVM](../insights/evm-alg.md)
```

```admonish note title="Ubicación semántica"
La defuncionalización cambia la representación con la intención de preservar el comportamiento de aplicación. En el diseño guiado por el significado, los valores generados de primer orden son útiles cuando otro intérprete debe inspeccionar o componer operaciones antes de ejecutarlas.
```

## Definición {#definition}

La defuncionalización es una transformación de programas que reemplaza las funciones de orden superior por una estructura de datos de primer orden que representa las funciones posibles, junto con una función intérprete que las aplica.

## Motivación {#motivation}

Algunos lenguajes, compiladores o entornos de ejecución no pueden manejar funciones de orden superior de manera eficiente, o no pueden manejarlas en absoluto. Al defuncionalizar, el programa se convierte en un programa totalmente de primer orden, más fácil de compilar, analizar, serializar o ejecutar en entornos restringidos.

## El proceso {#the-process}

1.  Identifica todas las funciones de orden superior posibles que se pueden crear y pasar de un lugar a otro.
2.  Asigna a cada función una etiqueta única en una enumeración o tipo suma, junto con los datos que necesita para funcionar.
3.  Reemplaza los valores de función por estas etiquetas.
4.  Define una función `apply` que tome una etiqueta y los argumentos de la función, y luego use una coincidencia de patrones con la etiqueta para ejecutar el código adecuado.

## Ejemplo en Rust {#example-in-rust}

Antes: usar un cierre

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

Después: forma defuncionalizada

```rust,noplayground
enum Cont {
    Add1
}

fn apply(c: Cont, x: i32) -> i32 {
    match c {
        Cont::Add1 => x + 1,
    }
}

println!("{}", apply(Cont::Add1, 41));
```

## Propiedades {#properties}

*   Todas las funciones se representan ahora mediante datos simples.
*   El programa queda reducido a primer orden.
*   La función `apply` reemplaza las llamadas directas a funciones.

## Aplicaciones {#applications}

*   Simplificación del backend del compilador: muchos compiladores generan código CPS y después lo defuncionalizan.
*   Serialización de funciones: es posible enviar la etiqueta de la enumeración por una red o guardarla en un archivo.
*   Análisis estático: el código de primer orden es más fácil de analizar.
*   Derivación de intérpretes: la defuncionalización conduce de forma natural al patrón Intérprete.

## Relación con CPS {#relation-to-cps}

En CPS (estilo de paso de continuaciones), las continuaciones son funciones de orden superior. Defuncionalizar código CPS convierte estas continuaciones en un conjunto finito de casos de una enumeración, junto con una función de aplicación.

## Relación con las mónadas libres {#relation-to-free-monads}

Las representaciones adecuadas de mónadas libres pueden relacionarse con las continuaciones defuncionalizadas de programas transformados a CPS. Es una conexión estrecha, no una identidad universal entre ambas construcciones.

## Aplicación de tipos a nivel de tipos {#type-level-application}

La defuncionalización también permite codificar la aplicación de tipos a nivel de tipos en lenguajes sin tipos de orden superior nativos. El [experimento de álgebra de objetos en C#](https://github.com/tgrospic/object-algebras) aplica esta codificación ligera mediante `App<F, a>` para expresar álgebras de funtores, aplicativos, mónadas y efectos.

## Referencias {#references}

*   Reynolds, J. C. (1972). *Definitional Interpreters for Higher-Order Programming Languages*.  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J. y White, L. (2014). *Lightweight Higher-Kinded Polymorphism* (usa la defuncionalización para codificar la aplicación a nivel de tipos).  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
