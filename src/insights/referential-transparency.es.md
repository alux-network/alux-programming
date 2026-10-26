<!-- reader: {"title":"Transparencia referencial, reexaminada","sourceHash":"sha256:3f37fd77a20744f5881d426de372b671f438c12c29fc26e32f79a6cf91e6ab6a"} -->

# Transparencia referencial, reexaminada {#referential-transparency-reloaded}

```admonish tip title="Relacionado"
La perspectiva semántica: [Denotaciones y composicionalidad](../denotational-design/denotations.md), [Leyes e interpretaciones](../denotational-design/laws-and-interpretations.md)  
Diseño basado en el significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md), [Significado derivado y composición](../rust-dd/derived-meaning.md)  
Conceptos: [Transparencia referencial](../concepts/referential_transparency.md)
```

Esta página presenta la interpretación de la *transparencia referencial* en el diseño denotacional. La página sobre el concepto abarca su historia y el uso habitual del término en los lenguajes. Aquí nos centramos en lo que significa la RT como restricción de diseño.

En el diseño denotacional, la RT no es una etiqueta de pureza. Es una ley sobre denotaciones: la sustitución debe preservar el significado especificado.

## Reformulación de la RT en el diseño denotacional {#denotational-design-restatement-of-rt}

El diseño denotacional reformula la RT como un requisito de la especificación, no del estilo de implementación. La especificación debe definir primero el significado composicional; la estrategia de ejecución se elige después.

Por tanto, la RT se comprueba en el límite semántico:

*   mismas entradas
*   mismo contexto declarado
*   misma denotación

Si se cumplen estas condiciones, la sustitución es válida y se puede razonar mediante ecuaciones. Esto también se cumple cuando los intérpretes concretos realizan E/S, concurrencia, reintentos o transiciones de estado, porque esos detalles se delegan tras los límites de las capacidades especificadas.

En otras palabras, el diseño denotacional no pregunta «¿esta implementación es pura?». Pregunta «¿son explícitas las igualdades denotacionales y las preservan los intérpretes?».

## Pureza y RT {#purity-and-rt}

La RT y la pureza están relacionadas, pero no son idénticas.

*   La **RT** es una ley de sustitución sobre el significado.
*   La **pureza** es una restricción operacional: no hay efectos observables ocultos.

La pureza es una forma habitual de obtener RT en el código a nivel de expresiones. Pero la RT sigue siendo el criterio semántico: la sustitución debe preservar la denotación especificada.

Por eso, el diseño denotacional evita convertir la RT en una etiqueta de estilo como «solo código puro». El requisito son igualdades semánticas explícitas, con los efectos aislados tras límites de capacidades.

Una lectura semántica mínima es:

```rust,noplayground
fn f(a: A, io: Io) -> (Result<B, E>, Io)
```

Para las mismas entradas `a` y `io`, `f` produce la misma `(result, io')`. Esta es una forma de razonar por sustitución indexada por contexto, al estilo del diseño denotacional.

## Por qué esto aclara la RT {#why-this-clarifies-rt}

Muchos debates sobre RT difuminan una distinción útil:

*   transparencia semántica
*   efectos secundarios operacionales

El diseño denotacional separa estas capas:

*   el núcleo semántico define el significado
*   los intérpretes realizan la estrategia de ejecución

Esta separación permite efectos prácticos sin perder el razonamiento basado en leyes.

## Modo de fallo por priorizar la representación {#representation-first-failure-mode}

Si se elige pronto una representación concreta, el debate sobre RT deriva hacia discusiones de estilo:

*   «este estilo es puro»
*   «ese estilo es impuro»
*   «los envoltorios de E/S lo solucionan»

Son debates de codificación en su mayoría. El diseño denotacional plantea una pregunta más sencilla: ¿qué igualdades son válidas en tu especificación?

## Patrón práctico del diseño denotacional {#practical-dd-pattern}

Define rasgos de capacidades pequeños y escribe el comportamiento del programa como extensiones de ellos. Después proporciona intérpretes concretos y delgados.

```rust,noplayground
trait FileSystem {
    type Error;

    fn file_read(&self, name: &str) -> Result<String, Self::Error>;
}

trait GithubPublish {
    type Error;

    fn github_publish(&self, repo: &str, files: Vec<String>) -> Result<(), Self::Error>;
}

trait Concurrent {
    fn map_concurrent<A, B, E, F>(&self, xs: &[A], f: F) -> Result<Vec<B>, E>
    where
        A: Clone,
        F: Fn(&A) -> Result<B, E>;
}

#[ext(name = PublishProjectExt)]
impl<This> This
where
    This: FileSystem<Error = String> + GithubPublish<Error = String> + Concurrent,
{
    fn publish_project(&self, files: &[&str], repo: &str) -> Result<(), String> {
        let files = self.map_concurrent(files, |name| self.file_read(*name))?;
        self.github_publish(repo, files)
    }
}
```

`#[ext(...)]` es una macro de la biblioteca [`extend`](https://docs.rs/extend/latest/extend/) que reduce el código repetitivo generando métodos de extensión a partir de un bloque `impl`; no es una característica nueva del lenguaje Rust.

En la programación funcional de Scala, la RT suele presentarse mediante valores de tipo `F[A]` (por ejemplo, `IO[A]` o `F[Either[E, A]]`). Aquí, la RT se expresa un nivel más arriba: como significado de programa limitado por capacidades. Por tanto, este método de Rust no es un contenedor de valores RT en el mismo sentido de codificación que `F[A]`; es comportamiento RT especificado sobre capacidades explícitas, cuyos efectos concretos se delegan a las implementaciones.

La extensión establece el comportamiento semántico con respecto a las capacidades. Las implementaciones concretas deciden la estrategia de ejecución: agrupamiento, reintentos, transporte, paralelismo y detalles de almacenamiento.

## Perspectiva final {#final-insight}

En el diseño denotacional, la RT es una propiedad de las especificaciones semánticas. Las elecciones de implementación son secundarias, siempre que preserven las leyes denotacionales declaradas.

Conserva la ley. No te quedes atascado en la etiqueta.
