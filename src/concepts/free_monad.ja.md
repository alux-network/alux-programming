<!-- reader: {"title":"自由モナド","sourceHash":"sha256:1d74262c1053f3cc50c6a3c49b8b9b7eddfb3c6ab6f247530387d19b335f4626"} -->

# 自由モナド {#free-monad}

```admonish tip title="関連項目"
Rustで意味から設計する：[一階プログラム](../rust-dd/first-order-programs.md)、[インタープリターと副作用](../rust-dd/interpreters.md)  
概念：[継続渡し形式](cps.md)、[関数のデファンクショナライズ](defunctionalization.md)  
洞察：[EVM代数](../insights/evm-alg.md)
```

```admonish note title="意味論上の位置付け"
自由モナドは、自由に生成される逐次実行を伴う命令構文の表現です。命令ファンクターがすでに語彙を選び、インタープリターがその構文を意味論的領域へ写像します。強力な符号化の一つではありますが、Denotational Designの定義ではありません。
```

## 自由モナドとは何か（Rust版） {#what-is-a-free-monad-rust-version}

**自由モナド**を使うと、次のことができます。

*   **プログラムを*データ*として記述**し、すぐには実行しない。
*   **そのプログラムを後で、一つまたは複数の方法で解釈**する。

次のように考えてください。

> 副作用のある操作のAST＋それらを連結する`bind`／`flat_map`。

次のように分けます。

*   **構文** → 命令の列挙型。
*   **解釈** → 選択した意味論的領域への、構造を保つ写像。

「自由」とは、モナドの法則を超える等式を加えず、ファンクター`F`からモナド構造を生成することです。`F`を選ぶと命令構文もすでに決まっています。構築されたプログラムを解釈することで、具体的な表示が与えられます。

## Rustでの実装 {#rust-implementation}

```admonish warning title="模式的な符号化"
Rustには高カインド型の型パラメーターが直接ないため、本番向けの自由モナド符号化には追加の型レベルの仕組みか、専用の命令ファンクターが必要です。次のコードは意図する構造を示すものであり、そのまま使えるジェネリック実装ではありません。
```

### 自由モナド型 {#free-monad-type}

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

### DSL：コンソール操作 {#dsl-console-operations}

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

### インタープリター {#interpreter}

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

### 使用例 {#usage}

```rust,noplayground
fn main() {
    let program =
        print_line("What is your name?")
        .flat_map(|_| read_line())
        .flat_map(|name| print_line(&format!("Hello, {name}!")));

    run_console(program);
}
```

## 要点 {#takeaway}

*   **構文**＝`enum Console`（考えられる命令）
*   **プログラム**＝`Free<Console, A>`（手順を記述するデータ）
*   **具体的な解釈**＝`run_console`
*   利点：同じプログラムに対して複数のインタープリターを記述できます。たとえば、実際のIOで実行する、ファイルに記録する、別の言語へコンパイルする、といったことができます。

## 継続およびCPSとの関連 {#correlation-to-continuations-and-cps}

<strong>継続渡し形式（CPS）</strong>とは、関数が値を直接返さず、*継続*と呼ばれる別の関数へ結果を渡す形でプログラムを書く方法です。継続は「プログラムの残り」を表します。

**自由モナド**とは、基本的に、**手順の列として表したプログラム**です。各手順は次のように述べます。

> 「これを実行してから、残りに続く。」

この「プログラムの残り」こそが**継続**です。現在の結果から次の手順を返す関数です。

*   Rustによる自由モナドでは：
    
    ```rust,noplayground
    Free::FlatMap(Box<Free<F, A>>, Box<dyn Fn(A) -> Free<F, A>>)
    ```
    
    `Box<dyn Fn(A) -> Free<F, A>>`の**が継続**です。
    
*   自由モナドを解釈することは、**CPSで実行すること**です。
    
    *   値を直接返す代わりに、次の継続へ渡します。
    *   次のループになります。 `current_instruction -> feed result into continuation -> next instruction`
*   **CPSとの関係**：
    
    *   自由モナドは、*CPSをデータ構造に符号化する*ものです。
    *   CPSは、同じ考え方を表す*ランタイムの制御フロー表現*です。

