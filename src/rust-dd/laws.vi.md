<!-- reader: {"title":"Định luật, tình huống và bằng chứng"} -->

# Định luật, tình huống và bằng chứng {#laws-scenarios-and-evidence}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Định luật và cách diễn giải](../denotational-design/laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Bộ diễn giải và hiệu ứng](interpreters.md), [Các đại số năng lực](capability-algebras.md)  
Khái niệm: [Phân nhánh và hội tụ](../concepts/branching.md), [Tính minh bạch tham chiếu](../concepts/referential_transparency.md)
```

```admonish note title="Định hướng"
Kiểm thử là bằng chứng cho đặc tả. Hãy khẳng định các quan sát công khai và định luật mà miền được chọn hỗ trợ, chứ không khẳng định các bước thực thi riêng tư; đồng thời viết các định luật đó tổng quát theo năng lực để chúng ràng buộc mọi bộ diễn giải.
```

Mã lấy ý nghĩa làm trọng tâm cần kiểm thử cũng lấy ý nghĩa làm trọng tâm. Hãy kiểm tra các quan sát công khai và định luật thay vì các bước thực thi riêng tư.

## Kiểm thử bề mặt đặc tả {#test-the-specification-surface}

````admonish warning title="Kiểm thử gắn với cách biểu diễn"
Khẳng định này truy cập các trường của một đối tượng mang nên bộ diễn giải khác không thể dùng chung:

```rust,noplayground
// not recommended: asserts a bit layout, not a semantic observation
assert_eq!(branch.bits, vec![false, true]);
```
````

Kiểm thử ngữ nghĩa:

```rust,noplayground
let root = alg.branch_root();
let left = alg.branch_left(&root);
let left_right = alg.branch_right(&left);

assert_eq!(alg.branch_path(&root, &left_right), Some(vec![Direction::Left, Direction::Right]));
```

Kiểm thử đầu có thể phù hợp với mô-đun tuần tự hóa chuyên về mã hóa bit. Nhưng nó là bằng chứng yếu cho đại số nhánh, vì các cách biểu diễn thay thế không thể dùng chung.

## Phần mở rộng định luật có thể tái sử dụng {#reusable-law-extensions}

Khi một thuộc tính áp dụng cho mọi bộ diễn giải tương thích, hãy viết nó một lần:

```rust,noplayground
use anyhow::{Result, bail, ensure};
use extend::ext;

