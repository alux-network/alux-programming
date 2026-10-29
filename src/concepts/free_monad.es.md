<!-- reader: {"title":"Mónada libre","sourceHash":"sha256:1d74262c1053f3cc50c6a3c49b8b9b7eddfb3c6ab6f247530387d19b335f4626"} -->

# Mónada libre {#free-monad}

```admonish tip title="Relacionado"
Diseño basado en el significado en Rust: [Programas de primer orden](../rust-dd/first-order-programs.md), [Intérpretes y efectos](../rust-dd/interpreters.md)  
Conceptos: [Estilo de paso de continuaciones](cps.md), [Defuncionalización](defunctionalization.md)  
Perspectivas: [Álgebra EVM](../insights/evm-alg.md)
```

```admonish note title="Ubicación semántica"
Una mónada libre es una representación de la sintaxis de instrucciones con una secuenciación generada libremente. El functor de instrucciones ya determina un vocabulario; luego, un intérprete transforma esa sintaxis en un dominio semántico. Es una codificación potente, no la definición del diseño denotacional.
```

## Qué es una mónada libre (versión de Rust) {#what-is-a-free-monad-rust-version}

Una **mónada libre** permite:

*   **Describir** un programa como *datos*, en lugar de ejecutarlo de inmediato.
*   **Interpretar** ese programa más adelante de una o varias maneras.

Imagínala así:

> Un AST de operaciones con efectos + `bind`/`flat_map` para encadenarlas.

Separas:

*   **Sintaxis** → enumeración de instrucciones.
*   **Interpretación** → aplicación que preserva la estructura y lleva a un dominio semántico elegido.

«Libre» significa que la estructura de mónada se genera a partir de un functor `F` sin añadir ecuaciones aparte de las leyes de mónada. La elección de `F` ya determina la sintaxis de las instrucciones; al interpretar el programa resultante se obtiene una denotación concreta.

## Implementación en Rust {#rust-implementation}

```admonish warning title="Codificación esquemática"
Rust no admite directamente parámetros de tipo de orden superior, por lo que una implementación de producción de una mónada libre necesita maquinaria adicional a nivel de tipos o un functor de instrucciones especializado. El siguiente código ilustra la forma pretendida; no es una implementación genérica lista para usar.
```

### Tipo de mónada libre {#free-monad-type}

```rust,noplayground
#[derive(Clone)]
enum Free<F, A> {
    Pure(A),
    Suspend(F),
    FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>),
}

impl<F: Clone + 'static, A: 'static> Free<F, A> {
    fn pure(a: A) -> Self {
        Free::Pure(a)
    }

    fn flat_map<B: 'static, G>(self, f: G) -> Free<F, B>
    where
        G: Fn(A) -> Free<F, B> + 'static,
        F: 'static,
    {
        match self {
            Free::Pure(a) => f(a),
            Free::Suspend(op) => {
                Free::FlatMap(Box::new(Free::Suspend(op)), Box::new(f))
            }
            Free::FlatMap(inner, g) => {
                Free::FlatMap(inner, Box::new(move |x| g(x).flat_map(f.clone())))
            }
        }
    }
}
```

### DSL: operaciones de consola {#dsl-console-operations}

```rust,noplayground
#[derive(Clone)]
enum Console<A> {
    Print(String, A),
    ReadLine(fn(String) -> A),
}

// Smart constructors
fn print_line(s: &str) -> Free<Console<()>, ()> {
    Free::Suspend(Console::Print(s.to_string(), ()))
}

fn read_line() -> Free<Console<String>, String> {
    Free::Suspend(Console::ReadLine(|input| Free::Pure(input)))
}
```

### Intérprete {#interpreter}

```rust,noplayground
fn run_console<A>(mut prog: Free<Console<A>, A>) -> A {
    loop {
        match prog {
            Free::Pure(a) => return a,
            Free::Suspend(Console::Print(s, next)) => {
                println!("{}", s);
                prog = Free::Pure(next);
            }
            Free::Suspend(Console::ReadLine(f)) => {
                let mut buf = String::new();
                std::io::stdin().read_line(&mut buf).unwrap();
                prog = f(buf.trim().to_string());
            }
            Free::FlatMap(inner, cont) => match *inner {
                Free::Pure(a) => prog = cont(a),
                Free::Suspend(op) => prog = Free::Suspend(op), // minimal handling
                _ => unimplemented!(),
            },
        }
    }
}
```

### Uso {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## Conclusión {#takeaway}

*   **Sintaxis** = `enum Console` (instrucciones posibles)
*   **Programa** = `Free<Console, A>` (datos que describen los pasos)
*   **Interpretación concreta** = `run_console`
*   Ventaja: Puedes escribir varios intérpretes para un mismo programa; por ejemplo, ejecutarlo con IO real, registrarlo en un archivo o compilarlo a otro lenguaje.

## Relación con las continuaciones y CPS {#correlation-to-continuations-and-cps}

**El estilo de paso de continuaciones (CPS)** es una forma de escribir programas en la que las funciones nunca devuelven valores directamente, sino que pasan los resultados a otra función (la *continuación*), que representa «el resto del programa».