**簡易対応表**：

| 概念 | CPSの場合 | 自由モナドASTの場合 |
| --- | --- | --- |
| ステップの結果 | 継続への引数 | `A`を`Fn(A) -> Free`に渡す |
| 継続 | 関数`(A) -> R` | `Box<dyn Fn(A) -> Free>` |
| プログラム | ネストされた継続 | ネストされた`FlatMap`バリアント |
| 実行 | 関数呼び出し | パターンマッチと呼び出し |

## GoF（Gang of Four）デザインパターンとの対応 {#gof-gang-of-four-design-patterns-mapping}

自由モナドは関数型プログラミング理論に由来するため、GoFのパターンでは**ありません**。しかし、いくつかのパターンを**包含**したり、**模倣**したりします。

| GoFパターン | 自由モナドとの関係 |
| --- | --- |
| **インタープリター** | 「AST＋実行」の全体は文字どおりInterpreterパターンです。自由モナドはASTとコンビネーターを手軽に提供します。 |
| **Command** | DSLの各`enum`バリアントはCommandオブジェクトです。自由モナドはそれらをマクロコマンドのように連鎖させます。 |
| **Composite** | ASTの構造（ネストした命令）はコマンドのCompositeです。 |
| **Builder** | `.flat_map`の連鎖は、プログラムを構築する流れる形式のBuilderです。 |
| **Visitor** | インタープリターは本質的に命令集合へのVisitorです。 |

## なぜ自由モナドはこれらのパターンより優れるのか {#why-free-monad--these-patterns}

*   GoFのパターンは**手作業によるOOP**です。インターフェース、クラス、合成を定義します。
    
*   自由モナドは**代数的**です。命令を表す*データ*と、それを解釈する*関数*を定義します。
    
*   次のものが自動的に得られます。
    
    *   逐次実行（`flat_map`）
    *   合成
    *   中核ロジックに触れない複数のインタープリター

**まとめ表**：

| 自由モナド（関数型プログラミングの概念） | 対応するGoF／OOPパターン |
| --- | --- |
| 命令の列挙型 | Command |
| プログラムAST | Composite |
| `flat_map`ビルダー | Builder |
| インタープリター関数 | Interpreter／Visitor |
| 複数のインタープリター | Strategy |

## デファンクショナライズとの関係 {#relation-to-defunctionalization}

**デファンクショナライズ**とは、高階関数を、それらの関数を表す一階データ構造と、それを適用するインタープリターに置き換えるプログラム変換です。

CPSでは継続が高階関数です。CPSプログラムをデファンクショナライズすると、継続が継続ケースの列挙型になり、`apply`実行する関数が用意されます。

適切な符号化を使うと、自由モナドを、CPS変換されたプログラム内のデファンクショナライズ済み継続と関連付けられます。

1.  プログラムをCPS形式にします。「プログラムの残り」は継続関数が保持します。
2.  継続関数をデファンクショナライズして、データ型の有限個のケースに置き換えます。
3.  こうして得られる一階データ型は、自由モナド表現と同じ命令および継続の形を取ることがあります。

**主な類似点**

*   自由モナドもデファンクショナライズも計算をデータとして表現し、そのデータに意味を与えるためのインタープリターが必要です。
*   自由モナドの`FlatMap`ケースには継続が格納され、デファンクショナライズではそのクロージャがデータ型のケースに置き換わります。

**主な相違点**

| 観点 | デファンクショナライズ | 自由モナド |
| --- | --- | --- |
| 目的 | 高階関数を取り除くための機械的なコンパイラー技法 | 構文と意味論を分ける代数的な構成 |
| 入力 | 任意の高階プログラム、多くはCPS形式 | 考えられる命令を記述するファンクターF |
| 出力 | 関数ケースの列挙型と適用関数 | `Free<F, A>` ASTとインタープリター |
| モナドか。 | 必ずしもそうではない | 構成上、常にモナドである |
| 適用範囲 | 一般的な変換 | 特定の関数型プログラミングパターン |

**まとめ** デファンクショナライズは変換技法、自由モナドは代数的な構成です。一部の表現では密接に関連しますが、追加の仮定がなければ、一般に一方が他方を含意するわけではありません。
