<!-- reader: {"title":"Tipos dependientes y pruebas","sourceHash":"sha256:b7b61b22019652d49f915eb1a5420238e6332dc16889f5910c35bf487d5ab080"} -->

# Tipos dependientes y pruebas {#dependent-types-and-proofs}

```admonish tip title="Relacionado"
La perspectiva semántica: [Diseño denotacional](design.md), [Leyes e interpretaciones](laws-and-interpretations.md)  
Diseño por significado en Rust: [Tipos semánticos en Rust](../rust-dd/semantic-types.md), [Leyes, escenarios y evidencia](../rust-dd/laws.md)
```

```admonish note title="Ubicación semántica"
Los tipos dependientes expresan proposiciones indexadas por valores y evidencia dentro de un sistema de tipos. Pueden codificar parte de una especificación semántica, pero no la eligen: la propiedad prevista debe estar clara antes de incorporarla a un tipo.
```

## Tipos indexados por valores {#types-indexed-by-values}

Un tipo es *dependiente* cuando puede depender de un valor. Por tanto, puede describir no solo la forma de un valor, sino también una relación que ese valor debe satisfacer.

Algunos ejemplos:

*   `Vec<n, T>` — un vector indexado por su longitud `n`
*   `Matrix<rows, cols, T>` — una matriz indexada por sus dimensiones
*   `Proof<p>` — evidencia de una proposición `p`

Por ejemplo:

```hs
append : Vec<n, T> -> Vec<m, T> -> Vec<n + m, T>
```

El tipo de resultado expresa que concatenar vectores de longitudes `n` y `m` produce uno de longitud `n + m`.

## Funciones dependientes {#dependent-functions}

Un tipo de función dependiente se escribe así:

$$ \Pi (x : A).\,B(x) $$

Para cada valor $x$ de tipo $A$, el resultado tiene tipo $B(x)$. Compárese con:

$$ \begin{aligned} f &\colon A \to B \\ g &\colon (x : A) \to B(x) \end{aligned} $$

El tipo de resultado de $f$ es fijo. El tipo de resultado de $g$ puede variar según la entrada.

Según la correspondencia entre proposiciones y tipos, un tipo puede expresar una proposición y un término que habite ese tipo puede servir como prueba. Esto permite API donde no se pueden construir estados, transiciones ni composiciones inválidos.

## Relación con el Diseño denotacional {#relationship-to-denotational-design}

El Diseño denotacional pregunta primero:

1.  ¿Cuál es el dominio semántico?
2.  ¿Qué observaciones y composiciones importan?
3.  ¿Qué leyes deben cumplirse?

Los tipos dependientes pueden interiorizar después algunas respuestas. Un índice de tipo puede registrar la longitud de un vector, el estado de un protocolo, la profundidad de la pila, un límite de recursos o una prueba de que dos construcciones denotan el mismo resultado.

El orden importa. Un tipo sofisticado no aporta el significado que falta. Solo fortalece una especificación cuando la proposición indexada ya describe una distinción semántica prevista o un invariante de representación elegido deliberadamente.

```admonish warning title="No confundas las proposiciones semánticas con los invariantes de representación"
Ambos pueden codificarse en tipos, pero tienen distinta autoridad. Todo intérprete compatible debe preservar una proposición semántica. Un invariante de representación solo restringe la representación que lo eligió.
```

## Pruebas y evidencia ejecutable {#proofs-and-executable-evidence}

Una prueba establece una proposición bajo supuestos declarados. Los tests de propiedades, escenarios y unidades aportan evidencia ejecutable finita. Codificar una proposición en un tipo dependiente puede permitir que el sistema de tipos verifique un término de prueba, pero no convierte los tests en pruebas ni hace que el compilador sea la fuente de la proposición.

Es la misma separación que recorre el libro: el significado y las leyes expresan la obligación; las herramientas la comprueban o la realizan.

## Aplicar el modelo en Rust {#applying-the-model-in-rust}

Rust no es un lenguaje completamente dependiente de tipos, pero los genéricos constantes, typestate, tipos asociados y restricciones de traits pueden expresar relaciones indexadas útiles. Estas codificaciones pueden trasladar comprobaciones al tiempo de compilación y suelen preservar representaciones concretas eficientes.

El modelo mental orientado a las pruebas sigue siendo valioso aunque Rust no pueda expresar la proposición completa. Explicita el invariante, codifica la parte que el sistema de tipos puede imponer y conserva leyes o tests para el resto. La codificación sirve a la especificación; no la sustituye.

```admonish example title="Una cuadrícula indexada por posición"
[`typed-grid-rs`](https://github.com/tgrospic/typed-grid-rs) realiza la idea `Matrix<rows, cols, T>` anterior en Rust estable. Cada celda se convierte en un tipo indexado por sus coordenadas — `Pos0x0`, `Pos1x2`, etc. — y un movimiento devuelve un tipo de posición *diferente*:

`Pos0x0.right()` denota `Pos1x0`; salirse del borde no es un error en tiempo de ejecución, sino un programa que no supera la comprobación de tipos, porque ese movimiento no se genera en el límite.

Es la misma elevación que describe esta sección: la coordenada que viviría en el mundo de los valores se promueve al tipo, y la navegación válida se vuelve una función total comprobada en tiempo de compilación. Los tipos marcador tienen tamaño cero, por lo que la proposición indexada no cuesta nada en tiempo de ejecución.
```