Una **mónada libre** es, básicamente, un **programa como secuencia de pasos**, donde cada paso dice:

> «Haz esto y luego continúa con el resto».

Ese «resto del programa» es precisamente una **continuación**: una función que transforma el resultado actual en el siguiente paso.

*   En nuestra mónada libre de Rust:
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>` **es la continuación**.
    
*   Al interpretar una mónada libre, estás **ejecutando en CPS**:
    
    *   En lugar de devolver los valores directamente, los pasas a la siguiente continuación.
    *   Se forma un ciclo de: `current_instruction -> feed result into continuation -> next instruction`
*   **Relación con CPS**:
    
    *   Las mónadas libres *codifican CPS en una estructura de datos*.
    *   CPS *es la representación del flujo de control durante la ejecución* de la misma idea.

**Correspondencias rápidas**:

| Concepto | En CPS | En el AST de la mónada libre |
| --- | --- | --- |
| Resultado del paso | Argumento de la continuación | `A` en `Fn(A) -> Free` |
| Continuación | Función `(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| Programa | Continuaciones anidadas | Variantes `FlatMap` anidadas |
| Ejecución | Llamadas a funciones | Coincidencia de patrones + llamadas |

## Correspondencia con los patrones de diseño GoF (Gang of Four) {#gof-gang-of-four-design-patterns-mapping}

Las mónadas libres **no** forman parte de GoF, porque proceden de la teoría de la programación funcional, pero **abarcan** o **emulan** varios patrones:

| Patrón GoF | Relación con la mónada libre |
| --- | --- |
| **Intérprete** | Todo el conjunto «AST + ejecutar» corresponde literalmente al patrón Intérprete; las mónadas libres proporcionan gratuitamente el AST y sus combinadores. |
| **Comando** | Cada variante `enum` del DSL es un objeto Comando. La mónada libre los encadena como un macrocomando. |
| **Compuesto** | La estructura del AST (instrucciones anidadas) es un compuesto de comandos. |
| **Constructor** | La cadena `.flat_map` funciona como un constructor fluido de programas. |
| **Visitante** | El intérprete es, en esencia, un visitante del conjunto de instrucciones. |

## Por qué las mónadas libres superan a estos patrones {#why-free-monad--these-patterns}

*   Los patrones GoF implican **trabajo manual de programación orientada a objetos**: hay que definir interfaces y clases, y componerlas.
    
*   Las mónadas libres son **algebraicas**: se definen *datos* para las instrucciones y *funciones* para interpretarlas.
    
*   Se obtienen automáticamente:
    
    *   Secuenciación (`flat_map`)
    *   Composición
    *   Varios intérpretes sin tocar la lógica central

**Tabla resumen**:

| Concepto de programación funcional de la mónada libre | Patrón equivalente de GoF / POO |
| --- | --- |
| Enumeración de instrucciones | Comando |
| AST del programa | Compuesto |
| Constructor `flat_map` | Constructor |
| Función intérprete | Intérprete / Visitante |
| Varios intérpretes | Estrategia |

## Relación con la defuncionalización {#relation-to-defunctionalization}

La **defuncionalización** es una transformación de programas que reemplaza las funciones de orden superior por una estructura de datos de primer orden que representa las funciones posibles, junto con un intérprete que las aplica.

En CPS, las continuaciones son funciones de orden superior. Defuncionalizar un programa CPS reemplaza esas continuaciones por una enumeración de casos y una función `apply` para ejecutarlos.

Con codificaciones adecuadas, una mónada libre puede relacionarse con las continuaciones defuncionalizadas de un programa transformado a CPS:

1.  Empieza con una versión CPS del programa. El «resto del programa» se lleva en funciones de continuación.
2.  Defuncionaliza esas funciones de continuación en un conjunto finito de casos de un tipo de datos.
3.  El tipo de datos de primer orden resultante puede tener la misma forma de instrucciones y continuaciones que una representación de mónada libre.

**Similitudes clave**

*   Tanto las mónadas libres como la defuncionalización producen una representación de los datos del cálculo y requieren un intérprete que les dé significado.
*   El caso `FlatMap` de una mónada libre contiene la continuación; la defuncionalización reemplaza ese cierre por un caso de un tipo de datos.

**Diferencias clave**

| Aspecto | Defuncionalización | Mónada libre |
| --- | --- | --- |
| Propósito | Técnica mecánica de compilador para eliminar funciones de orden superior | Construcción algebraica que separa la sintaxis de la semántica |
| Entrada | Cualquier programa de orden superior, a menudo en formato CPS | Un functor F que describe las instrucciones posibles |
| Salida | Enumeración de casos de función más una función de aplicación | AST `Free<F, A>` más intérpretes |
| ¿Es una mónada? | No necesariamente | Siempre es una mónada por construcción |
| Alcance | Transformación general | Patrón específico de programación funcional |

**Resumen** La defuncionalización es una técnica de transformación. Las mónadas libres son una construcción algebraica. En algunas representaciones guardan una relación estrecha, pero ninguna de las dos construcciones implica en general la otra sin supuestos adicionales.
