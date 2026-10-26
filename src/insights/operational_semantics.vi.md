<!-- reader: {"title":"Từ ngữ nghĩa đến máy móc","sourceHash":"sha256:9fe5a0f66907af757d4b29691bf2aa8dcdda8c09246818d79d57434456ba33ab"} -->

# Từ ngữ nghĩa đến máy móc {#semantics-to-machines}

```admonish tip title="Liên quan"
Thiết kế theo ngữ nghĩa trong Rust: [Chương trình bậc nhất](../rust-dd/first-order-programs.md), [Quy trình ngôn ngữ và trình biên dịch](../rust-dd/compiler-pipelines.md)  
Khái niệm: [Ngữ nghĩa vận hành](../concepts/operational_semantics.md), [Monad tự do](../concepts/free_monad.md), [Phong cách truyền tiếp nối](../concepts/cps.md), [Phi chức năng hóa](../concepts/defunctionalization.md)
```

## Ngữ nghĩa vận hành mô tả điều gì {#what-operational-semantics-describes}

Ngữ nghĩa vận hành đặc tả cách một cách biểu diễn chương trình được chọn hoạt động. Nó định nghĩa phán đoán đánh giá hoặc quan hệ chuyển tiếp trên những cấu hình như:

$$ (\mathit{program}, \mathit{state}) \longrightarrow (\mathit{program}', \mathit{state}') $$

Chương trình có thể là cú pháp nguồn, giá trị monad tự do, số hạng CPS, bytecode hoặc trạng thái máy đã phi chức năng hóa. Không cách biểu diễn nào trong số đó *là* ngữ nghĩa vận hành. Ngữ nghĩa vận hành là mô tả cách các giá trị trong cách biểu diễn đã chọn được đánh giá hoặc chuyển bước.

Hướng này quan trọng. Cách biểu diễn cung cấp đối tượng để mô tả hành vi; bổ sung mô tả vận hành không giải thích được ngôn ngữ nên mang ý nghĩa gì.

## Chương trình monad tự do {#free-monad-programs}

Monad tự do cung cấp cú pháp lệnh cùng phép tuần tự hóa được sinh tự do. Nó không cung cấp hành vi của các lệnh đó.

Ngữ nghĩa vận hành cho chương trình monad tự do có thể định nghĩa cấu hình chứa lệnh hiện tại, tiếp nối và mọi trạng thái máy. Sau đó, các quy tắc giải thích, chẳng hạn, cách một lệnh tạm dừng thay đổi trạng thái và chuyển kết quả của nó cho phần chương trình còn lại.

Đó là một cách diễn giải khả dĩ. Cùng chương trình tự do ấy cũng có thể được gấp vào mô hình ngữ nghĩa chỉ định, biên dịch sang ngôn ngữ khác, phân tích hoặc kết xuất mà không chạy.

<details>
<summary><strong>Từ monad tự do đến freer: nghiên cứu đã phát hiện điều gì</strong></summary>

Độc giả từng gặp monad tự do như kiến trúc tổng quát cho chương trình có hiệu ứng có thể tự hỏi vì sao cuộc thảo luận sau đó chuyển sang cấu trúc freer, hiệu ứng mở rộng và handler. Nghiên cứu không đơn thuần loại bỏ monad tự do. Nó cô lập những gì monad tự do thực sự cung cấp, đo lường điểm thất bại của các cách biểu diễn phổ biến và giữ lại cấu trúc hữu ích.

Kiselyov và Ishii suy ra monad freer bằng cách lần lượt gỡ bỏ các ràng buộc và mã khuôn mẫu khỏi cách biểu diễn số hạng có hiệu ứng. Trong biểu diễn freer, một lệnh có thể tạo ra kiểu trung gian bị ẩn khỏi kiểu chương trình cuối cùng, còn một tiếp nối tường minh kết nối kết quả đó với phần tính toán còn lại. Vì vậy, chữ ký lệnh không còn cần một thể hiện `Functor`.

Thay đổi đó tăng tính biểu đạt nhưng tự nó không giải quyết hiệu năng. Biểu diễn freer trực tiếp vẫn hợp thành các tiếp nối như phép nối danh sách kết hợp trái: xử lý chuỗi gồm $n$ yêu cầu có thể tốn $O(n^2)$ công việc. Việc làm lộ tiếp nối cho thấy cơ hội thực sự — có thể lưu nó trong một chuỗi căn chỉnh theo kiểu, trong đó kiểu kết quả và kiểu đầu vào kế cận khớp nhau theo cấu trúc. Ghép chuỗi hiệu quả loại bỏ phép duyệt nhạy với tính kết hợp.

