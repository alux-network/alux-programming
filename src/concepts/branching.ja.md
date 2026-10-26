<!-- reader: {"title":"分岐と合流性"} -->

# 分岐と合流性 {#branching-and-confluence}

```admonish tip title="関連項目"
意味論的な見方：[表示と合成性](../denotational-design/denotations.md)、[法則と解釈](../denotational-design/laws-and-interpretations.md)  
Rustで意味から設計する：[法則、シナリオ、証拠](../rust-dd/laws.md)  
概念：[操作的意味論](operational_semantics.md)
```

計算の選択肢には、分岐、決定性、合流性、トレース等価性、双模倣性が関わります。これらは同じ性質ではありません。

```admonish note title="意味論上の位置付け"
制御フローの分岐は操作上の構造です。合流性は簡約関係の性質です。トレース等価性と双模倣性は振る舞いを比較します。表示の等値性は、選択した意味論的領域で意味を比較します。健全な設計では、これらの概念を曖昧に行き来せず、必要とする等値性を明示します。
```

## 振る舞いの等価性 {#behavioral-equivalence}

並行プログラムや対話型プログラムの結果は、一つとは限りません。標準的な出発点は**ラベル付き遷移系**です。

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

$S$は状態の集合、$A_{\tau}$は観測可能なアクションラベルの集合と内部アクション$\tau$、$\to\;\subseteq S \times A_{\tau} \times S$は遷移関係です。状態$p$がアクション$a$を実行して状態$p'$になる場合、$p \xrightarrow{a} p'$と書きます。

振る舞いの等価性では、こうしたシステム間でどの差異を意図的に無視するかを定めます。

*   **線形時間の観測**は、完了した実行または部分実行をたどり、その途中で起きたことを記録する。
*   **分岐時間の観測**は、選択肢がどこで提示され、いつ選択が決まったかも保持する。

そのため、二つのシステムが同じトレースを持ちながら、分岐構造が異なることがあります。一方が対話の前に二つのアクションから選び、もう一方が対話の後まで選択を延期する場合です。アクションの列は同じでも、その後に可能なことは異なります。

