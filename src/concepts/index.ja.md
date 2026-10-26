<!-- reader: {"title":"はじめに"} -->

# 概念のはじめに {#concepts-introduction}

![Concepts — the programming machinery](../assets/concepts.png)

```admonish tip title="関連項目"
意味論的な見方：[なぜ意味を先に考えるのか](../denotational-design/semantic-view.md)  
Rustで意味から設計する：[ケイパビリティ代数](../rust-dd/capability-algebras.md)  
洞察：[はじめに](../insights/index.md)
```

このパートの章では、重要なプログラミングの仕組みと理論的なツールを解説します。

*   操作的意味論は実行規則を記述する
*   CPSは継続を明示する
*   デファンクショナライズは既知の高階の振る舞いを一階データに変換する
*   自由モナドは逐次実行を伴う副作用の構文を表す
*   Expression Problemに関する符号化は拡張性を扱う
*   参照透過性は置換を支える
*   合流性、トレース、双模倣性は振る舞いの形式を比較する

こうした概念をDenotational Designが置き換えるのではなく、その中に位置付けます。

```admonish quote title="仕組みと意味"
[概念](index.md)と[洞察](../insights/index.md)は、有用なプログラミングの仕組みを解説します。[Denotational Design](../denotational-design/design.md)は、その仕組みに何を保持させるべきかを判断する方法を解説します。
```

各章を読むときは、次の三つを問いかけます。

1.  この概念が記述するのは、意味、表現、実行、それらの間の変換のどれか。
2.  どの観測と等値性を保持するか。
3.  これは仕様なのか、仕様の符号化の一つなのか、それとも一つのインタープリターなのか。

本書が明示的な意味論的な流れを採用する前に書かれた章もあります。意図的に操作を重視した例はそのままにしています。文脈に応じたリンクと洞察の章で、意味論的な見方とのつながりを示します。
