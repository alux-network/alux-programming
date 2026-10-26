<!-- reader: {"title":"El problema de expresiones, reexaminado","sourceHash":"sha256:4700e3db9f897416ecd8effa743648b9f65fe37268af14187948ecf790df44fe"} -->

# El problema de expresiones, reexaminado {#expression-problem-reloaded}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](../denotational-design/design.md)  
Diseño basado en el significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md), [Significado derivado y composición](../rust-dd/derived-meaning.md), [Intérpretes y efectos](../rust-dd/interpreters.md)  
Conceptos: [Problema de expresiones](../concepts/expression-problem.md)
```

Esta página presenta una solución práctica al *problema de expresiones* basada en rasgos: cómo añadir nuevas formas de expresión y nuevas operaciones sin reescribir repetidamente el código existente. El diseño sigue el **estilo de Conal** y usa una codificación **tagless-final/álgebra de objetos**. En concreto: primero especificamos el significado composicional (interfaces de capacidades pequeñas y especificaciones de programas por extensión) y solo después proporcionamos intérpretes concretos. La codificación concreta pertenece a la misma familia que el estilo **tagless-final** de Oleg Kiselyov y las **álgebras de objetos**: las interfaces de constructores (`LitAlg`, `AddAlg`, `MulAlg`) definen la signatura del lenguaje; los programas se escriben de forma polimórfica respecto a esas interfaces, y las implementaciones concretas (como `Eval` o `Pretty`) proporcionan interpretaciones. Así se evita comprometerse con un único AST cerrado, a la vez que se preservan el tipado estático y la extensibilidad en ambas dimensiones.

El enfoque de Oleg es explícitamente denotacional: primero asigna un significado composicional y después materializa los efectos y los intérpretes como capas semánticas modulares. Para el problema de expresiones, la alineación con el diseño denotacional es, por tanto, deliberada y no accidental. La formulación de diseño denotacional de Conal expresa directamente la misma prioridad: especificar primero el significado de forma composicional y tratar las estrategias de ejecución concretas como secundarias y reemplazables.

En el ejemplo del lenguaje de expresiones, esta codificación significa:

*   **El vocabulario de constructores** se modela mediante rasgos algebraicos pequeños e independientes.
*   **Las interpretaciones** son implementaciones de esos rasgos.
*   La sintaxis nueva añade un rasgo nuevo y deja intacto el código antiguo.
*   La semántica nueva añade un tipo de intérprete nuevo y deja intacto el código antiguo.

`lit` y `add` son operaciones semánticas, no constructores de un AST privilegiado. Un AST es una interpretación entre otras.

```admonish example title="Álgebras de objetos en C#"
Esta codificación no es exclusiva de Rust. [`object-algebras`](https://github.com/tgrospic/object-algebras) desarrolla el patrón en C# y va más allá del portador fijo que se usa aquí. En esta página, cada intérprete elige un `Self::Expr` concreto, un tipo simple. En cambio, las álgebras de C# abstraen sobre un *constructor* de tipos `F` — `FunctorAlg<F>`, `MonadAlg<F>`, `BankingDsl<F>` — que transporta resultados como `App<F, a>` en lugar del ilegal `F<a>`.

C# no ofrece tipos de orden superior de primera clase, así que `App<F, a>` representa la aplicación `F(a)`, que se recupera mediante envoltorios inject/project. Ese truco de `App` es precisamente la [defuncionalización](../concepts/defunctionalization.md): la abstracción que el lenguaje no puede expresar se convierte en datos de primer orden, aplicados bajo demanda. Rust se enfrenta al mismo límite: tampoco cuenta con tipos de orden superior de primera clase.
```

## Especifica capacidades de sintaxis pequeñas {#specify-tiny-syntax-capabilities}

Cada constructor se convierte en un rasgo pequeño. Esta es la **especificación**.

```rust,noplayground
trait LitAlg {
    type Expr;

    fn lit(&self, n: i64) -> Self::Expr;
}

trait AddAlg {
    type Expr;

    fn add(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}
```

Los programas se escriben como **extensiones** de los rasgos algebraicos; estas extensiones también forman parte de la especificación y permiten componer especificaciones pequeñas en especificaciones reutilizables a nivel de programa:

```rust,noplayground
#[ext(name = ExprPrograms)]
impl<This> This
where
    This: LitAlg + AddAlg,
{
    fn expr_basic(&self) -> This::Expr {
        self.add(self.lit(2), self.lit(3))
    }
}
```

`#[ext(...)]` es una macro de la biblioteca [`extend`](https://docs.rs/extend/latest/extend/) que reduce el código repetitivo generando métodos de extensión a partir de un bloque `impl`; no es una característica nueva del lenguaje Rust.

## Añade una interpretación nueva {#add-new-interpretation}

Los intérpretes implementan la especificación. No hace falta cambiar la sintaxis.

```rust,noplayground
struct Eval;

impl LitAlg for Eval {
    type Expr = i64;

    fn lit(&self, n: i64) -> i64 { n }
}

impl AddAlg for Eval {
    type Expr = i64;

    fn add(&self, a: i64, b: i64) -> i64 { a + b }
}

struct Pretty;

impl LitAlg for Pretty {
    type Expr = String;

    fn lit(&self, n: i64) -> String { n.to_string() }
}

impl AddAlg for Pretty {
    type Expr = String;

    fn add(&self, a: String, b: String) -> String {
        format!("({a} + {b})")
    }
}
```

Ahora se puede interpretar la misma expresión de distintas maneras:

```rust,noplayground
let eval = Eval;
let pretty = Pretty;

let v: i64 = eval.expr_basic();        // 5
let s: String = pretty.expr_basic();   // "(2 + 3)"
```

## Añade sintaxis nueva (un rasgo de capacidad nuevo) {#add-new-syntax-new-capability-trait}

Para añadir `Mul`, define un rasgo nuevo. El código existente permanece intacto.

```rust,noplayground
trait MulAlg {
    type Expr;

    fn mul(&self, a: Self::Expr, b: Self::Expr) -> Self::Expr;
}

#[ext(name = ExprProgramsMul)]
impl<This> This
where
    This: LitAlg + AddAlg + MulAlg,
{
    fn expr_with_mul(&self) -> This::Expr {
        self.mul(self.add(self.lit(2), self.lit(3)), self.lit(4))
    }
}
```

Los intérpretes existentes siguen funcionando con las expresiones antiguas.  
Si quieren admitir la sintaxis nueva, implementan el rasgo nuevo:

```rust,noplayground
impl MulAlg for Eval {
    type Expr = i64;

    fn mul(&self, a: i64, b: i64) -> i64 { a * b }
}

impl MulAlg for Pretty {
    type Expr = String;

    fn mul(&self, a: String, b: String) -> String {
        format!("({a} * {b})")
    }
}
```

## Por qué esto resuelve el problema de expresiones {#why-this-solves-the-expression-problem}

El problema de expresiones tradicional tiene dos ejes sobre una representación:

*   añadir variantes nuevas (casos)
*   añadir operaciones nuevas

El diseño denotacional replantea los ejes:

*   **Amplía el vocabulario semántico**: define un rasgo de capacidad nuevo (`MulAlg`).
*   **Añade una interpretación nueva** de ese vocabulario: define un tipo de intérprete nuevo (`Eval`, `Pretty`, un constructor de AST o un generador de código).

Los dos ejes se componen de manera independiente:

*   Los programas existentes no cambian, salvo que requieran la capacidad nueva. `expr_basic` sigue requiriendo únicamente `LitAlg + AddAlg`.
*   Los intérpretes existentes no cambian, salvo que decidan interpretar la capacidad nueva. `Eval` sin `impl MulAlg` sigue ejecutando todos los programas que no usen `mul`.

Esto no elimina la matriz de implementaciones. Si tanto `Eval` como `Pretty` deben interpretar `mul`, ambos necesitan una implementación `impl MulAlg`. Lo que cambia es la organización de la matriz: cada celda es *operación semántica × interpretación*, ninguna celda gira en torno a una representación privilegiada, y cada programa depende solo de las capacidades que usa.

## Las leyes pertenecen a la especificación {#laws-belong-to-the-specification}

Un álgebra semántica consta de un portador, operaciones y leyes. El portador (`type Expr`) lo elige la interpretación; las operaciones y leyes pertenecen a la especificación. Por ejemplo, un significado aritmético de `LitAlg + AddAlg` establece:

```text
add(lit(m), lit(n)) = lit(m + n)
```

`Eval` satisface esta ley. `Pretty` no la satisface: `"(2 + 3)"` no es `"5"`. Ambos son intérpretes válidos de la signatura sintáctica, pero solo `Eval` es un modelo de la especificación aritmética. La ley se formula una sola vez respecto a los rasgos y determina qué intérpretes cumplen los requisitos. No pertenece a ningún intérprete.

## Perspectiva final: Featherweight Go frente al diseño denotacional {#final-insight-featherweight-go-vs-denotational-design}

Wadler diagnosticó el problema de expresiones en el nivel de los mecanismos del lenguaje: filas frente a columnas con tipado estático y extensiones modulares. [Featherweight Go](../concepts/expression-problem.md#featherweight-go-solution-2020) ofrece una solución concreta: `Plus(type a Any)` mantiene genérica la representación recursiva y cada operación impone sus propias restricciones a `a` (`Plus(type a Evaler)` para `Eval`, `Plus(type a Stringer)` para `String`). La representación no está ligada a una única interfaz cerrada de expresiones, así que ambos ejes permanecen abiertos.

Las soluciones tradicionales parten de la representación y preguntan cómo mantener abiertos ambos ejes de extensión. Featherweight Go lleva esta idea sorprendentemente lejos al hacer genérica y extensible estructuralmente la representación recursiva. El diseño denotacional adelanta un paso el límite: la representación no es el modelo. El modelo es el álgebra y sus leyes; la representación es una interpretación posible.

**Featherweight Go hace extensible la representación. El diseño denotacional vuelve opcional la representación.**

|  | Featherweight Go | Diseño denotacional |
| --- | --- | --- |
| Centro semántico | representación extensible | álgebra y leyes |
| `Num`/`Plus`, `lit`/`add` | estructuras (formas de representación) | operaciones semánticas |
| `Eval`, `String`/`Pretty` | métodos e interfaces | interpretaciones |
| Estructura recursiva | representación genérica y abierta (`Plus(a)`) | no se requiere ninguna |
| Portador | el tipo de expresión representado | lo elige el intérprete (`type Expr`) |
| AST | la representación sigue siendo central | opcional, una interpretación entre muchas |
| Celda de la matriz | caso × operación → método | operación semántica × interpretación → `impl` |
| Comportamiento nuevo | añadir métodos e interfaces | añadir o componer capacidades |
| Implementación nueva | nuevas realizaciones estructurales | nuevo intérprete |

Wadler pregunta cómo extender ambos ejes de una representación. El diseño denotacional pregunta por qué la representación debería controlar cualquiera de los dos.

Primero define el significado composicional; después, elige las codificaciones. El problema de expresiones se convierte en una decisión de ingeniería entre codificaciones, no en un callejón conceptual sin salida.

**El significado de un lenguaje debe ser independiente de la idea de una máquina.**

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/n2CBSNAVHVg?si=n-f84RYWjGtKkcVj&amp;clip=Ugkx52hOOFjiK-KEPMRhuB8vT6i4WUaav11c&amp;clipt=EKWcxgIYjoTIAg&amp;start=5344&amp;end=5375" title="Talk clip — a language's meaning should be independent of the machine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>El significado de un lenguaje debe ser independiente de la máquina</figcaption></figure>

## Referencias {#references}

*   Elliott, C. *Denotational design with type class morphisms*.  
    [http://conal.net/papers/type-class-morphisms/](http://conal.net/papers/type-class-morphisms/)
    
*   Elliott, C. *Compiling to categories*.  
    [http://conal.net/papers/compiling-to-categories/](http://conal.net/papers/compiling-to-categories/)
    
*   Kiselyov, O. *Tagless-final style* (introducción, tutoriales y artículos sobre codificaciones finales e intérpretes tipados extensibles).  
    [https://okmij.org/ftp/tagless-final/](https://okmij.org/ftp/tagless-final/)
    
*   Kiselyov, O. *Having an Effect* (enfoque denotacional y de definiciones para efectos e intérpretes extensibles).  
    [https://okmij.org/ftp/Computation/having-effect.html#defint](https://okmij.org/ftp/Computation/having-effect.html#defint)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. y Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). La sección 2.3 presenta la solución estructural genérica comparada arriba.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
    
*   Oliveira, B. C. d. S. y Cook, W. R. (2012). *Extensibility for the Masses: Practical Extensibility with Object Algebras*.  
    [https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf)