#[ext(name = BranchLawsExt)]
pub impl<This> This
where
    This: BranchAlg,
    This::Branch: Clone + Eq,
{
    fn check_branch_root_round_trip(&self, directions: &[Direction]) -> Result<()> {
        let root = self.branch_root();
        let branch = directions.iter().copied().fold(root.clone(), |branch, direction| self.branch_grow(&branch, direction));

        let Some(path) = self.branch_path(&root, &branch) else {
            bail!("grown branch has no path from root");
        };
        ensure!(path == directions, "root path did not round-trip");
        Ok(())
    }
}
```

Mọi bộ diễn giải đều chạy cùng bộ kiểm tra. `anyhow::Result` mang kết quả; `bail!` báo quan sát còn thiếu, trong khi `ensure!` kiểm tra định luật khứ hồi. Bộ kiểm tra phân biệt hai lỗi mà không phụ thuộc một cách biểu diễn nhánh.

## Các nhóm định luật hữu ích {#useful-law-families}

Hãy tìm các thuộc tính đã được cấu trúc ngữ nghĩa gợi ý:

*   tính đơn vị
*   tính kết hợp
*   tính giao hoán khi thực sự được dự định
*   tính lũy đẳng
*   khứ hồi
*   chuẩn hóa
*   tinh chỉnh
*   tính đơn điệu
*   phép thế
*   sự thống nhất giữa các cách diễn giải

```admonish warning title="Chỉ khẳng định những định luật được miền hỗ trợ"
Đừng thêm các thuật ngữ đại số quen thuộc chỉ vì chúng nghe có vẻ toán học. Chỉ nêu các định luật mà miền đã chọn hỗ trợ.
```

## Định luật và bất biến biểu diễn {#laws-versus-representation-invariants}

Hãy phân biệt chúng:

*   **Định luật ngữ nghĩa:** dựng nhánh từ đường đi gốc sẽ biểu thị cùng nhánh đó.
    
*   **Bất biến biểu diễn:** các bit cao không dùng đến bằng không.
    
*   **Định luật tuần tự hóa:**
    
    $$   \operatorname{decode}(\operatorname{encode}(b)) = b   $$
    
*   **Định luật định dạng chuẩn tắc:**
    
    $$   \operatorname{encode}(\operatorname{decode}(x)) = x   \qquad \text{for canonical byte sequences }x   $$
    

Tất cả đều có thể quan trọng. Chúng thuộc về các đặc tả khác nhau.

## Tình huống dùng chung {#shared-scenarios}

Tình huống là tương tác có thể tái sử dụng, được viết dựa trên năng lực công khai. Khung kiểm thử ALUX biểu diễn tình huống theo cách này: mã tác giả dựng một giá trị thông qua các năng lực `Scenario`, `DeployerIds`, `PlayAst` và `ScenarioSchedule` mà không gọi tên trình chạy cụ thể.

```rust,noplayground
#[ext(name = HelloScenarioExt)]
pub impl<This> This
where
    This: StandaloneScenario,
    This::Step: PlayAst<Ast = RProc>,
{
    fn hello(self) -> This::Scenario {
        self.scenario()
            .under_comprehensive(100)
            .step(
                self.play_ast(
                    self.deployer(0),
                    tolang! {
                        let x in {
                            x ! "hello" |
                            ? (a <- x) a.log()
                        }
                    },
                )
                .expect_log(r#""hello""#),
            )
    }
}
```

Mỗi lời gọi mô tả ý nghĩa do tác giả định ra chứ không phải cơ chế của trình chạy. `under_comprehensive(100)` đòi hỏi nhật ký mong đợi trong một lượt chạy tuần tự, 100 lượt đồng thời tự do và tối đa 100 lượt có thứ tự hoán vị. Tình huống cố định quan sát, còn trình chạy thay đổi thứ tự thực thi.

Nguyên lý tương tự áp dụng giữa các bộ diễn giải: khi nhiều trình chạy triển khai các năng lực mà một tình huống sử dụng, mỗi trình chạy đều có thể diễn giải cùng tương tác do tác giả viết. Phần thiết lập riêng của trình chạy và kiểm tra ranh giới vẫn nằm ngoài tình huống.

## Sự thống nhất giữa các bộ diễn giải {#cross-interpreter-agreement}

Khi hai bộ diễn giải bộc lộ cùng một quan sát, hãy so sánh chúng:

$$ \operatorname{interpret\_text}(p).\mathit{route\_names} = \operatorname{interpret\_server}(p).\mathit{registered\_route\_names} $$

Cách này phát hiện sai lệch mà các bản chụp độc lập bỏ sót. Nó đặc biệt có giá trị với định nghĩa API, giai đoạn trình biên dịch và các cách biểu diễn dữ liệu thay thế.

## Bằng chứng hữu hạn không phải chứng minh {#finite-evidence-is-not-proof}

Kiểm thử đạt chứng minh hành vi với các đầu vào và cách triển khai đã được kiểm thử. Nó không chứng minh định luật đúng với mọi giá trị.

Hãy chủ ý tăng mức bảo đảm:

1.  kiểm thử ví dụ
2.  kiểm thử tình huống tái sử dụng
3.  kiểm thử thuộc tính được tạo sinh
4.  kiểm tra toàn diện trên các miền hữu hạn
5.  so sánh mô hình
6.  tạo phẩm chứng minh

Chọn mức phù hợp với rủi ro và độ mạnh của khẳng định.

## Tên kiểm thử cần nêu ý nghĩa {#test-names-should-state-meaning}

Nên dùng:

*   `reconstructs_every_generated_branch_from_its_root_path`
*   `preserves_child_programs_when_routes_are_merged`
*   `normalization_is_invariant_under_alpha_renaming`

Tránh tên chỉ thuật lại cách triển khai:

*   `pushes_three_bits`
*   `calls_helper_twice`
*   `visits_left_node_first`

Kiểm thử vận hành vẫn hợp lệ khi thứ tự thao tác được đặc tả. Hãy gọi tên quan sát khiến thứ tự đó có ý nghĩa.

## Các câu hỏi khi duyệt {#review-checks}

*   Mỗi phép toán ngữ nghĩa mới có định luật hoặc khẳng định tập trung không?
*   Các nghĩa vụ tái sử dụng có được viết tổng quát theo năng lực công khai không?
*   Tình huống có được tách khỏi trình chạy cụ thể không?
*   Định luật ngữ nghĩa có được phân biệt với bất biến biểu diễn không?
*   Có so sánh nhiều bộ diễn giải ở nơi thực tiễn cho phép không?
*   Tài liệu có tránh gọi kiểm thử hữu hạn là chứng minh không?
