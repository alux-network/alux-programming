<!-- reader: {"title":"ALUXプログラミング","parts":{"Welcome":"ようこそ","The Semantic View":"意味論の視点","Design by Meaning in Rust":"Rustで意味から設計する","Concepts":"概念","Insights":"洞察","Contributing":"貢献する"}} -->

```admonish warning title="ALUXプロジェクト"
ALUXのコードベースは現在開発中であり、まだ一般公開されていません。
```

# <img src="assets/alux-logo.png" style="margin-right: 10px; width: 60px;">ALUXプログラミングガイドライン {#alux-programming-guidelines}

```admonish note title="注記"
本書では、ALUXの意味を第一に考えるコードベースを理解し、開発に参加するための基礎を築きます。まず、[Denotational Design](denotational-design/design.md)の中心原則として、プログラムがどのように動くかを決める前に、プログラムが何を意味するかを定義します。

Conal Elliottに倣い、計算を不透明な手順の列ではなく、明快な数学的対象として扱います。

仕様は、プログラムが*何を*意味するかを記述する、単純で合成可能な[ケイパビリティのトレイト](rust-dd/capability-algebras.md)として表します。[インタープリター](rust-dd/interpreters.md)は、その意味を*実現*するための、互いに置き換え可能な方法を提供します。

その結果、合成規則、実装上の責務、[妥当な等式](denotational-design/laws-and-interpretations.md)を把握し、テストしやすいソフトウェアになります。
```

```admonish quote title="仕組みと意味"
[概念](concepts/index.md)と[洞察](insights/index.md)は、有用なプログラミングの仕組みを解説します。[Denotational Design](denotational-design/design.md)は、その仕組みに何を保持させるべきかを判断する方法を解説します。
```

## 本書の読み方 {#how-to-read-this-book}

本書は次の三層に分けて読んでください。

*   [**意味論的な見方**](denotational-design/semantic-view.md)では、[表示と合成性](denotational-design/denotations.md)、[法則と解釈](denotational-design/laws-and-interpretations.md)、そして意味と表現の関係を紹介します。
*   [**Rustで意味から設計する**](rust-dd/capability-algebras.md)では、その見方を[小さなケイパビリティ](rust-dd/capability-algebras.md)、[導出される拡張](rust-dd/derived-meaning.md)、[一階プログラム](rust-dd/first-order-programs.md)、[薄いインタープリター](rust-dd/interpreters.md)へと具体化します。
*   [**概念**](concepts/index.md)と[**洞察**](insights/index.md)は、重要な実行モデル、符号化、変換、関連性を解説します。

意味論の原則は言語に依存しません。主な実装言語はRustであり、[並行言語のパイプライン](rust-dd/compiler-pipelines.md)によって、これらの原則をTolangへと結び付けます。

## 本書の対象読者 {#who-this-book-is-for}

*   進化する複雑なソフトウェアを、**モジュール化され、合成可能で、テストしやすく、保守しやすい**状態に保ちたいプログラマー。
*   **圏論、型システム、プログラム設計を結び付けたい**開発者。
*   [**自由モナド**](concepts/free_monad.md)、[**継続渡し形式（CPS）**](concepts/cps.md)、[**関数のデファンクショナライズ**](concepts/defunctionalization.md)などの表現技法や実行技法に詳しく、それらの仕組みが意味を第一に考える設計を定義するのではなく、どう支えるのかを理解したい読者。
*   [**依存型**](denotational-design/dependent-types.md)と証明指向プログラミングに詳しく、その考え方を高性能なRustの記述に活かしたい読者。
*   [意味を第一に考えるRustの仕様](rust-dd/capability-algebras.md)を読み、コンパイラーを言語の定義とせずに[並行言語をコンパイルする方法](rust-dd/compiler-pipelines.md)を理解する必要のあるコントリビューター。
