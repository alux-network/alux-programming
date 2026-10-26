<!-- reader: {"title":"関数のデファンクショナライズ"} -->

# 関数のデファンクショナライズ {#defunctionalization}

```admonish tip title="関連項目"
Rustで意味から設計する：[一階プログラム](../rust-dd/first-order-programs.md)、[言語とコンパイラーパイプライン](../rust-dd/compiler-pipelines.md)  
概念：[自由モナド](free_monad.md)、[継続渡し形式](cps.md)  
洞察：[EVM代数](../insights/evm-alg.md)
```

```admonish note title="意味論上の位置付け"
デファンクショナライズは、関数適用の振る舞いを保つことを意図しつつ、表現を変えます。意味から始める設計では、実行前に別のインタープリターが操作を検査または合成する必要がある場合、生成された一階の値が役立ちます。
```

## 定義 {#definition}

デファンクショナライズとは、高階関数を、考えられる関数を表す一階データ構造と、それを適用するインタープリター関数に置き換えるプログラム変換です。

## 目的 {#motivation}

言語、コンパイラー、ランタイムによっては、高階関数を効率的に扱えなかったり、まったく扱えなかったりします。デファンクショナライズすると、プログラムが一階だけになり、コンパイル、解析、シリアライズ、制限された環境での実行が容易になります。

## 手順 {#the-process}

1.  生成され、受け渡される可能性のある高階関数をすべて特定する。
2.  各関数に一意のタグを割り当て、列挙型または直和型と、その操作に必要なデータで表す。
3.  関数値をこれらのタグに置き換える。
4.  タグと関数の引数を受け取り、タグでパターンマッチして適切なコードを実行する`apply`関数を定義する。

## Rustでの例 {#example-in-rust}

変換前：クロージャを使う

```rust,noplayground
let k: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
println!("{}", k(41));
```

変換後：デファンクショナライズされた形式

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

## 性質 {#properties}

*   すべての関数が単純なデータで表現される。
*   プログラムが一階だけになる。
*   `apply`関数が直接の関数呼び出しに取って代わる。

## 用途 {#applications}

*   コンパイラーバックエンドの単純化：多くのコンパイラーはCPSコードを生成してからデファンクショナライズします。
*   関数のシリアライズ：列挙型のタグをネットワーク越しに送信したり、ファイルに格納したりできます。
*   静的解析：一階コードのほうが推論しやすい。
*   インタープリターの導出：デファンクショナライズは自然にInterpreterパターンへつながる。

## CPSとの関係 {#relation-to-cps}

CPS（継続渡し形式）では、継続は高階関数です。CPSコードをデファンクショナライズすると、継続が有限個のケースを持つ列挙型と適用関数になります。

## 自由モナドとの関係 {#relation-to-free-monads}

適切な自由モナド表現は、CPS変換されたプログラムにあるデファンクショナライズ済みの継続と関連付けられます。密接な関係ではありますが、二つの構成が常に同一というわけではありません。

## 型レベルの適用 {#type-level-application}

ネイティブな高カインド型を持たない言語では、デファンクショナライズを使って型レベルの適用も符号化できます。[オブジェクト代数を試すC#の実験](https://github.com/tgrospic/object-algebras)では、この軽量な符号化を`App<F, a>`に適用して、ファンクター、アプリカティブ、モナド、副作用の代数を表します。

## 参考文献 {#references}

*   Reynolds, J. C.（1972）。*Definitional Interpreters for Higher-Order Programming Languages*。  
    [https://dl.acm.org/doi/epdf/10.1145/800194.805852](https://dl.acm.org/doi/epdf/10.1145/800194.805852)
*   Yallop, J.、White, L.（2014）。*Lightweight Higher-Kinded Polymorphism*（型レベルの適用をデファンクショナライズで符号化）。  
    [https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf](https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf)
