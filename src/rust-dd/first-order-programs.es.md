<!-- reader: {"title":"Programas de primer orden"} -->

# Programas de primer orden {#first-order-programs}

```admonish tip title="Relacionado"
Diseño por significado en Rust: [Significado derivado y composición](derived-meaning.md), [Canalizaciones de lenguaje y compilador](compiler-pipelines.md)  
Conceptos: [Estilo de paso de continuaciones](../concepts/cps.md), [Defuncionalización](../concepts/defunctionalization.md), [Mónada libre](../concepts/free_monad.md)  
Perspectivas: [El problema de las expresiones, revisitado](../insights/expression-problem.md)
```

```admonish note title="Cuándo reificar la aplicación de funciones"
Las funciones ordinarias y las extensiones ya expresan el comportamiento derivado. Convierte la aplicación de una función en datos de primer orden solo cuando otro intérprete deba inspeccionar, componer, serializar o compilar un programa antes de ejecutarlo.
```

Las funciones ordinarias y los métodos de extensión suelen ser la mejor manera de expresar el comportamiento derivado. A veces otro intérprete debe inspeccionar, combinar, documentar, serializar o compilar la estructura de un programa antes de aplicarlo. En ese caso, la propia aplicación de funciones debe convertirse en datos de primer orden.

## La ejecución borra la estructura {#execution-erases-structure}

Considera:

```rust,noplayground
#[ext(name = StatusExt)]
pub impl<This> This
where
    This: StatusAlg,
{
    async fn status_current(&self) -> This::Status {
        self.status().await
    }
}
```

Llamar a este método produce un estado. Una vez iniciada la llamada, un intérprete externo normalmente no puede recuperar:

*   el tipo de contexto semántico
*   los argumentos ordenados
*   los nombres de los argumentos de origen
*   el tipo de resultado
*   la identidad de la operación

Esa información estaba presente en el tipo de función en el código fuente, pero la ejecución ordinaria la consume.

## Defuncionalización de la aplicación de funciones {#defunctionalizing-application}

La defuncionalización reemplaza un miembro de una familia conocida de funciones por una etiqueta de primer orden y una operación de aplicación compartida.

Un vocabulario mínimo de operaciones es:

```rust,noplayground
trait OperationAlg {
    type Context;
    type Args;

    const ARG_NAMES: &'static [&'static str];
}

trait ApplyAlg<Handle, Args> {
    type Output;

    async fn apply(&self, handle: Handle, args: Args) -> Self::Output;
}
```

Un `CurrentStatusOperation<App>` de tamaño cero puede denotar la aplicación del método de extensión original. Debe invocar ese método, no contener una segunda copia de su cuerpo.

1.  Empieza con el método de extensión.
2.  Reifícalo como un tipo de operación.
3.  Preserva su contexto, producto de argumentos, nombres de argumentos y salida.
4.  Interprétalo mediante `ApplyAlg`.

El método sigue siendo cómodo para llamadas normales. El valor de operación existe para contextos que requieren una estructura de primer orden.

## No reifiques sin un consumidor {#do-not-reify-without-a-consumer}

Los programas de primer orden añaden mecanismos de tipos. Úsalos cuando permitan una segunda interpretación real:

*   registro en tiempo de ejecución
*   generación de documentación o esquemas
*   inspección estática
*   composición de programas antes de la ejecución
*   serialización
*   compilación

Si el código solo necesita llamar a una función, conserva la función.

## Programas de interfaz portables {#portable-interface-programs}

Supongamos que una superficie HTTP contiene:

| Método | Ruta | Entrada | Operación | Salida |
| --- | --- | --- | --- | --- |
| `GET` | `/status` | — | `status_current` | JSON |
| `POST` | `/set_temperature` | Cuerpo: `f32` | `adjust_status` | JSON |
| `GET` | `/download` | — | `current_file` | Archivo transmitido en flujo |

Un programa portable debe preservar:

*   selectores de método y ruta
*   roles de entrada como ruta, consulta, cuerpo, encabezado y autenticación
*   el valor de la operación
*   rol de salida como JSON o archivo
*   combinación y anidamiento de rutas

No debería preservar un tipo de solicitud, enrutador o respuesta de un framework específico.

Una notación fluida podría ser:

```rust,noplayground
self.routes()
    .get("/status", self.op(CurrentStatusOperation::<App>::default()).json())
    .post("/set_temperature", self.op(AdjustStatusOperation::<App>::default()).body::<f32>().json())
    .get("/download", self.op(CurrentFileOperation::<App>::default()).file())
```

Las llamadas fluidas construyen un programa tipado. No tienen que registrar inmediatamente una ruta del servidor.

## Un programa, varios pliegues {#one-program-several-folds}

El mismo programa de primer orden puede admitir varias interpretaciones:

| Programa | Interpretaciones |
| --- | --- |
| Programa HTTP tipado | Documentación textual, rutas ejecutables, metadatos de OpenAPI, enlaces de cliente y tests de conformidad |
| Programa JSON-RPC tipado | Registro de métodos, esquema, cliente y banco de pruebas |

No mantengas listas separadas de rutas o métodos para la ejecución y la documentación. Eso crea especificaciones rivales.

## Roles de entrada y salida {#input-and-output-roles}

La operación ya conoce los tipos de sus argumentos y resultados. Una declaración de transporte solo debería añadir significado de transporte.

```rust,noplayground
self.op(FindOperation::<App>::default())
    .path::<u64>()
    .query::<String>()
    .json()
```

`path`, `query` y `json` identifican roles. No deberían obligar al autor a volver a declarar un tipo de salida que `ApplyAlg` ya determina.

La conversión de salida corresponde al intérprete de transporte. Un servidor puede convertir un resultado a JSON y otro a un adjunto transmitido en flujo. Las operaciones semánticas no necesitan conocer ninguna de esas representaciones.

## La composición es significado de programa {#composition-is-program-meaning}

Los programas deben preservar la composición general:

*   Programa vacío
*   Combinar programas
*   Anidar un programa bajo un prefijo
*   Elevar un endpoint a programa

Estas operaciones son más fundamentales que los métodos de enrutador de un framework. Nombres fluidos conocidos como `get`, `post`, `merge` y `nest` pueden ser alias del álgebra neutral.

Las especificaciones independientes pueden publicar programas pequeños:

| Programas de entrada | Composición | Resultado |
| --- | --- | --- |
| Programas de estado y descarga | Combinar | Programa de servicio |
| Programa de catálogo | Anidar | Programa de servicio |

Una aplicación elige e interpreta la composición resultante.

## Los macros deben rebajarse a significado público {#macros-must-lower-to-public-meaning}

Los macros de Rust pueden hacer más cómodas las declaraciones de primer orden:

```rust,noplayground
#[ext(name = StatusApiExt, defunc(via = http))]
pub impl<This> This
where
    This: HttpApiAlg + JsonOutAlg,
{
    fn status_api<Alg>(&self)
    where
        Alg: StatusAlg,
    {
        self.routes().get("/status", self.op(Alg::status_current).json());
    }
}
```

El macro solo es saludable cuando se traduce a un programa público de primer orden que pueda construirse manualmente. Los callbacks generados no deben convertirse en la única definición de la interfaz.

Dirección acertada:

1.  Sintaxis conveniente
2.  Valores públicos de operación y programa
3.  Pliegue genérico
4.  Framework concreto

Dirección centrada en la representación:

1.  Anotación del framework
2.  Callbacks generados opacos
3.  Documentación reconstruida mediante ingeniería inversa

## Relación con conceptos existentes {#relation-to-existing-concepts}

Los programas de interfaz de primer orden se basan en técnicas de otros capítulos: la defuncionalización es la transformación general, la sintaxis extensible y las interpretaciones conforman el problema de las expresiones, y una mónada libre es una representación concreta de sintaxis con secuenciación. Los enlaces relacionados al inicio de la página llevan a cada tema.

No identifiques estas técnicas con DD. DD determina qué estructura importa; las representaciones de primer orden preservan esa estructura cuando las llamadas ordinarias podrían borrarla.

## Comprobaciones de revisión {#review-checks}

*   ¿Una segunda interpretación real requiere reificación?
*   ¿La operación invoca el método escrito por el autor en vez de duplicarlo?
*   ¿Los argumentos y la salida se infieren a partir de la operación?
*   ¿La sintaxis de transporte añade solo roles de transporte?
*   ¿Se puede construir el programa sin su macro de conveniencia?
*   ¿El entorno de ejecución y los metadatos interpretan el mismo programa?
