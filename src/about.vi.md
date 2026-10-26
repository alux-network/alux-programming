<!-- reader: {"title":"Về cuốn sách","sourceHash":"sha256:dc574b72cd9d99b223d155921c54f7cf34eb8ee02ac5655eb0c184c2c520199a"} -->

# Giới thiệu {#about}

Cuốn sách này chắt lọc một cách tư duy về phần mềm lấy cảm hứng từ **Thiết kế theo ngữ nghĩa** của Conal Elliott. Ý tưởng cốt lõi đơn giản nhưng sâu sắc:

```admonish note title="Thiết kế theo ngữ nghĩa"
*Định nghĩa ý nghĩa của chương trình trước khi quyết định cách chạy nó.*
```

Theo góc nhìn này, tính toán không phải chuỗi bước mờ đục mà là đối tượng toán học trong suốt. Ta bắt đầu bằng **đặc tả** dưới dạng mô tả thuần, có thể hợp thành về *ý nghĩa* của chương trình. Chúng được biểu đạt thành cấu trúc đại số, thường dưới dạng đặc trưng hoặc chữ ký kiểu. **Cách triển khai** — *cách thức* hiện thực hóa những ý nghĩa ấy — là lớp riêng biệt, có thể thay thế.

Bằng cách tách ý nghĩa khỏi cơ chế, ta có được:

*   **Rõ ràng** — chương trình đọc như định nghĩa chính xác.
*   **Khả năng hợp thành** — các phần kết hợp với nhau theo đại số.
*   **Khả năng tái cấu trúc** — ý nghĩa giữ nguyên khi cách triển khai phát triển.
*   **Tính đúng đắn** — lập luận về chương trình dựa trên phương trình, không dựa trên vận hành.

Các hướng dẫn này nhằm cung cấp kỹ thuật thực tiễn để áp dụng phong cách đó trong ngôn ngữ lập trình hiện đại, đặc biệt là Rust, mà không làm mất vẻ thanh nhã và tính chặt chẽ từ cội nguồn toán học.

Cuốn sách chủ ý phân biệt ba cấp độ:

*   **Ý nghĩa** nêu các giá trị, quan hệ và phép biến đổi đang được thiết kế.
*   **Biểu diễn** chọn cách mã hóa các ý nghĩa đó thành kiểu và dữ liệu.
*   **Thực thi** chọn cách một biểu diễn chạy trên máy.

ALUX và Tolang gợi ý nhiều ví dụ, nhưng bạn không cần biết chúng để theo dõi ấn bản này. Trước hết, cuốn sách phát triển từ vựng.

## Tài liệu tham khảo mdbook {#reference-of-mdbook}

[Tài liệu mdBook](https://rust-lang.github.io/mdBook/index.html)

## Tài liệu tham khảo plugin mdbook **admonish** (các hộp chú giải) {#reference-of-admonish-mdbook-plugin-tooltip-boxes}

[Tài liệu admonish](https://tommilligan.github.io/mdbook-admonish/)