Van Glabbeekの[線形時間・分岐時間スペクトル](https://ir.cwi.nl/pub/5685/5685.pdf)は、こうした振る舞いの等価性を体系的に分類した標準的な説明です。弱いものから強いものへの順位ではなく、それぞれ異なる観測の集合を保持します。

## Rustプログラムにおける分岐 {#branching-in-rust-programs}

`if`は条件に応じて一つの分岐を選択します。

```rust,noplayground
fn sign(x: i32) -> i32 {
    if x > 0 {
        1
    } else if x < 0 {
        -1
    } else {
        0
    }
}
```

`match`は値に応じて一つのアームを選択します。

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

決定的な言語で入力を固定すると、これらの構文は予測可能な制御フロー経路を選びます。これは**決定性**であり、合流性ではありません。

## 合流性の意味 {#what-confluence-means}

簡約関係の合流性とは、同じ項から行った二つの簡約を、さらに簡約して再び合流させられる性質です。

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

形式的には、次が成り立つなら：

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

`d`が存在し、次が成り立たなければなりません。

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

合流性があっても複数の簡約経路は存在します。それらが共通の後続項へ到達できるという意味で、互いに両立することを表します。

## 決定性と合流性 {#determinism-and-confluence}

決定的な簡約関係では、各状態からの次のステップは高々一つです。そのため、競合する一段階の選択肢を調整する必要がなく、単純な意味では合流的です。

逆は成り立ちません。複数の簡約順序を許しながら、最終的にすべてが一致するため合流的なシステムがあります。

通常のRustの`if`式と`match`式は、決定的な選択を示します。それだけでは、合流性の興味深い内容を説明できません。

## Church–Rosser {#churchrosser}

Church–Rosserの定理は、ラムダ計算の簡約に関する合流性を示します。ある項が異なる簡約経路で二つの結果に簡約できるとき、それらの結果には共通の簡約形があります。

正規形が存在する場合、合流性によってそれが一意であると分かります。評価順が最終的な正規形を変えないため、等式に基づく推論を支えます。

この結果を任意の命令型プログラムに一般化しないでください。副作用、非決定的スケジューリング、失敗、中間状態の観測により、簡約順序の違いが意味を持つ場合があります。

## トレース {#traces}

**トレース**は、観測可能なアクションまたは状態の列を記録します。トレース意味論は、結果だけを見る意味論より多くの操作情報を意図的に保持します。

二つの純粋関数は同じ結果を返しつつ、内部のステップが異なることがあります。結果のみの表示でそれらのステップを捨てるなら、その表示では等価です。トレース意味論では、必ずしも等価ではありません。

副作用がある場合、順序を変えると観測が変わることがあります。

```rust,noplayground
fn is_admin() -> bool {
    println!("checked admin");
    true
}

fn is_user() -> bool {
    println!("checked user");
    true
}
```

`is_admin`を先に確認するか`is_user`を先に確認するかで、分類結果が等価でも出力トレースが異なることがあります。

この出力を選択した意味論的領域に含めるかが設計上の問いです。

## トレース等価性 {#trace-equivalence}

選択したトレースモデルで同じ観測トレースを持つとき、二つのシステムはトレース等価です。

トレース等価性では分岐構造が無視されることがあります。一方が他方より早く選択を確定する場合も、同じトレースを生成することがあります。対話型および並行システムでは、この違いが重要な場合があります。

## 双模倣性 {#bisimulation}

双模倣性は二つの遷移系を一段階ずつ関連付けます。一方のシステムが観測可能な動作を行うたびに、もう一方もそれに対応する動作を行えなければなりません。そして、遷移先の状態同士も関連したままでなければなりません。

一般的な変種：

*   **強双模倣性**：個々の遷移を対応付ける
*   **弱双模倣性**：選択された内部遷移を抽象化する
*   **分岐双模倣性**：重要な選択構造を保ちながら内部処理を抽象化する

双模倣性は相互作用の間に選択肢がどう維持されるかを観測するため、トレース等価性より強い振る舞いの比較になることがよくあります。

<details>
<summary><strong>由来と形式的な定義</strong></summary>

Milnerは[*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf)で、通信プロセスの観測的等価性を発展させました。その後Parkは[*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf)で対応する等価性を余帰納的に特徴付け、現在双模倣性として知られる最大不動点関係と証明方法を示しました。Milnerはこの方法を採用し、プロセスの振る舞いを推論する基盤として発展させました。

<strong>強双模倣性。</strong>ラベル付き遷移系で、関係$R$が強双模倣であるとは、$p\mathrel{R}q$のとき、すべてのアクション$a$について次が成り立つことです。

*   $p\xrightarrow{a}p'$なら、$q'$を満たす状態を経て$q\xrightarrow{a}q'$を実行し、遷移先が$p'\mathrel{R}q'$に関連付けられる状態が存在する。
*   $q\xrightarrow{a}q'$なら、$p'$を満たす状態を経て$p\xrightarrow{a}p'$を実行し、遷移先が$p'\mathrel{R}q'$に関連付けられる状態が存在する。

ある双模倣関係が二つの状態を関係付けるなら、それらの状態は双模倣的です。この定義は余帰納的です。遷移に対応付けた後も、遷移先の状態は同じ振る舞い上の責務を満たさなければなりません。

<strong>分岐双模倣性。</strong>一般的な発散を区別しない形式では、対称関係$R$が分岐双模倣であるとは、$p\mathrel{R}q$と$p\xrightarrow{a}p'$から次のいずれかが成り立つことです。

*   $a = \tau$および$p'\mathrel{R}q$、または
    
*   状態$q_0$と$q'$が存在し、次が成り立つ。
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

ここで$\xRightarrow{\tau}$は内部遷移が0回以上であることを表します。中間状態$q_0$と$p$が引き続き関連することを要求するため、内部処理を無視しつつ、重要な分岐可能性を保持できます。Van GlabbeekとWeijlandは[*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf)で、この等価性を導入し発展させました。

</details>

## 表示の等値性 {#denotational-equality}

表示の等値性は、選択した意味論的領域によって決まります。

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

領域自体をトレース、双模倣性で割った遷移系、結果の集合、その他の数学的モデルから構築する場合があります。Denotational Designは万能の等値性を一つ指定しません。等値性を明示的に選び、合成的に使うことを求めます。

関係は次のとおりです。

1.  操作系を出発点にする。
2.  関係する観測を選ぶ。
3.  意味論的領域と等値性を選ぶ。

## データとしての分岐 {#branching-as-data}

分岐は木構造にも現れます。二分木の経路は、左右の選択の列として表せます。この表現は、トライ、実行識別子、決定図、メモリーアドレス指定などに有用です。

[なぜ意味を先に考えるのか](../denotational-design/semantic-view.md)にある意味論的な分岐位置の例では、木としての意味と一つのビットベクトル符号化を意図的に分けています。

Conal Elliottは、完全二分リーフ木構造を使ったメモリーアドレス指定について説明しています。すべての機械がソースレベルの木をそのまま格納するという意味ではありません。合成可能な木モデルによって、平坦な数値アドレスに隠れた有用な構造を明らかにできるということです。

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott — 完全二分リーフ木としてのメモリーアドレス指定</figcaption></figure>

## 比較 {#comparison}

| 概念 | 対象 | 中心となる問い |
| --- | --- | --- |
| 制御フローの分岐 | 一つのプログラム実行 | どの継続が選ばれるか。 |
| 決定性 | 遷移関係 | 次のステップは一意に定まるか。 |
| 合流性 | 簡約関係 | 分岐した簡約を合流させられるか。 |
| トレース等価性 | 観測可能なアクション列 | システムは同じトレースを持つか。 |
| 双模倣性 | 分岐を含む遷移構造 | システム同士で相手の動きに対応できるか。 |
| 表示の等値性 | 選択した意味論的領域 | プログラムは指定された意味を同じく持つか。 |

これらの概念は互いに補い合うことがありますが、どれも別の概念の同義語として使うべきではありません。

## さらに読む {#further-reading}

*   [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf) — MilnerによるCCSと観測的等価性の基礎的な展開
*   [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) — Parkによる双模倣性の余帰納的特徴付け
*   [*Algebraic Laws for Nondeterminism and Concurrency*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf) — 観測的合同と代数法則に関するHennessyとMilnerの論文
*   [*What Is Branching Time and Why Use It?*](https://theory.stanford.edu/~rvg/branching/)（[圧縮PDF](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)）— 分岐構造を保つ動機を簡潔に説明
*   [*The Linear Time–Branching Time Spectrum*](https://ir.cwi.nl/pub/5685/5685.pdf) — 振る舞いの等価性に関する標準的な分類
*   [*Branching Time and Abstraction in Bisimulation Semantics*](https://ir.cwi.nl/pub/5564/5564D.pdf) — 分岐双模倣性に関する基礎的な論文
*   [*Three Logics for Branching Bisimulation*](https://ir.cwi.nl/pub/1370/1370D.pdf) — Hennessy–Milner型の論理や次時点演算子のないCTL\*による論理的な特徴付け
