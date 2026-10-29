<!-- reader: {"title":"Diseño denotacional","sourceHash":"sha256:bac0e12637b9f63a8fa1002e44ca58f04237a81e1bc18da343cf22e360a85e8e"} -->

# Diseño denotacional {#denotational-design}

```admonish tip title="Relacionado"
La perspectiva semántica: [Denotaciones y composicionalidad](denotations.md), [Leyes e interpretaciones](laws-and-interpretations.md)  
Diseño por significado en Rust: [Álgebras de capacidades](../rust-dd/capability-algebras.md), [Significado derivado y composición](../rust-dd/derived-meaning.md)
```

```admonish note title="Idea central"
El Diseño denotacional deriva una interfaz de programación a partir de significados simples, composicionales e independientes de la implementación, dejando que la semántica guíe el diseño en lugar de describir una interfaz a posteriori.
```

El Diseño denotacional es la práctica de derivar una interfaz de programación a partir de significados simples, composicionales e independientes de la implementación.

La metodología fue desarrollada y nombrada por [Conal Elliott](http://conal.net/). Su movimiento central no consiste simplemente en asignar semántica a un lenguaje o API existente, sino en dejar que la semántica guíe el diseño de la propia API.

## El ciclo de diseño {#the-design-loop}

Sigue este orden:

1.  Elige el dominio semántico.
2.  Identifica la estructura importante en ese dominio.
3.  Elige un vocabulario reducido de operaciones primitivas.
4.  Deriva operaciones útiles de forma composicional.
5.  Enuncia las leyes que cumplen esas operaciones.
6.  Elige una o varias representaciones.
7.  Implementa interpretaciones que preserven la estructura.
8.  Valídalas mediante leyes, modelos y escenarios.

El diseño centrado en la representación suele empezar en el paso 6 e intenta reconstruir después los pasos 1–5.

## Diseñar un álgebra de ramificación {#designing-a-branch-algebra}

Volvamos a las posiciones de ramificación. El significado deseado es un camino finito en una estructura de ramificación binaria.

Un posible álgebra primitiva es:

$$ \begin{aligned} \operatorname{root} &\colon \mathtt{()} \to \mathsf{Branch} \\ \operatorname{grow} &\colon \mathsf{Branch} \times \mathsf{Direction} \to \mathsf{Branch} \\ \operatorname{path} &\colon \mathsf{Branch} \times \mathsf{Branch} \rightharpoonup \operatorname{List}(\mathsf{Direction}) \end{aligned} $$

La flecha parcial $\rightharpoonup$ significa que la observación del camino solo existe cuando la primera rama es antecesora de la segunda.

De ahí se derivan operaciones útiles:

$$ \begin{aligned} \operatorname{left}(b) &= \operatorname{grow}(b, \mathsf{Left}) \\ \operatorname{right}(b) &= \operatorname{grow}(b, \mathsf{Right}) \\ \operatorname{is\_ancestor}(a,b) &\iff \operatorname{path}(a,b)\ \text{is defined} \\ \operatorname{from\_path}(d_s) &= \operatorname{fold}(\operatorname{grow}, \operatorname{root}, d_s) \end{aligned} $$

Este álgebra no menciona vectores, enteros, fracciones, claves de base de datos ni bytes. Esas decisiones vienen después.

## La estructura antes que la comodidad {#structure-before-convenience}

El vocabulario primitivo debe revelar la estructura de la que depende el código posterior. No debe ser una colección de todos los métodos convenientes disponibles en una implementación.

````admonish warning title="Rechaza las primitivas centradas en la representación"
Este trait agrupa la disposición del almacenamiento, la ubicación de configuración, la representación de bits y un flujo de trabajo compuesto. No aísla el significado de la ramificación:

```rust,noplayground
trait BranchManager {
    // not recommended: exposes machinery, not semantic observations
    fn storage(&self) -> &BranchTable;
    fn config(&self) -> &BranchConfig;
    fn raw_bits(&self) -> &[u64];
    fn grow_and_save(&mut self, right: bool);
}
```
````

Una API semántica puede incluir efectos si forman parte del dominio elegido. La regla no es «todo debe ser puro», sino «cada primitiva debe expresar un significado coherente».

## La codificación no es la metodología {#encoding-is-not-methodology}

El Diseño denotacional no exige:

*   Haskell
*   codificación tagless-final
*   álgebras de objetos
*   mónadas libres
*   un único AST
*   solo funciones puras
*   terminología de teoría de categorías en cada API

Pueden ser codificaciones o herramientas explicativas útiles. Ninguna define el método.

```admonish note title="Codificaciones en Rust"
En Rust, los traits pequeños, los tipos asociados, los métodos de extensión, las funciones genéricas y los valores de programa de primer orden son codificaciones prácticas. Su valor depende de que preserven un diseño semántico claro.
```

## Morfismos de clases de tipos {#type-class-morphisms}

Una forma de entender el método es mediante aplicaciones que preservan la estructura.

Supongamos que una interfaz describe un álgebra semántica. Una implementación asigna sus valores y operaciones abstractos a una representación concreta. Una implementación válida debe preservar las operaciones y leyes pertinentes.

Si `encode` asigna ramas abstractas a un portador concreto, la preservación del crecimiento tiene este aspecto:

$$ \operatorname{encode}(\operatorname{grow}(b,d)) = \operatorname{grow}_{\mathsf{concrete}}(\operatorname{encode}(b),d) $$

La implementación no es simplemente un conjunto de métodos con nombres coincidentes. Debe ser un morfismo que respete la estructura algebraica.

## Qué caracteriza a una buena abstracción {#what-counts-as-a-good-abstraction}

Una buena abstracción DD tiene varias propiedades:

*   Sus valores tienen un significado previsto y sencillo.
*   Sus primitivas exponen observaciones o construcciones semánticas.
*   El comportamiento más amplio se deriva de esas primitivas.
*   Sus leyes no dependen de una sola representación.
*   Pueden interpretarla implementaciones independientes.
*   Los detalles operacionales aparecen solo cuando son pertinentes.

Ser pequeño no basta. Un trait diminuto que expone `get_manager()` sigue centrado en la representación. Un álgebra mayor puede justificarse cuando sus operaciones forman una estructura semántica coherente.

## Valores semánticos y portadores abstractos {#semantic-values-and-abstract-carriers}

La especificación no tiene por qué excluir todos los tipos concretos.

Usa un tipo asociado cuando el intérprete deba elegir el portador:

```rust,noplayground
trait BranchAlg {
    type Branch;
}
```

Usa un tipo concreto cuando forme parte de un vocabulario semántico estable:

```rust,noplayground
enum Direction {
    Left,
    Right,
}
```

La distinción no es «abstracto bueno, concreto malo», sino entre vocabulario semántico y representación accidental de máquina.

## La especificación es la denotación, y no tiene por qué ejecutarse {#the-specification-is-the-denotation-and-it-need-not-execute}

La especificación es la denotación: el significado matemático asignado a cada construcción. Su poder proviene de estar libre de las restricciones de eficiencia e incluso de ejecutabilidad.

```admonish quote title="Conal Elliott"
A menudo es mucho más fácil y esclarecedor definir una denotación que una implementación, porque no está sometida a restricciones ni distracciones de eficiencia, ni siquiera de ejecutabilidad.

— [Denotational Design: from meanings to programs (LambdaJam 2015)](https://github.com/conal/talk-2014-lambdajam-denotational-design)
```

El ejemplo canónico es FRP (programación reactiva funcional): un `Behavior a` se define como una función del tiempo continuo,

$$\llbracket\,\cdot\,\rrbracket : \mathsf{Behavior}\ a \to (\mathbb{R} \to a)$$

Ese modelo es preciso, pero no ejecutable: no se pueden enumerar los números reales. Del mismo modo, un programa puede denotar un conjunto de resultados; ninguno de los dos modelos se ejecuta, y ese es precisamente el objetivo. El significado se elige por su sencillez y precisión, no por cómo se calculará.

La ejecutabilidad y la eficiencia recaen por completo en la *implementación*, un artefacto separado cuya corrección establecen leyes de homomorfismo (morfismos de clases de tipos) que la relacionan con el significado: la función de significado debe llevar cada composición sintáctica a la composición semántica correspondiente. Como dice Conal, la denotación proporciona «una definición inequívoca de exactamente *qué* implementar, dejando a la vez mucho margen para la creatividad sobre *cómo* hacerlo».

En Rust, varios artefactos expresan partes de esta especificación, y algunos resultan ser ejecutables. La ejecutabilidad es incidental; no es lo que los convierte en especificación:

*   la prosa expresa el significado previsto
*   los traits expresan las primitivas disponibles
*   las extensiones expresan las derivaciones
*   las leyes expresan las igualdades exigidas
*   los intérpretes demuestran que puede realizarse
*   las pruebas aportan evidencia finita

Léelos en conjunto, dando al significado y a las leyes mayor autoridad que a los mecanismos concretos.

## Lecturas adicionales {#further-reading}

*   [Denotational Design: from programs to meanings (BayHac 2014)](https://github.com/conal/talk-2014-bayhac-denotational-design)
*   [Denotational design with type class morphisms](http://conal.net/papers/type-class-morphisms/)
*   [Escritos y conferencias de Conal Elliott](http://conal.net/)
