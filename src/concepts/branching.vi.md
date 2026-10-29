<!-- reader: {"title":"Phân nhánh và hội tụ","sourceHash":"sha256:7b0ae3cd887e2ddebc21b9054fddd9eb54d1c7452218516c8a6c0da578ce05b1"} -->

# Phân nhánh và hội tụ {#branching-and-confluence}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Ngữ nghĩa và tính hợp thành](../denotational-design/denotations.md), [Định luật và cách diễn giải](../denotational-design/laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Định luật, tình huống và bằng chứng](../rust-dd/laws.md)  
Khái niệm: [Ngữ nghĩa vận hành](operational_semantics.md)
```

Phân nhánh, tính tất định, tính hội tụ, tương đương vết và mô phỏng song hành đều liên quan đến các phương án khác nhau trong tính toán. Chúng không phải cùng một thuộc tính.

```admonish note title="Vị trí ngữ nghĩa"
Phân nhánh luồng điều khiển là cấu trúc vận hành. Tính hội tụ là thuộc tính của quan hệ rút gọn. Tương đương vết và mô phỏng song hành so sánh hành vi. Đẳng thức ngữ nghĩa chỉ định so sánh ý nghĩa trong một miền ngữ nghĩa được chọn. Thiết kế vững chắc nêu rõ cần đẳng thức nào, thay vì chuyển đổi không chính thức giữa các khái niệm.
```

## Tương đương hành vi {#behavioral-equivalence}

Chương trình đồng thời và tương tác hiếm khi chỉ có một kết quả cuối. Điểm khởi đầu tiêu chuẩn là một **hệ chuyển trạng thái gắn nhãn**:

$$ \mathcal{L} = (S, A_{\tau}, \to) $$

trong đó $S$ là tập trạng thái, $A_{\tau}$ là tập nhãn hành động quan sát được cùng hành động nội bộ $\tau$, còn $\to\;\subseteq S \times A_{\tau} \times S$ là quan hệ chuyển tiếp. Ta viết $p \xrightarrow{a} p'$ khi trạng thái $p$ có thể thực hiện hành động $a$ rồi chuyển sang $p'$.

Tương đương hành vi xác định những khác biệt nào giữa các hệ thống được chủ ý lược bỏ:

*   **quan sát thời gian tuyến tính** theo các lần thực thi hoàn tất hoặc từng phần và ghi lại những gì xảy ra
*   **quan sát thời gian phân nhánh** còn giữ lại nơi có các phương án và thời điểm lựa chọn được xác định

Vì vậy, hai hệ thống có thể cho phép cùng vết thực thi nhưng khác cấu trúc phân nhánh. Một hệ thống có thể chọn giữa hai hành động trước tương tác, còn hệ thống kia trì hoãn lựa chọn đến sau. Chuỗi hành động giống nhau, nhưng các khả năng tương lai thì không.

[Phổ thời gian tuyến tính–thời gian phân nhánh](https://ir.cwi.nl/pub/5685/5685.pdf) của Van Glabbeek trình bày có hệ thống các dạng tương đương hành vi tiêu chuẩn. Đây không phải thứ bậc từ yếu đến mạnh; mỗi điểm bảo toàn một tập quan sát khác nhau.

## Phân nhánh trong chương trình Rust {#branching-in-rust-programs}

`if` chọn một nhánh theo điều kiện:

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

`match` chọn một nhánh theo giá trị:

```rust,noplayground
fn day_type(day: &str) -> &str {
    match day {
        "Saturday" | "Sunday" => "Weekend",
        "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" => "Weekday",
        _ => "Unknown",
    }
}
```

Với đầu vào cố định trong ngôn ngữ tất định, các cấu trúc này chọn một đường đi luồng điều khiển có thể dự đoán. Thuộc tính đó là **tính tất định**, không phải tính hội tụ.

## Tính hội tụ có nghĩa gì {#what-confluence-means}

Quan hệ rút gọn có tính hội tụ khi hai phép rút gọn từ cùng một số hạng có thể gặp lại nhau:

$$ \begin{array}{ccccc} && a && \\ & \swarrow^{*} && \searrow^{*} & \\ b &&&& c \\ & \searrow^{*} && \swarrow^{*} & \\ && d && \end{array} $$

Về hình thức, nếu:

$$ a \to^* b \quad\text{and}\quad a \to^* c $$

thì phải tồn tại một `d` sao cho:

$$ b \to^* d \quad\text{and}\quad c \to^* d $$

Tính hội tụ cho phép có nhiều đường rút gọn. Nó nói các đường đó tương thích theo nghĩa chúng có thể đi đến cùng một trạng thái kế tiếp.

## Tính tất định và tính hội tụ {#determinism-and-confluence}

Quan hệ rút gọn tất định có nhiều nhất một bước tiếp theo từ mỗi trạng thái. Vì vậy, nó hội tụ theo nghĩa trực tiếp: không có lựa chọn một bước cạnh tranh nào cần điều hòa.

Điều ngược lại không đúng. Một hệ thống có thể cho phép nhiều thứ tự rút gọn mà vẫn hội tụ vì mọi thứ tự cuối cùng đều thống nhất.

Các biểu thức Rust thông thường `if` và `match` minh họa lựa chọn tất định. Tự chúng không minh họa nội dung thú vị của tính hội tụ.

## Church–Rosser {#churchrosser}

Định lý Church–Rosser phát biểu một tính chất hội tụ cho phép rút gọn lambda. Nếu một số hạng rút gọn thành hai kết quả theo các đường khác nhau, thì hai kết quả đó có dạng rút gọn chung.

Khi tồn tại dạng chuẩn, tính hội tụ bảo đảm nó là duy nhất. Điều này hỗ trợ lập luận phương trình vì thứ tự đánh giá không làm đổi dạng chuẩn cuối cùng.

Đừng khái quát kết quả này cho mọi chương trình mệnh lệnh. Hiệu ứng phụ, lập lịch không tất định, lỗi và quan sát trạng thái trung gian có thể khiến thứ tự rút gọn khác nhau.

## Vết thực thi {#traces}

**Vết thực thi** ghi lại chuỗi hành động hoặc trạng thái quan sát được. Ngữ nghĩa vết chủ ý bảo toàn nhiều thông tin vận hành hơn ngữ nghĩa chỉ xét kết quả.

Hai hàm thuần có thể trả về cùng kết quả nhưng đi qua các bước nội bộ khác nhau. Chúng bằng nhau theo ngữ nghĩa chỉ định kết quả nếu các bước bị lược bỏ. Chúng không nhất thiết bằng nhau theo ngữ nghĩa vết.

Khi có hiệu ứng, đổi thứ tự điều kiện có thể làm thay đổi quan sát:

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

Kiểm tra `is_admin` trước rồi đến `is_user` có thể trả về phân loại tương đương nhưng tạo ra vết khác nhau khi in.

Câu hỏi thiết kế là liệu các lần in đó có thuộc miền ngữ nghĩa được chọn hay không.

## Tương đương vết {#trace-equivalence}

Hai hệ thống tương đương vết khi chúng cho phép cùng các vết quan sát theo mô hình vết đã chọn.

Tương đương vết có thể lược bỏ cấu trúc phân nhánh. Hai hệ thống có thể tạo ra cùng vết dù một hệ thống chốt lựa chọn sớm hơn hệ thống kia. Với hệ thống tương tác và đồng thời, khác biệt đó có thể quan trọng.

## Mô phỏng song hành {#bisimulation}

Mô phỏng song hành liên hệ hai hệ chuyển tiếp từng bước một. Mỗi khi một hệ thống thực hiện một bước quan sát được, hệ thống kia phải có thể bắt chước bước đó, và trạng thái kết quả phải tiếp tục có quan hệ.

Các biến thể thường gặp gồm:

*   **mô phỏng song hành mạnh**, khớp từng chuyển tiếp riêng lẻ
*   **mô phỏng song hành yếu**, trừu tượng hóa các chuyển tiếp nội bộ được chọn
*   **mô phỏng song hành phân nhánh**, trừu tượng hóa công việc nội bộ nhưng bảo toàn cấu trúc lựa chọn quan trọng

Mô phỏng song hành thường là phép so sánh hành vi mạnh hơn tương đương vết, vì nó quan sát cách các phương án còn sẵn có trong quá trình tương tác.

<details>
<summary><strong>Nguồn gốc và định nghĩa hình thức</strong></summary>

Milner phát triển tương đương quan sát cho các tiến trình giao tiếp trong [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf). Sau đó Park đặc trưng hóa tương đương tương ứng bằng phương pháp đồng quy nạp trong [*Concurrency and Automata on Infinite Sequences*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf), đưa ra quan hệ điểm bất động lớn nhất và phương pháp chứng minh nay được gọi là mô phỏng song hành. Milner tiếp nhận và phát triển phương pháp này thành nền tảng lập luận về hành vi tiến trình.

**Mô phỏng song hành mạnh.** Với hệ chuyển trạng thái gắn nhãn, quan hệ $R$ là mô phỏng song hành mạnh nếu $p\mathrel{R}q$ kéo theo rằng, với mọi hành động $a$:

*   nếu $p\xrightarrow{a}p'$ thì tồn tại $q'$ thỏa mãn $q\xrightarrow{a}q'$ và $p'\mathrel{R}q'$; và
*   nếu $q\xrightarrow{a}q'$ thì tồn tại $p'$ thỏa mãn $p\xrightarrow{a}p'$ và $p'\mathrel{R}q'$.

Hai trạng thái là song hành tương đương nếu có một quan hệ mô phỏng song hành liên hệ chúng. Định nghĩa này mang tính đồng quy nạp: sau khi khớp chuyển tiếp, các trạng thái kế tiếp phải tiếp tục đáp ứng cùng nghĩa vụ hành vi.

**Mô phỏng song hành phân nhánh.** Trong một cách trình bày phổ biến không xét phân kỳ, quan hệ đối xứng $R$ là mô phỏng song hành phân nhánh khi $p\mathrel{R}q$ và $p\xrightarrow{a}p'$ kéo theo một trong các trường hợp:

*   $a = \tau$ và $p'\mathrel{R}q$, hoặc
    
*   có các trạng thái $q_0$ và $q'$ sao cho
    
    $$   q \xRightarrow{\tau} q_0 \xrightarrow{a} q',   \qquad   p\mathrel{R}q_0,   \qquad   p'\mathrel{R}q'   $$
    

Ở đây $\xRightarrow{\tau}$ biểu thị không hoặc nhiều chuyển tiếp nội bộ. Yêu cầu trạng thái trung gian $q_0$ vẫn có quan hệ với $p$ chính là điều bảo toàn khả năng phân nhánh liên quan trong khi cho phép bỏ qua công việc nội bộ. Van Glabbeek và Weijland giới thiệu và phát triển tương đương này trong [*Thời gian phân nhánh và trừu tượng hóa trong ngữ nghĩa mô phỏng song hành*](https://ir.cwi.nl/pub/5564/5564D.pdf).

</details>

## Đẳng thức ngữ nghĩa chỉ định {#denotational-equality}

Đẳng thức ngữ nghĩa chỉ định phụ thuộc miền ngữ nghĩa được chọn:

$$ \llbracket P \rrbracket = \llbracket Q \rrbracket $$

Bản thân miền có thể được xây dựng từ vết thực thi, hệ chuyển trạng thái lấy theo mô phỏng song hành, tập kết quả hoặc mô hình toán học khác. Thiết kế theo ngữ nghĩa không áp đặt một đẳng thức phổ quát. Nó yêu cầu chọn đẳng thức một cách tường minh và sử dụng nó theo tính hợp thành.

Mối quan hệ là:

1.  Bắt đầu với hệ vận hành.
2.  Chọn các quan sát liên quan.
3.  Chọn miền ngữ nghĩa và đẳng thức.

## Phân nhánh như dữ liệu {#branching-as-data}

Phân nhánh cũng xuất hiện về mặt cấu trúc trong cây. Có thể biểu diễn đường đi nhị phân như chuỗi quyết định trái/phải. Cách biểu diễn này hữu ích cho trie, định danh thực thi, sơ đồ quyết định và đánh địa chỉ bộ nhớ.

Ví dụ vị trí nhánh ngữ nghĩa trong [Vì sao ý nghĩa được đặt lên trước](../denotational-design/semantic-view.md) chủ ý tách biệt ý nghĩa cây này khỏi một cách mã hóa bằng vectơ bit.

Conal Elliott mô tả việc đánh địa chỉ bộ nhớ thông qua cấu trúc cây lá nhị phân hoàn hảo. Ý không phải mọi máy đều lưu cây cấp nguồn theo nghĩa đen, mà là mô hình cây hợp thành có thể làm lộ cấu trúc hữu ích bị các địa chỉ số phẳng che khuất.

<figure><iframe width="100%" height="315" src="https://www.youtube.com/embed/oaIMMclGuog?si=qGfA1CWoDyXuInHA&amp;clip=Ugkx_TTQq7uzqaz9F1my5lozpOJ9cusgqSG3&amp;clipt=ELD_mwEY0LOeAQ&amp;start=2555&amp;end=2596" title="Conal Elliott — memory addressing as a perfect binary leaf tree" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen=""></iframe><figcaption>Conal Elliott — đánh địa chỉ bộ nhớ như cây lá nhị phân hoàn hảo</figcaption></figure>

## So sánh {#comparison}

| Khái niệm | Đối tượng | Câu hỏi cốt lõi |
| --- | --- | --- |
| Phân nhánh luồng điều khiển | Một lần thực thi chương trình | Tiếp nối nào được chọn? |
| Tính tất định | Quan hệ chuyển tiếp | Bước tiếp theo có được xác định duy nhất không? |
| Tính hội tụ | Quan hệ rút gọn | Các phép rút gọn phân kỳ có thể gặp lại nhau không? |
| Tương đương vết | Chuỗi hành động quan sát được | Các hệ thống có cùng vết thực thi không? |
| Mô phỏng song hành | Cấu trúc chuyển tiếp phân nhánh | Các hệ thống có thể bắt chước bước của nhau không? |
| Đẳng thức ngữ nghĩa chỉ định | Miền ngữ nghĩa được chọn | Các chương trình có cùng ý nghĩa được đặc tả không? |

Các khái niệm này có thể hỗ trợ lẫn nhau, nhưng không khái niệm nào nên được dùng như từ đồng nghĩa cho khái niệm khác.

## Đọc thêm {#further-reading}

*   [*A Calculus of Communicating Systems*](https://www.lfcs.inf.ed.ac.uk/reports/86/ECS-LFCS-86-7/ECS-LFCS-86-7.pdf) — công trình nền tảng của Milner về CCS và tương đương quan sát
*   [*Tính đồng thời và tự động trên chuỗi vô hạn*](https://wrap.warwick.ac.uk/id/eprint/47224/1/WRAP_Park_cs-rr-035.pdf) — đặc trưng hóa đồng quy nạp về mô phỏng song hành của Park
*   [*Các định luật đại số cho tính không tất định và tính đồng thời*](https://www.scss.tcd.ie/matthew.hennessy/pubs/old/HMjacm85.pdf) — Hennessy và Milner về đồng dư quan sát và định luật đại số
*   [*Thời gian phân nhánh là gì và vì sao sử dụng nó?*](https://theory.stanford.edu/~rvg/branching/) ([PDF nén](https://cgi.cse.unsw.edu.au/~rvg/pub/branching.pdf.gz)) — động lực ngắn gọn để bảo toàn cấu trúc phân nhánh
*   [*Phổ thời gian tuyến tính–thời gian phân nhánh*](https://ir.cwi.nl/pub/5685/5685.pdf) — phân loại tiêu chuẩn của các tương đương hành vi
*   [*Thời gian phân nhánh và trừu tượng hóa trong ngữ nghĩa mô phỏng song hành*](https://ir.cwi.nl/pub/5564/5564D.pdf) — công trình nền tảng về mô phỏng song hành phân nhánh
*   [*Ba logic cho mô phỏng song hành phân nhánh*](https://ir.cwi.nl/pub/1370/1370D.pdf) — đặc trưng hóa logic thông qua logic kiểu Hennessy–Milner và CTL\* không có toán tử next
