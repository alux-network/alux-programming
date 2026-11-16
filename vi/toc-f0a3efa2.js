// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">Lập trình ALUX</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Góc nhìn ngữ nghĩa</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">Vì sao ý nghĩa được đặt lên trước</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">Ngữ nghĩa chỉ định và tính hợp thành</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">Thiết kế theo ngữ nghĩa</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">Định luật và cách diễn giải</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">Kiểu phụ thuộc và chứng minh</a></li><li class="chapter-item expanded affix "><li class="part-title">Thiết kế theo ngữ nghĩa trong Rust</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">Các đại số năng lực</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Kiểu ngữ nghĩa trong Rust</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">Ý nghĩa suy ra và phép hợp thành</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">Bộ diễn giải và hiệu ứng</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">Định luật, tình huống và bằng chứng</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">Chương trình bậc nhất</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">Quy trình ngôn ngữ và trình biên dịch</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">Quy trình lấy ý nghĩa làm trọng tâm</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Khái niệm</li><li class="chapter-item expanded "><a href="concepts/index.html">Giới thiệu</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">Ngữ nghĩa vận hành</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">Bài toán biểu thức</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">Tính minh bạch tham chiếu</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">Monad tự do</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">Phong cách truyền tiếp nối</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">Phi chức năng hóa</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">Phân nhánh và hội tụ</a></li><li class="chapter-item expanded affix "><li class="part-title">Nhận định</li><li class="chapter-item expanded "><a href="insights/index.html">Giới thiệu</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">Từ ngữ nghĩa đến máy móc</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">Bài toán biểu thức trở lại</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">Nhìn lại tính minh bạch tham chiếu</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">Đại số EVM</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Đóng góp</li><li class="chapter-item expanded "><a href="about.html">Về cuốn sách</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
