<!-- reader: {"title":"Problema de expresiones","sourceHash":"sha256:095010cccfe7dcb155f2ad304d334ffd7d3d56212b3b67168e4f5b04da397ee6"} -->

# Problema de expresiones {#expression-problem}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](../denotational-design/design.md), [Denotaciones y composicionalidad](../denotational-design/denotations.md)  
Diseño basado en el significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md), [Significado derivado y composición](../rust-dd/derived-meaning.md)  
Perspectivas: [El problema de expresiones, reexaminado](../insights/expression-problem.md)
```

```admonish note title="Ubicación semántica"
El problema de expresiones trata de la extensión modular de representaciones y operaciones. El diseño denotacional adelanta una pregunta: ¿qué vocabulario semántico e interpretaciones merece la pena representar?
```

El problema de expresiones de Phil Wadler trata de extender **simultáneamente** un lenguaje en dos dimensiones sin modificar el código existente:

*   **Añadir nuevas variantes de datos** (nuevas formas de expresión, también llamadas «sintaxis»).
*   **Añadir nuevas operaciones** (nuevas interpretaciones, también llamadas «semántica»).

La tensión central:

*   Con el estilo **funcional/ADT**, es fácil añadir operaciones, pero añadir variantes resulta invasivo.
*   Con el estilo **orientado a objetos**, es fácil añadir variantes, pero añadir operaciones resulta invasivo.

Esta sección muestra ambos enfoques con ejemplos breves en Haskell y Java.

## Haskell (funcional / ADT) {#haskell-functional--adt}

Empezamos con un ADT clásico de expresiones y dos operaciones.

```haskell
data Expr
  = Lit Int
  | Add Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
```

Ahora es fácil **añadir una operación**:

```haskell
size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
```

Pero **añadir una variante** (por ejemplo, `Mul`) obliga a editar todas las funciones:

```haskell
data Expr
  = Lit Int
  | Add Expr Expr
  | Mul Expr Expr

eval :: Expr -> Int
eval (Lit n)     = n
eval (Add a b)   = eval a + eval b
eval (Mul a b)   = eval a * eval b  -- ✏️ UPDATE: new case

pretty :: Expr -> String
pretty (Lit n)   = show n
pretty (Add a b) = "(" ++ pretty a ++ " + " ++ pretty b ++ ")"
pretty (Mul a b) = "(" ++ pretty a ++ " * " ++ pretty b ++ ")"  -- ✏️ UPDATE: new case

size :: Expr -> Int
size (Lit _)   = 1
size (Add a b) = 1 + size a + size b
size (Mul a b) = 1 + size a + size b  -- ✏️ UPDATE: new case
```

En palabras de Wadler, en el enfoque ADT **la extensión de datos no es modular**.

## Java (orientado a objetos) {#java-object-oriented}

Empezamos con una interfaz y clases concretas para cada variante.

```java
// Expression variants
interface Expr {
    int eval();
    String pretty();
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) {
        this.n = n;
    }

    public int eval() {
        return n;
    }

    public String pretty() {
        return Integer.toString(n);
    }
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() + b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " + " + b.pretty() + ")";
    }
}
```

Ahora es fácil **añadir una variante**:

```java
final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) {
        this.a = a;
        this.b = b;
    }

    public int eval() {
        return a.eval() * b.eval();
    }

    public String pretty() {
        return "(" + a.pretty() + " * " + b.pretty() + ")";
    }
}
```

Pero **añadir una operación** (por ejemplo, `size`) resulta invasivo. Hay que editar la interfaz y todas las clases:

```java
interface Expr {
    int eval();
    String pretty();
    int size(); // ✏️ UPDATE: new operation added here
}

final class Lit implements Expr {
    private final int n;

    Lit(int n) { this.n = n; }

    public int eval() { return n; }
    public String pretty() { return Integer.toString(n); }
    public int size() { return 1; } // ✏️ UPDATE: new method in every class
}

final class Add implements Expr {
    private final Expr a;
    private final Expr b;

    Add(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() + b.eval(); }
    public String pretty() { return "(" + a.pretty() + " + " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}

final class Mul implements Expr {
    private final Expr a;
    private final Expr b;

    Mul(Expr a, Expr b) { this.a = a; this.b = b; }

