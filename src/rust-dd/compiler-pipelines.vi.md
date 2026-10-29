<!-- reader: {"title":"Quy trình ngôn ngữ và trình biên dịch","sourceHash":"sha256:6ea1059eeaf723738c4e5ac542c9655cd8810817064c0ae84ef41b42ab894190"} -->

# Quy trình ngôn ngữ và trình biên dịch {#language-and-compiler-pipelines}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Chương trình bậc nhất](first-order-programs.md), [Bộ diễn giải và hiệu ứng](interpreters.md)  
Khái niệm: [Ngữ nghĩa vận hành](../concepts/operational_semantics.md), [Phi chức năng hóa](../concepts/defunctionalization.md)  
Nhận định: [Đại số EVM](../insights/evm-alg.md)
```

```admonish note title="Ý nghĩa không phải quy trình"
Trình biên dịch dễ hiểu nhất khi ý nghĩa ngôn ngữ không bị đồng nhất với cây phân tích, các lượt biến đổi, bytecode hay vòng lặp máy. Tính đúng đắn là một định luật giao hoán: chạy chương trình đã biên dịch cho kết quả phù hợp với ngữ nghĩa chỉ định của chương trình.
```

Lập luận về trình biên dịch dễ hơn khi ý nghĩa ngôn ngữ không bị đồng nhất với cây phân tích, các lượt trình biên dịch, bytecode hay vòng lặp máy ảo.

Chương này dùng ngôn ngữ đồng thời giản lược theo hình mẫu Tolang, tập trung vào kiến trúc ngữ nghĩa.

## Bốn lớp riêng biệt {#four-distinct-layers}

Hãy giữ các lớp này tách biệt:

1.  Cú pháp nguồn
2.  Ngôn ngữ chuẩn hóa
3.  Cách biểu diễn thực thi được
4.  Thực thi trên máy

Quy trình điển hình là:

$$ \begin{aligned} \operatorname{Parse} &\colon \mathsf{Source} \to \mathsf{Syntax} \\ \operatorname{Normalize} &\colon \mathsf{Syntax} \to \operatorname{Result}(\mathsf{Core}, \mathsf{Diagnostics}) \\ \operatorname{CodeGen} &\colon \mathsf{Core} \to \operatorname{Result}(\mathsf{Executable}, \mathsf{Error}) \\ \operatorname{Run} &\colon \mathsf{Executable} \times \mathsf{RuntimeState} \to \mathsf{Observation} \end{aligned} $$

Phép toán tiện ích là phép hợp thành:

$$ \operatorname{Compile} = \operatorname{Parse}\mathbin{;}\operatorname{Normalize}\mathbin{;}\operatorname{CodeGen} $$

Trợ giúp được hợp thành không phải định nghĩa ngữ nghĩa của từng giai đoạn.

## Cú pháp chưa phải ý nghĩa {#syntax-is-not-yet-meaning}

Đầu ra bộ phân tích phản chiếu các lựa chọn ngữ pháp:

*   dấu câu
*   cú pháp rút gọn
*   độ ưu tiên
*   đoạn văn bản nguồn
*   cách biểu diễn bộ phân tích được tạo sinh

Những điều này quan trọng với chẩn đoán và công cụ, nhưng không nhất thiết phải định nghĩa ngôn ngữ lõi.

Chuẩn hóa loại bỏ biến thể cú pháp ngẫu nhiên và đưa vào dạng nhỏ hơn mang ý nghĩa. Chẳng hạn, nhiều dạng ràng buộc bề mặt có thể được chuẩn hóa thành một phép toán giới hạn lõi.

**Nhiều dạng nguồn** → **một cấu trúc chuẩn hóa**

Việc này tạo ra một nơi để phát biểu các định luật trình biên dịch và môi trường chạy ở bước sau.

## Ý nghĩa chỉ định và ý nghĩa đã biên dịch {#denotational-and-compiled-meaning}

Giả sử:

$$ \llbracket - \rrbracket : Core \to D $$

gán ý nghĩa trong miền ngữ nghĩa `D`.

Biên dịch tạo ra các giá trị thực thi được:

$$ compile : Core \to Executable $$

và quá trình thực thi quan sát chúng:

$$ run : Executable \to D $$

Nghĩa vụ trung tâm về tính đúng đắn là một biểu đồ giao hoán:

$$ \operatorname{run}(\operatorname{compile}(p)) = \llbracket p \rrbracket $$

Với hệ thống không tất định hoặc đồng thời, đẳng thức có thể là tương đương quan sát, tập kết quả, tương đương vết hoặc mô phỏng song hành, chứ không phải đẳng thức giá trị thông thường. Mô hình ngữ nghĩa phải chọn.

## Ý nghĩa tiến trình đồng thời {#concurrent-process-meaning}

Phép tính phản chiếu nền tảng bao gồm các ý tưởng như:

$$ \begin{array}{ll} \mathbf{0} & \text{inactive process} \\ P \mid Q & \text{parallel composition} \\ x!(v) & \text{send a value on a channel} \\ ?\,(y \leftarrow x)\ P & \text{receive a value and continue as }P \end{array} $$

Tolang mở rộng phép tính nền tảng theo tính hợp thành. Một phần mở rộng như vậy bổ sung dạng bề mặt

$$ \mathbf{let}\ x\ \mathbf{in}\ P \qquad \text{fresh channel binding scoped over }P. $$

Ràng buộc này tạo kênh mới và giới hạn tên của nó trong phạm vi $P$; tài liệu về phép tính tiến trình gọi phép toán đó là *phép hạn định*. Lõi phản chiếu không có toán tử hạn định nguyên thủy. Xem [*Phép tính phản chiếu bậc cao*](https://doi.org/10.1016/j.entcs.2005.05.016) của Meredith và Radestock.

Máy vận hành có thể hiện thực hóa các cấu trúc này bằng không gian bộ, hàng đợi, chỉ mục đối sánh, bản ghi tiếp nối và tác vụ đồng thời. Những cơ chế đó không phải định nghĩa của ngôn ngữ.

Lớp ngữ nghĩa xác định hành vi tiến trình có thể quan sát và các định luật cấu trúc. Những định luật ứng viên cho phép hợp thành song song lõi bao gồm:

$$ \begin{aligned} P \mid \mathbf{0} &\equiv P \\ P \mid Q &\equiv Q \mid P \\ (P \mid Q) \mid R &\equiv P \mid (Q \mid R) \end{aligned} $$

Các định luật cho phần mở rộng ràng buộc mới này là riêng biệt. Các dạng ứng viên thông thường gồm đổi tên alpha, hoán đổi các ràng buộc khác nhau và đẩy phạm vi ra ngoài:

$$ \begin{aligned} \mathbf{let}\ x\ \mathbf{in}\ P &\equiv \mathbf{let}\ y\ \mathbf{in}\ P\{y/x\} && (y \mathrel{\#} P) \\ \mathbf{let}\ x\ \mathbf{in}\ (\mathbf{let}\ y\ \mathbf{in}\ P) &\equiv \mathbf{let}\ y\ \mathbf{in}\ (\mathbf{let}\ x\ \mathbf{in}\ P) && (x \ne y) \\ \mathbf{let}\ x\ \mathbf{in}\ (P \mid Q) &\equiv P \mid (\mathbf{let}\ x\ \mathbf{in}\ Q) && (x \notin \operatorname{FN}(P)) \end{aligned} $$

Ở đây, $y \mathrel{\#} P$ có nghĩa $y$ là mới đối với $P$; $P\{y/x\}$ là đổi tên tránh bắt giữ; còn $\operatorname{FN}(P)$ là tập tên kênh tự do trong $P$. Các dạng này chỉ trở thành định luật khi quan hệ tương đương quan sát được chọn xác nhận chúng; không được suy ra từ cú pháp bề mặt hay một bố cục bytecode.

## Chuẩn hóa như ánh xạ bảo toàn ý nghĩa {#normalization-as-a-meaning-preserving-map}

Nếu các chương trình nguồn `s₁` và `s₂` chỉ khác nhau ở cú pháp rút gọn được chấp nhận, thì phép chuẩn hóa cần làm lộ ý nghĩa chung:

$$ s_1 \equiv_{\mathsf{sugar}} s_2 \implies \operatorname{normalize}(s_1) = \operatorname{normalize}(s_2) $$

Các nghĩa vụ hữu ích khác gồm:

*   đổi tên alpha bảo toàn ý nghĩa chuẩn hóa
*   phạm vi từ vựng phân giải về đúng biến ràng buộc dự định
*   vị trí nguồn được giữ lại khi chẩn đoán cần dùng
*   hằng số thời điểm biên dịch bị loại bỏ mà không tạo hành vi lúc chạy
*   cú pháp sai tích lũy chẩn đoán theo hợp đồng của giai đoạn

Một số dự án yêu cầu giá trị chuẩn hóa chuẩn tắc. Dự án khác chỉ cần tương đương ngữ nghĩa. Hãy nêu rõ lựa chọn.

## Năng lực theo giai đoạn {#stage-capabilities}

```admonish warning title="Không tạo một đối tượng trình biên dịch toàn năng"
Đừng biến một đối tượng trình biên dịch khổng lồ thành giao diện duy nhất của mọi giai đoạn.
```

Bộ chuẩn hóa có thể cần các năng lực như:

*   Đọc và mở rộng phạm vi ràng buộc
*   Phân giải tên nguồn
*   Tích lũy chẩn đoán
*   Kiến tạo các số hạng chuẩn hóa

Bộ sinh mã có thể cần:

*   Cấp phát tham chiếu thực thi
*   Phát ra lệnh
*   Phân giải biến đã chuẩn hóa
*   Hoàn tất cấu trúc thực thi

Biểu đạt mục nhập từng giai đoạn như phần mở rộng dựa trên các năng lực này. Môi trường cụ thể lưu bản đồ, arena, bộ đếm và chẩn đoán, nhưng không sở hữu ý nghĩa của giai đoạn.

```rust,noplayground
#[ext(name = NormalizeEntryExt)]
pub impl<This> This
where
    This: BindingScopeAlg + DiagnosticAlg + NormalizeRecAlg,
{
    fn normalize(&mut self, syntax: &Syntax) -> Result<Core, BuildError> {
        // initialize the semantic stage and invoke recursive normalization
    }
}
```

Tên năng lực cụ thể thay đổi theo trình biên dịch. Điều quan trọng là có phụ thuộc tường minh và ánh xạ giai đoạn ổn định.

## Bộ phân tích và môi trường chạy có thể giữ tính vận hành {#parser-and-runtime-can-remain-operational}

Không cần ép mọi hệ thống con dùng cùng một cách mã hóa.

Bộ phân tích có thể bị chi phối bởi cơ chế ngữ pháp được tạo sinh. Máy ảo có thể bị chi phối bởi việc biến đổi và lập lịch hiệu quả. Chúng có thể giữ hình dạng vận hành trong khi triển khai các ranh giới được xác định rõ:

| Giai đoạn | Hợp đồng |
| --- | --- |
| Bộ phân tích | Tạo ra `Syntax` |
| Bộ chuẩn hóa | Tạo ra `Core` mang ý nghĩa |
| Bộ sinh mã | Bảo toàn ý nghĩa trong dạng thực thi được |
| Môi trường chạy | Tạo ra quan sát nhất quán với mô hình ngôn ngữ |

Thiết kế theo ngữ nghĩa không loại bỏ máy móc. Nó ngăn máy móc âm thầm trở thành ngữ nghĩa ngôn ngữ.

## Định luật và kiểm thử trình biên dịch {#compiler-laws-and-tests}

Bằng chứng mạnh đến từ nhiều hướng:

*   định luật chuẩn hóa trên các dạng nguồn tương đương
*   kiểm thử khứ hồi giữa phân tích cú pháp và in định dạng đẹp khi được dự định
*   đối chiếu đánh giá ngữ nghĩa trực tiếp với thực thi đã biên dịch
*   tương đương bytecode khi đầu ra chuẩn tắc được cam kết
*   tình huống kiểm tra tính phù hợp của môi trường chạy
*   kiểm thử vi sai giữa các bộ diễn giải

```admonish warning title="Bằng nhau từng byte không phải bằng nhau về ngữ nghĩa"
Đừng nhầm lẫn sự bằng nhau từng byte với đẳng thức ngữ nghĩa. Đẳng thức byte là thuộc tính mạnh hơn hữu ích chỉ khi biên dịch chuẩn tắc là một phần của đặc tả.
```

## Cách này chuẩn bị cho người đọc {#how-this-prepares-the-reader}

Khi đọc một cách triển khai ngôn ngữ lấy ý nghĩa làm trọng tâm, hãy tìm:

*   cú pháp ngữ nghĩa hoặc đặc trưng năng lực
*   các phép chuẩn hóa được suy ra
*   hợp đồng giai đoạn tường minh
*   chương trình lõi bậc nhất
*   định luật cho phép thế, phạm vi và hợp thành
*   môi trường mỏng diễn giải các năng lực giai đoạn
*   cơ chế vận hành của bộ phân tích, trình biên dịch và máy ảo ở các rìa

Lăng kính này kết nối Thiết kế theo ngữ nghĩa nói chung với Tolang, cho thấy cách ranh giới ngữ nghĩa định hướng thiết kế ngôn ngữ, biên dịch và diễn giải lúc chạy.
