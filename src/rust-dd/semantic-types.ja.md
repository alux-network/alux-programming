<!-- reader: {"title":"Rustの意味論的型"} -->

# Rustの意味論的型 {#semantic-types-in-rust}

```admonish tip title="関連項目"
意味論的な見方：[依存型と証明](../denotational-design/dependent-types.md)、[Denotational Design](../denotational-design/design.md)  
Rustで意味から設計する：[ケイパビリティ代数](capability-algebras.md)、[一階プログラム](first-order-programs.md)、[法則、シナリオ、証拠](laws.md)  
概念：[参照透過性](../concepts/referential_transparency.md)
```

```admonish note title="概要"
意味を第一に考えるRustでは、型を使って意味論的構造を見える状態に保ちます。関連型は担体の種類に名前を付け、境界は担体間の関係を述べ、拡張は明示した前提から新たな操作を導出します。すべての解釈で何を保持すべきかは、引き続き法則が定めます。
```

Rustでは、役割の異なるものがいくつも同じ`type`と書かれます。区別を保つことで、意味が表現に還元されるのを防げます。

| 役割 | 例 | 表すもの |
| --- | --- | --- |
| 意味論的型 | `Direction` | どの領域上の区別が重要か |
| インタープリターが選ぶ担体 | `BranchAlg::Branch` | インタープリターが選択する表現 |
| 導出操作 | `BranchExt::branch_child` | 宣言されたケイパビリティから得られるもの |
| 段階型 | `Syntax`, `CoreProgram`, `Executable` | 値にどの変換が適用されたか |
| 表現型 | `BitBranch` | 一つのインタープリターが分岐の意味をどう格納するか |
| 証拠プログラム | シナリオまたは再利用可能な法則拡張 | 互換性のあるインタープリターが満たすべき観測 |

## 表現より先に意味論的な型を定める {#semantic-types-before-representation}

分岐を扱う領域で二つの方向を区別するとします。

```rust,noplayground
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Direction {
    Left,
    Right,
}
```

`Direction`はその区別を直接表します。一つのインタープリターでは、経路をコンパクトに符号化できます。

```rust,noplayground
struct BitBranch(Vec<bool>);
```

真偽値はその表現に属します。左と右の定義ではなく、別のインタープリターが使う必要もありません。

```admonish warning title="コンパクトな符号化は意味論的な型ではない"
ビット位置、バイトオフセット、機械上の分岐で領域の振る舞いを定義しないでください。それらは意味論上の区別を符号化するものであり、その区別を所有するものではありません。
```

この分離により、格納方法や実行レイアウトを変えても、領域の意味を暗黙に変更せずに済みます。

## 関連型で担体を選ぶ {#associated-types-choose-carriers}

ケイパビリティ代数では、各インタープリターが担体を選べるようにします。

```rust,noplayground
trait BranchAlg {
    type Branch;

    fn branch_root(&self) -> Self::Branch;
    fn branch_grow(&self, branch: &Self::Branch, direction: Direction) -> Self::Branch;
    fn branch_path(
        &self,
        ancestor: &Self::Branch,
        descendant: &Self::Branch,
    ) -> Option<Vec<Direction>>;
}
```

`Self::Branch`は隠されたフィールド型ではありません。分岐の意味を解釈する際に選ばれる担体です。ビット経路、数値で表す木の位置、記号項、その他の表現で同じ代数を満たせます。

インタープリター`T`では、`T::Branch`の記法を担体族$\mathsf{Branch}(T)$として読めます。インタープリターを変えると担体も変わることがありますが、すべての操作は同じ選択に一貫して従います。

## 拡張から結果を導く {#extensions-derive-consequences}

拡張では、必要な前提だけから新しい操作を構成できます。

```rust,noplayground
#[ext(name = BranchExt)]
pub impl<This> This
where
    This: BranchAlg,
{
    fn branch_child(
        &self,
        branch: &This::Branch,
        direction: Direction,
    ) -> This::Branch {
        self.branch_grow(branch, direction)
    }
}
```

`where`節が前提です。つまり、`This`が分岐代数を解釈します。メソッドはそこから得られる結果で、そのインタープリターの担体について、分岐と方向から子分岐を決定できます。