    public int eval() { return a.eval() * b.eval(); }
    public String pretty() { return "(" + a.pretty() + " * " + b.pretty() + ")"; }
    public int size() { return 1 + a.size() + b.size(); } // ✏️ UPDATE: new method in every class
}
```

En palabras de Wadler, en el enfoque OO **la extensión de operaciones no es modular**.

## Resumen (la idea de Wadler) {#summary-wadlers-point}

*   El estilo funcional/ADT favorece **las operaciones nuevas**, pero dificulta **las variantes nuevas**.
*   El estilo OO favorece **las variantes nuevas**, pero dificulta **las operaciones nuevas**.
*   El problema de expresiones busca un diseño en el que **ambas** dimensiones puedan ampliarse sin modificar el código existente.

## La explicación y las propuestas de solución de Wadler (1998) {#wadlers-explanation-and-solution-landscape-1998}

Wadler formula el problema así: extender un tipo de datos **por casos** (variantes nuevas) y ampliar las **funciones que operan sobre ese tipo** (operaciones nuevas), *sin recompilar el código existente* y preservando la **seguridad de tipos estática** (sin conversiones de tipo).

Usa la metáfora de una «tabla»:

*   **Filas** = casos (variantes / constructores)
*   **Columnas** = funciones (operaciones / interpretaciones)

En entornos **funcionales/ADT**, las filas son fijas y resulta fácil añadir columnas.  
En entornos **OO**, las columnas son fijas y resulta fácil añadir filas.  
El reto consiste en permitir extensiones en **ambas direcciones**.

## La solución propuesta por Wadler (GJ y tipos virtuales) {#wadlers-proposed-solution-gj--virtual-types}

Wadler presenta una solución en GJ (Generic Java) que utiliza:

*   Un parámetro acotado por `This` (`This extends LangF<This>`) para simular **ThisType**.
*   **Clases e interfaces internas** indexadas por `This` (tipos virtuales).
*   A visitor-based structure that allows:
    *   Casos nuevos (por ejemplo, `Plus`) mediante subclases de la «familia de lenguajes».
    *   Operaciones nuevas (por ejemplo, `Show`) mediante la incorporación de visitantes nuevos.

El truco consiste en referirse a `This.Exp` y `This.Visitor` para que cada fase de extensión conserve la seguridad de tipos y pueda compilarse de forma independiente.

### Advertencia (interfaces internas de Java) {#caveat-java-inner-interfaces}

Wadler señala que Java trata las interfaces internas como **static**, lo que rompe el mecanismo de indexación.  
Sugiere que relajar esta restricción haría viable la solución; la situación no ha cambiado en las versiones modernas de Java (las interfaces anidadas siguen siendo implícitamente estáticas).

## Otras líneas de solución mencionadas {#other-solution-directions-mentioned}

1.  El enfoque de Corky Cartwright Exige una **extensión contravariante**: permitir que un tipo base de expresión represente uno extendido. Esto explica el uso de puntos fijos: la familia de lenguajes extendida *no* es un subtipo de la original.
    
2.  El enfoque de Kim Bruce Exige **constructores de tipos de orden superior** (parametrizar un tipo con un constructor de tipos). GJ no lo admite directamente, pero Wadler sostiene que los tipos virtuales pueden simularlo.
    
3.  Krishnamurthi et al. (patrón Visitor extendido) Funciona mediante un diseño de visitante extendido. En su entorno (Pizza) **no tiene tipado estático**, por lo que se requieren conversiones de tipo dinámicas.
    
4.  Extensiones de lenguaje específicas Wadler cita dos soluciones que dependen de características del lenguaje diseñadas específicamente para este problema. Son menos generales que el enfoque de tipos virtuales.
    

## Las dos ideas de Wadler {#wadlers-two-points}

El correo de Wadler deja claras dos ideas:

1.  El problema de expresiones es una **tensión estructural** entre extender los datos y extender las operaciones.
2.  Solutions are possible, but they tend to require either:
    *   Características del sistema de tipos que simulan **tipos virtuales**, o
    *   Extensiones de lenguaje específicas, o
    *   Un compromiso en la seguridad de tipos estática o en la compilación independiente.

## Solución con Featherweight Go (2020) {#featherweight-go-solution-2020}

Wadler formuló y nombró el problema en 1998. Más adelante, Featherweight Go (FG) y su extensión genérica FGG (Featherweight Generic Go) ofrecieron una solución concreta y totalmente estática en un lenguaje similar a Go, con interfaces estructurales y genéricos.

La solución del artículo (figura 8, simplificada) tiene dos estructuras, `Num` y `Plus`, y dos operaciones, `Eval` y `String`:

```go
type Evaler interface { Eval() int }
type Stringer interface { String() string }

type Num struct { value int }
type Plus(type a Any) struct { left a; right a }

func (e Num) Eval() int { return e.value }
func (e Plus(type a Evaler)) Eval() int { return e.left.Eval() + e.right.Eval() }

func (e Num) String() string { return fmt.Sprintf("%d", e.value) }
func (e Plus(type a Stringer)) String() string {
    return fmt.Sprintf("(%s+%s)", e.left.String(), e.right.String())
}

type Expr interface { Evaler; Stringer }

var e Expr = Plus(Expr){Num{1}, Num{2}}
```

El mecanismo:

*   **Representación recursiva genérica.** Los elementos hijos de `Plus` tienen un parámetro de tipo `a` acotado únicamente por `Any`. La estructura no está ligada a una interfaz cerrada que enumere todas las operaciones, por lo que siguen siendo posibles las operaciones futuras.
*   **Restricciones específicas de cada operación.** La declaración de cada método acota `a` de manera independiente: `Plus(type a Evaler)` para `Eval`, `Plus(type a Stringer)` para `String`. Esto depende de los *receptores covariantes* de FGG: la restricción del receptor de un método puede ser más fuerte que la restricción de la declaración del tipo.
*   **Interfaces estructurales.** Una estructura implementa una interfaz si cuenta con sus métodos; así, `Expr` puede introducirse después de `Num` y `Plus` sin modificarlos. El conjunto completo de operaciones solo se fija al construir un valor (`Plus(Expr){...}`).

Los casos nuevos son estructuras nuevas; las operaciones nuevas son interfaces y métodos nuevos. Ninguna de las dos extensiones exige cambiar o recompilar las declaraciones existentes, y no se necesitan aserciones de tipo.

## Referencias {#references}

*   Wadler, P. (1998). *The Expression Problem*. Nota de la lista de correo Java-Genericity. Formulación y nombre del problema.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)
    
*   Griesemer, R., Hu, R., Kokke, W., Lange, J., Taylor, I. L., Toninho, B., Wadler, P. y Yoshida, N. (2020). *Featherweight Go*. Proc. ACM Program. Lang. 4 (OOPSLA). Una solución concreta posterior al problema, sección 2.3.  
    [https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf](https://homepages.inf.ed.ac.uk/wadler/papers/fg/fg.pdf)