Sau đó, hợp các kiểu mở cho phép bộ diễn giải hiệu ứng mở thêm, kết hợp và loại bỏ các kiểu yêu cầu đã chọn. Điều này giải quyết việc hợp thành hiệu ứng mô-đun và cấu trúc handler. Nó vẫn không cung cấp các phương trình của một miền cụ thể hay quyết định khi nào hai chương trình có hiệu ứng mang cùng ý nghĩa.

Kết luận chính xác hơn câu “freer tốt hơn free”. Monad tự do phát hiện sự phân tách có giá trị giữa yêu cầu và cách diễn giải. Cách mã hóa freer gỡ bỏ một ràng buộc không cần thiết; hàng đợi căn chỉnh theo kiểu xử lý vấn đề hiệu năng đã đo được; hiệu ứng mở rộng cải thiện phép hợp thành. Mỗi bước giữ lại hiểu biết từ bước trước đồng thời thu hẹp phạm vi khẳng định. Cách diễn giải ngữ nghĩa vẫn luôn là quyết định riêng.

Xem Kiselyov và Ishii, [*Freer Monads, More Extensible Effects*](https://okmij.org/ftp/Haskell/extensible/more.pdf).

</details>

## Chương trình CPS {#cps-programs}

Phong cách truyền tiếp nối (CPS) biểu diễn tường minh phần còn lại của phép tính dưới dạng tiếp nối. Ngữ nghĩa vận hành cho CPS mô tả các hành vi như:

*   đánh giá biểu thức CPS hiện tại;
*   truyền giá trị vừa tạo cho tiếp nối;
*   chuyển quyền điều khiển khi tiếp nối đó được áp dụng.

CPS làm lộ điều khiển theo dạng thuận tiện để mô tả về mặt vận hành, nhưng nó là cách biểu diễn hoặc phép biến đổi chương trình — không phải ngữ nghĩa vận hành. Muốn liên hệ chương trình theo phong cách trực tiếp với bản dịch CPS, cần nêu ngữ nghĩa nguồn, ngữ nghĩa đích và lập luận về tính bảo toàn.

<details>
<summary><strong>Vượt ra ngoài CPS: khi cần kiểm tra tiếp nối</strong></summary>

CPS là cách khắc phục tiêu chuẩn cho phép nối và bind nhạy với tính kết hợp. Thay vì duyệt lặp lại một cấu trúc kết hợp trái, nó biểu diễn phép tính còn lại bằng phép hợp thành hàm. Cách biểu diễn này có thể hiệu quả khi thao tác duy nhất trên tiếp nối là áp dụng cuối cùng.

Van der Ploeg và Kiselyov xác định ranh giới: một số bên sử dụng phải kiểm tra hoặc sửa đổi kết quả trung gian trước khi tiếp tục. Tìm kiếm không tất định, iteratee, monad tự do và hiệu ứng mở rộng đều có thể cần truy cập như vậy. CPS giấu chuỗi khái niệm bên trong một hàm, nên muốn khôi phục cấu trúc trung gian phải phản chiếu nó trở lại thành dữ liệu, có thể làm mất lợi thế hiệu năng.

Giải pháp thay thế của họ biểu diễn trực tiếp chuỗi ẩn dưới dạng cấu trúc dữ liệu căn chỉnh theo kiểu. Cấu trúc này hỗ trợ hợp thành hiệu quả bất kể tính kết hợp, đồng thời giữ khả năng truy cập hiệu quả vào kết quả trung gian. Kiểu bảo đảm mỗi phép tính được lưu tạo ra đầu vào mà phép kế tiếp mong đợi.

Kết luận rộng hơn không phải là chuỗi căn chỉnh theo kiểu đánh bại CPS. CPS rất phù hợp để *áp dụng* tiếp nối và kém phù hợp hơn khi bên sử dụng phải *kiểm tra* chúng. Nghiên cứu về điều khiển có giới hạn còn làm sắc nét bài học: thay vì xem toàn bộ tương lai là một tiếp nối không phân biệt, dấu phân cách nêu rõ phần nào của phép tính xung quanh có thể được bắt giữ và thao tác.

Những ý tưởng này không biến mất. Bài học của chúng tiếp tục trong handler hiệu ứng, suy dẫn máy trừu tượng, toán tử điều khiển có kiểu và cách biểu diễn hiệu ứng hiệu quả. Điều thay đổi là kỳ vọng rằng chỉ riêng CPS phải trở thành phép trừu tượng cuối cùng.

Xem van der Ploeg và Kiselyov, [*Phản chiếu không hối tiếc*](https://okmij.org/ftp/Haskell/zseq.pdf). Để biết thêm về điều khiển, xem [tuyển tập về tiếp nối và điều khiển có giới hạn](https://okmij.org/ftp/continuations/index.html).

</details>

## Máy đã phi chức năng hóa {#defunctionalized-machines}

Phi chức năng hóa thay một họ giá trị hàm đã biết, chẳng hạn tiếp nối CPS, bằng các cấu trúc bậc nhất và phép toán `apply`. Sau đó, ngữ nghĩa vận hành có thể mô tả chuyển tiếp giữa các cấu hình tường minh thu được.

Sau một phép biến đổi CPS cụ thể rồi phi chức năng hóa, các chuyển tiếp ấy có thể suy ra một máy trừu tượng. Đây là phép suy dẫn mạnh mẽ, nhưng không phải định nghĩa chung của ngữ nghĩa vận hành: quy tắc vận hành không nhất thiết bắt nguồn từ CPS, và máy bậc nhất bất kỳ không tự động trở thành máy tiếp nối đã phi chức năng hóa.

<details>
<summary><strong>Reynolds: nguồn gốc của phi chức năng hóa</strong></summary>

John C. Reynolds giới thiệu phi chức năng hóa trong nghiên cứu năm 1972 về bộ diễn giải định nghĩa. Điểm xuất phát của ông không phải máy ảo bậc nhất mà là bộ diễn giải bậc cao: hàm trong ngôn ngữ định nghĩa biểu diễn môi trường, tiếp nối và các phần khác của ngôn ngữ được định nghĩa.

Phép biến đổi quan sát họ hữu hạn các trừu tượng hàm có thể xuất hiện trong toàn chương trình. Nó thay mỗi trừu tượng bằng cấu trúc bậc nhất mang các giá trị biến tự do, rồi thay phép áp dụng hàm bằng một phép toán `apply` duy nhất điều phối theo các cấu trúc đó. Điều vốn ngầm trong ngôn ngữ định nghĩa trở thành đại số tường minh của closure hoặc tiếp nối.

Khi áp dụng cho bộ diễn giải dựa trên tiếp nối, bước này làm lộ một máy: các cấu trúc tiếp nối trở thành trạng thái điều khiển, biến được bắt giữ trở thành dữ liệu máy được lưu trữ, còn `apply` trở thành bộ điều phối chuyển tiếp. Máy không được phỏng đoán trước mà được suy ra từ bộ đánh giá bậc cao.

Reynolds cũng nhấn mạnh cái giá của sự rõ ràng này. Máy thu được chứa những lựa chọn biểu diễn đúng đắn nhưng không duy nhất. Các lựa chọn cấu trúc khác nhau hoặc phép biến đổi trước đó có thể tạo ra những tập “bánh răng và cơ cấu” kiểu máy khác nhau mà vẫn bảo toàn cùng hành vi. Vì thế phi chức năng hóa làm lộ cấu trúc vận hành, chứ không phải ý nghĩa tất yếu duy nhất của ngôn ngữ.

Về sau Danvy và Nielsen hệ thống hóa kỹ thuật của Reynolds thành phép biến đổi toàn chương trình và nghiên cứu tái chức năng hóa như phép nghịch đảo. Kết luận sâu hơn của họ là phép biến đổi này đóng vai trò cây cầu: nó có thể chuyển đặc tả và lập luận đúng đắn giữa định nghĩa bậc cao và máy bậc nhất, đồng thời làm lộ rằng các chương trình có vẻ không liên quan thực ra là hai cách biểu diễn cùng một cấu trúc.

Dòng nghiên cứu này xác định đúng thẩm quyền của kỹ thuật. Phi chức năng hóa không chỉ là thay closure bằng enum, nhưng cũng không phải nền tảng phổ quát: đó là phép chuyển bảo toàn ngữ nghĩa giữa các cách biểu diễn mà mối tương ứng cần được xác lập.

Xem Reynolds, [*Bộ diễn giải định nghĩa cho ngôn ngữ lập trình bậc cao*](https://homepages.inf.ed.ac.uk/wadler/papers/papers-we-love/reynolds-definitional-interpreters-1972.pdf), và Danvy cùng Nielsen, [*Phi chức năng hóa trong thực tế*](https://tidsskrift.dk/brics/article/view/21684).

</details>

## Chu trình biểu diễn vận hành {#the-operational-representation-cycle}

Một sai lầm lặp lại là tìm kiếm một cách biểu diễn vận hành giải quyết mọi vấn đề lập trình. Mỗi cách biểu diễn khôi phục điều mà cách trước che giấu, nhưng khiến mối quan tâm khác trở nên khó hơn:

$$ \text{higher-order program} \longrightarrow \text{free syntax} \longrightarrow \text{CPS} \longrightarrow \text{first-order machine} \longrightarrow \text{higher abstraction} $$

Các mũi tên không khẳng định một quy trình trình biên dịch bắt buộc. Chúng cho thấy sự dịch chuyển thiết kế thường gặp: làm lộ điều mà cách biểu diễn hiện tại che giấu, rồi che lại cơ chế được đưa vào bởi sự bộc lộ đó.

| Cách biểu diễn | Điều nó làm sẵn có | Áp lực nó tạo ra |
| --- | --- | --- |
| Hàm bậc cao | Phép hợp thành trực tiếp và trừu tượng hóa của ngôn ngữ chủ | Bên sử dụng tổng quát có thể gọi hàm, nhưng không thể kiểm tra cấu trúc bị ẩn của nó |
| Cú pháp tự do kèm tuần tự hóa | Chương trình dưới dạng dữ liệu có thể hợp thành và diễn giải | Tính tự do không cung cấp phương trình miền, chuẩn hóa, đánh giá hiệu quả hay khả năng kiểm tra các hàm được lưu trữ |
| CPS | Thứ tự đánh giá và phần tính toán còn lại trở nên tường minh | Mã hóa CPS toàn chương trình luồn tiếp nối qua gần như mọi giao diện |
| Điều khiển bậc nhất đã phi chức năng hóa | Tiếp nối trở thành các trường hợp có thể kiểm tra và tuần tự hóa | Phải tường minh duy trì các cấu trúc, đối số được lưu, trạng thái chuyển tiếp và phép toán `apply` |
| Một lớp trừu tượng cao hơn trên máy | Cơ chế trở nên dễ dùng hơn | Cấu trúc lại bị che giấu khi trình biên dịch, bộ lập lịch, trình gỡ lỗi hoặc bộ tối ưu hóa cần kiểm tra |

Các áp lực này mang tính cấu trúc. Việc kiểm tra đòi hỏi dữ liệu. Chuyển hành vi thành dữ liệu đưa vào các cấu trúc và bộ diễn giải. Che giấu lại những cấu trúc đó phục hồi phép trừu tượng thuận tiện nhưng tước bỏ chính quyền truy cập mà bên sử dụng cần để phân tích hoặc biến đổi chương trình.

Đánh đổi của monad tự do đặc biệt giàu tính gợi mở. Monad tự do giải quyết một vấn đề chính xác: nó sinh ra phép tuần tự hóa cho functor lệnh mà không áp đặt phương trình nào ngoài các định luật monad. Cam kết đó cũng chính là giới hạn. Nó không biết các định luật của miền. Nếu hai lần ghi vào cùng ô tương đương với lần ghi cuối cùng, chương trình tự do vẫn chứa cả hai lệnh cho đến khi phép chuẩn hóa hoặc cách diễn giải đặc thù miền nhận diện chúng. Vì thế, tối ưu hóa, dạng chuẩn tắc và đẳng thức ngữ nghĩa phải đến từ nơi khác.

Tái hóa lệnh cũng không làm toàn bộ chương trình có thể kiểm tra đồng nhất. Trong các cách mã hóa phổ biến, lệnh đang tạm dừng hiển thị được, nhưng tiếp nối của nó là hàm trong ngôn ngữ chủ. Bộ phân tích tổng quát không thể kiểm tra cấu trúc tương lai bị ẩn sau hàm đó nếu không cung cấp kết quả rồi áp dụng hàm. Tái hóa tiếp nối giúp khôi phục khả năng kiểm tra bằng cách tiến về biểu diễn bậc nhất hoặc đã phi chức năng hóa — và đưa chúng ta trở lại bước kế tiếp của chu trình.

Chi phí đánh giá cũng phụ thuộc cách biểu diễn. Cây bind kết hợp trái ngây thơ có thể cần duyệt lặp đi lặp lại, gây công việc bậc hai. Phép biến đổi sao chép các chương trình con còn lại có thể khiến kích thước tăng theo hàm mũ. Các cách mã hóa Codensity, freer hoặc chuyên biệt có thể cải thiện những chi phí nhất định, nhưng bằng cách chọn cách biểu diễn và đánh đổi khác. Tăng trưởng hàm mũ có thể xảy ra; đó không phải định luật nội tại của monad tự do.

Đó là lý do monad tự do không phải giải pháp phổ quát. Nó cung cấp cú pháp cùng phép tuần tự hóa hợp luật, chứ không cung cấp phương trình miền dự định, dạng chuẩn tắc, khả năng quan sát cấu trúc hoàn chỉnh hay cách triển khai tự động hiệu quả. Tương tự, CPS không cần lan ra toàn hệ thống khi chỉ được dùng cục bộ; phi chức năng hóa chỉ trở nên cồng kềnh tương ứng với quy mô họ hàm và các giá trị được bắt giữ mà nó cần tái hóa.

Chu trình xuất hiện khi mỗi cách mã hóa mới được yêu cầu trở thành nền tảng phổ quát. Nó giải quyết bất tiện vận hành trước đó rồi trở thành nguồn phức tạp ngoài ý muốn tiếp theo.

Vì thế, tranh luận về “phép trừu tượng tốt nhất” không đi đến thống nhất khi chỉ giới hạn ở vận hành. Hàm bậc cao, cú pháp tự do, CPS và máy bậc nhất được so sánh như thể một dạng phải vượt trội mọi dạng còn lại. Nhưng *tốt hơn* không có nghĩa cho đến khi phép so sánh nêu rõ cần bảo toàn điều gì và ai sẽ sử dụng kết quả:

*   thực thi trực tiếp ưu tiên lời gọi thông thường và biểu diễn được che giấu;
*   biến đổi và phân tích đòi hỏi cấu trúc có thể kiểm tra;
*   tuần tự hóa đòi hỏi dữ liệu bậc nhất;
*   khả năng mở rộng có thể thuận lợi hơn khi thêm cách diễn giải hoặc thêm cú pháp, nhưng hiếm khi thuận lợi đồng đều cho cả hai;
*   tính đồng thời có thể đòi hỏi các quan sát chủ ý bỏ qua nhiều lựa chọn lập lịch.

Đây là những yêu cầu khác nhau, không phải các chứng minh liên tiếp rằng một phép trừu tượng vượt trội phổ quát. Thuộc tính vận hành có thể giúp chọn cách triển khai cho mục đích đã nêu; chúng không thể cung cấp mục đích hay quyết định khác biệt nào có ý nghĩa.

Cùng sự thận trọng đó áp dụng cho tư duy tuần tự. Ngữ nghĩa vận hành có thể mô tả hệ thống đồng thời và không tất định, nhưng một chuỗi bước máy duy nhất chỉ là một cách biểu diễn hành vi khả dĩ. Nếu thứ tự lập lịch được xem là thẩm quyền quá sớm, các lần thực thi tương đương sẽ bị xem là khác nhau chỉ vì cơ chế của chúng đan xen khác đi. Trước hết, mô hình ngữ nghĩa phải quyết định quan sát nào phân biệt các chương trình đồng thời; sau đó mới đánh giá lịch vận hành theo quyết định ấy.

## Ví dụ thực tế: EVM {#real-example-the-evm}

Máy ảo Ethereum (EVM) có thể được hiểu theo góc nhìn vận hành:

*   **Trạng thái**: bộ đếm chương trình, ngăn xếp, bộ nhớ, lưu trữ, gas
*   **Quy tắc chuyển tiếp**: mỗi opcode có một quy tắc (`ADD`, `PUSH`, `SSTORE`, v.v.)
*   **Thực thi**: liên tục áp dụng quy tắc bước nhỏ đến khi dừng

Bytecode EVM là dữ liệu lệnh bậc nhất. Mô tả vận hành nêu cách cấu hình EVM thay đổi theo từng opcode; một máy khách cụ thể triển khai hành vi đó.

Vòng lặp điều phối và bộ đếm chương trình có thể trông giống máy trừu tượng đã phi chức năng hóa. Tuy nhiên, gọi chúng là tiếp nối đã phi chức năng hóa đòi hỏi nguồn bậc cao, phép biến đổi và mối tương ứng cụ thể — không chỉ một vòng lặp có vẻ tương tự.

## Phá vỡ chu trình: ý nghĩa trước cơ chế {#breaking-the-cycle-meaning-before-machinery}

Các mô tả vận hành và ngữ nghĩa chỉ định trả lời những câu hỏi khác nhau:

$$ \begin{aligned} \llbracket p \rrbracket &\in D && \text{what does the program mean?} \\ c &\longrightarrow c' && \text{how does this representation step?} \end{aligned} $$

Phát triển lấy ý nghĩa làm trọng tâm chọn miền ngữ nghĩa, phép hợp thành, quan sát và định luật trước khi cam kết với cách biểu diễn máy. Một khi đã chọn hệ chuyển tiếp, nghĩa vụ đúng đắn của nó là nối kết hai lớp. Với ý nghĩa cấu hình hoàn chỉnh được định nghĩa phù hợp, một khẳng định bảo toàn qua bước nội bộ điển hình có dạng:

$$ c \longrightarrow c' \quad \Longrightarrow \quad \operatorname{meaning}(c) = \operatorname{meaning}(c') $$

Quan hệ chính xác có thể dùng tương đương quan sát, vết thực thi hoặc mô phỏng song hành. Điều quan trọng là máy phải chịu trách nhiệm trước ý nghĩa dự định.

Thiết kế theo ngữ nghĩa không chọn bên thắng trong chu trình. Nó thiết lập nguồn thẩm quyền ổn định bên ngoài chu trình đó:

1.  Định nghĩa miền ngữ nghĩa, phép toán, phép hợp thành và định luật.
2.  Viết chương trình theo ý nghĩa đó.
3.  Chọn cách biểu diễn cho bên sử dụng cụ thể: thực thi trực tiếp, kiểm tra, biên dịch, lập lịch, tuần tự hóa hoặc phân tích.
4.  Liên hệ mọi cách biểu diễn và phép biến đổi đã chọn trở lại cùng ý nghĩa.

Vì vậy, bộ diễn giải bậc cao và chương trình bậc nhất có thể cùng tồn tại. Không dạng nào cần là định nghĩa ngôn ngữ. Dạng thứ nhất có thể phục vụ thực thi trực tiếp; dạng thứ hai có thể phục vụ bên sử dụng cần cấu trúc. Sự thống nhất giữa chúng là nghĩa vụ ngữ nghĩa, chứ không phải giả định rằng cơ chế của chúng giống nhau.

```admonish note title="Không có phép trừu tượng vận hành cuối cùng"
Mọi cách biểu diễn vận hành đều làm lộ một số cấu trúc và che giấu cấu trúc khác. Ý nghĩa là điểm ổn định để lựa chọn và liên hệ các cách biểu diễn phù hợp.
```

## Tóm tắt {#summary}

*   Ngữ nghĩa vận hành mô tả đánh giá hoặc chuyển tiếp cho một cách biểu diễn đã chọn.
*   Monad tự do cung cấp cú pháp lệnh và phép tuần tự hóa, nhưng hành vi vẫn cần một cách diễn giải.
*   CPS làm lộ tiếp nối; quy tắc vận hành có thể mô tả cách chương trình CPS truyền giá trị và điều khiển.
*   Phi chức năng hóa có thể chuyển một chương trình bậc cao cụ thể thành máy bậc nhất với các chuyển tiếp được mô tả theo vận hành.
*   Xem bất kỳ cách mã hóa nào trong số này là phổ quát sẽ tạo ra chu trình tái hóa rồi che giấu cấu trúc.
*   Ý nghĩa ngữ nghĩa chỉ định xác định các chuyển tiếp đó phải bảo toàn điều gì.