$$ \bigl(T : \mathsf{BranchAlg}\bigr) \Longrightarrow \mathsf{branchChild}_T   : \mathsf{Branch}(T) \times \mathsf{Direction}   \to \mathsf{Branch}(T) $$

この導出のどこにも、具体的な分岐表現を選ぶ処理はありません。結果は引き続きインタープリターが選んだ担体族に属します。

## 等値性の境界で互換性を表す {#equality-bounds-state-compatibility}

二つのケイパビリティで担体を一致させる必要が生じることがあります。関連型の等値性を使えば、具体的な表現を選ばずに要件を記述できます。

```rust,noplayground
Right: BranchAlg<Branch = Left::Branch>
```

この境界は局所的な命題として読めます。`Left`と`Right`は同じ担体上の分岐操作を解釈します。どちらかの代数に全体で強制するのではなく、その一致が必要な操作にこの等値性を置きます。

こうした境界は、両方の実装をたまたま含むというだけで具体的なコンテキストを受け入れるよりも、強く正確です。

## 段階型でコンパイラーの契約を見えるようにする {#stage-types-make-compiler-contracts-visible}

コンパイラーパイプラインでは、すべての段階に同じ区別のない木を渡すべきではありません。各段階の型で、どの変換が行われたかを示します。

| 段階 | 入力 | 出力 | 契約 |
| --- | --- | --- | --- |
| 構文解析 | ソーステキスト | `Syntax` | 表層文法を認識する |
| 正規化 | `Syntax` | `CoreProgram` | 選択した中核的な意味を生成する |
| コード生成 | `CoreProgram` | `Executable` | 実行可能な形式でプログラムの観測を保持する |
| ランタイム | `Executable` | 観測可能な振る舞い | 言語モデルに沿って実行可能コードを一貫して解釈する |

こうした型は段階の取り違えを防ぎますが、名前だけでは保持を証明できません。変換には明示された法則、代表的なシナリオ、インタープリター間の証拠が必要です。

## 契約を読む {#read-the-contract}

型レベルの構造は、論理的には次のように読めます。

| Rustでの形式 | 読み方 |
| --- | --- |
| `This: BranchAlg` | `This`は分岐の意味を解釈するものを与える |
| `This::Branch` | 分岐の担体は`This`によって選ばれる |
| `Right: BranchAlg<Branch = Left::Branch>` | 二つの解釈で担体が一致する |
| `-> This::Branch` | 結果は選択された担体族にとどまる |

この読み方を使うと、型を決定するもの、合成に必要な等値性、前提から導かれる結論をAPIに明示しやすくなります。根底の区別が実在する場合、関連型、ジェネリック関連型、constジェネリクス、typestate、サイズゼロの証明値はいずれも契約の一部を表現できます。

実装を形式的に見せるだけの目的で、型レベルの仕組みを作り出さないでください。型が表すのは意味か、必要な関係であるべきであり、表現の飾りにしてはいけません。

## 型は法則を置き換えない {#types-do-not-replace-laws}

型シグネチャは、どのプログラムを構成できるかを制約します。法則は、その操作同士がどのように関係するかを制約します。両方が必要です。

たとえば、`BranchAlg::Branch`は各インタープリターが分岐の担体を選ぶことを示します。それだけでは次のことは保証しません。

*   分岐から同じ分岐への経路が空である
*   根の経路を再生すると分岐が再構成される
*   反対方向の子は互いに異なる

これらは互換性のあるインタープリターが共有する意味論的法則です。未使用ビットがゼロであることなど、表現固有の主張は、その表現を選んだインタープリターに属します。

```admonish quote title="型を主張として読む"
それぞれの型が何を主張し、何によって決まり、どの法則がその型を補い、どのインタープリターが実現するのかを確認します。
```

## レビュー時の確認 {#review-checks}

*   領域上の区別を、コンパクトな機械表現より先に定めているか。
*   関連型は、具体的な状態を偽装したものではなく、インタープリターが選ぶ担体か。
*   等値性の境界は、その使用箇所で必要な互換性だけを述べているか。
*   コンパイラーの各段階に別々の型と明示的な契約があるか。
*   意味論的命題と表現不変条件を分けているか。
*   Rustで表せない主張を、再利用可能な法則やシナリオで裏付けているか。
