<!-- reader: {"title":"Kiểu phụ thuộc và chứng minh","sourceHash":"sha256:b7b61b22019652d49f915eb1a5420238e6332dc16889f5910c35bf487d5ab080"} -->

# Kiểu phụ thuộc và chứng minh {#dependent-types-and-proofs}

```admonish tip title="Liên quan"
Góc nhìn ngữ nghĩa: [Thiết kế theo ngữ nghĩa](design.md), [Định luật và cách diễn giải](laws-and-interpretations.md)  
Thiết kế theo ngữ nghĩa trong Rust: [Kiểu ngữ nghĩa trong Rust](../rust-dd/semantic-types.md), [Định luật, tình huống và bằng chứng](../rust-dd/laws.md)
```

```admonish note title="Vị trí ngữ nghĩa"
Kiểu phụ thuộc biểu đạt các mệnh đề và bằng chứng được đánh chỉ mục theo giá trị trong một hệ kiểu. Chúng có thể mã hóa một phần đặc tả ngữ nghĩa, nhưng không chọn đặc tả đó: thuộc tính dự định phải rõ ràng trước khi được đưa vào kiểu.
```

## Kiểu được đánh chỉ mục theo giá trị {#types-indexed-by-values}

Một kiểu là *phụ thuộc* khi nó có thể phụ thuộc vào một giá trị. Do đó, kiểu phụ thuộc có thể mô tả không chỉ hình dạng của giá trị mà còn cả một quan hệ mà giá trị phải thỏa mãn.

Ví dụ gồm:

*   `Vec<n, T>` — một vectơ được đánh chỉ mục theo độ dài `n`
*   `Matrix<rows, cols, T>` — ma trận được đánh chỉ mục theo kích thước
*   `Proof<p>` — bằng chứng cho mệnh đề `p`

Chẳng hạn:

```hs
append : Vec<n, T> -> Vec<m, T> -> Vec<n + m, T>
```

Kiểu kết quả phát biểu rằng nối các vectơ có độ dài `n` và `m` sẽ tạo ra vectơ có độ dài `n + m`.

## Hàm phụ thuộc {#dependent-functions}

Kiểu hàm phụ thuộc được viết như sau:

$$ \Pi (x : A).\,B(x) $$

Với mỗi giá trị $x$ thuộc kiểu $A$, kết quả có kiểu $B(x)$. Hãy so sánh:

$$ \begin{aligned} f &\colon A \to B \\ g &\colon (x : A) \to B(x) \end{aligned} $$

Kiểu kết quả của $f$ là cố định. Kiểu kết quả của $g$ có thể thay đổi theo đầu vào.

Theo tương ứng mệnh đề-là-kiểu, một kiểu có thể phát biểu mệnh đề và một số hạng thuộc kiểu đó có thể làm chứng minh cho mệnh đề. Điều này hỗ trợ các API trong đó không thể tạo ra trạng thái, chuyển tiếp hoặc phép hợp thành không hợp lệ.

## Quan hệ với Thiết kế theo ngữ nghĩa {#relationship-to-denotational-design}

Thiết kế theo ngữ nghĩa trước hết đặt câu hỏi:

1.  Miền ngữ nghĩa là gì?
2.  Những quan sát và phép hợp thành nào quan trọng?
3.  Những định luật nào phải đúng?

Sau đó, kiểu phụ thuộc có thể nội tại hóa một số câu trả lời. Chỉ mục kiểu có thể ghi lại độ dài vectơ, trạng thái giao thức, độ sâu ngăn xếp, giới hạn tài nguyên hoặc bằng chứng rằng hai kiến tạo biểu thị cùng một kết quả.

Thứ tự rất quan trọng. Kiểu tinh vi không thể bù đắp ý nghĩa còn thiếu. Nó chỉ củng cố đặc tả khi mệnh đề được đánh chỉ mục đã mô tả một khác biệt ngữ nghĩa dự định hoặc bất biến biểu diễn được chọn có chủ ý.

```admonish warning title="Đừng nhầm mệnh đề ngữ nghĩa với bất biến biểu diễn"
Cả hai đều có thể được mã hóa bằng kiểu nhưng có thẩm quyền khác nhau. Mọi bộ diễn giải tương thích phải bảo toàn mệnh đề ngữ nghĩa. Bất biến biểu diễn chỉ ràng buộc cách biểu diễn đã chọn nó.
```

## Chứng minh và bằng chứng thực thi được {#proofs-and-executable-evidence}

Chứng minh xác lập một mệnh đề theo các giả định đã nêu. Kiểm thử thuộc tính, tình huống và đơn vị cung cấp bằng chứng thực thi hữu hạn. Mã hóa mệnh đề trong kiểu phụ thuộc có thể cho phép trình kiểm tra kiểu xác minh một số hạng chứng minh, nhưng điều đó không biến kiểm thử thành chứng minh hay biến trình biên dịch thành nguồn gốc của mệnh đề.

Đây là cùng một sự phân tách được dùng trong toàn cuốn sách: ý nghĩa và định luật nêu nghĩa vụ; công cụ kiểm tra hoặc hiện thực hóa nghĩa vụ đó.

## Áp dụng mô hình trong Rust {#applying-the-model-in-rust}

Rust không phải ngôn ngữ có kiểu phụ thuộc đầy đủ, nhưng generic hằng, typestate, kiểu liên kết và ràng buộc đặc trưng có thể biểu đạt những quan hệ đánh chỉ mục hữu ích. Các cách mã hóa này có thể chuyển việc kiểm tra sang thời điểm biên dịch và thường vẫn giữ được cách biểu diễn cụ thể hiệu quả.

Mô hình tư duy hướng chứng minh vẫn hữu ích ngay cả khi Rust không thể biểu đạt mệnh đề đầy đủ. Hãy nêu rõ bất biến, mã hóa phần mà hệ kiểu có thể thực thi, rồi giữ lại định luật hoặc kiểm thử cho phần còn lại. Cách mã hóa phục vụ đặc tả, chứ không thay thế nó.

```admonish example title="Lưới được đánh chỉ mục theo vị trí"
[`typed-grid-rs`](https://github.com/tgrospic/typed-grid-rs) hiện thực hóa ý tưởng `Matrix<rows, cols, T>` ở trên trong Rust ổn định. Mỗi ô trở thành kiểu được đánh chỉ mục theo tọa độ — `Pos0x0`, `Pos1x2`, v.v. — và một bước di chuyển trả về kiểu vị trí *khác*:

`Pos0x0.right()` biểu thị `Pos1x0`; bước ra khỏi mép không phải lỗi lúc chạy mà là chương trình không kiểm tra kiểu được, vì chuyển động tương ứng không bao giờ được sinh ra ở biên.

Đây chính là phép nâng mà phần này mô tả: tọa độ vốn nằm trong thế giới giá trị được đưa vào kiểu, và việc điều hướng hợp lệ trở thành hàm toàn phần được kiểm tra lúc biên dịch. Các kiểu đánh dấu có kích thước bằng không, vì vậy mệnh đề được đánh chỉ mục không tốn chi phí khi chạy.
```
