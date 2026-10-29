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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">ALUX 프로그래밍</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">의미론적 관점</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">왜 의미가 먼저인가</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">표시와 합성성</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">표시적 설계</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">법칙과 해석</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">종속 타입과 증명</a></li><li class="chapter-item expanded affix "><li class="part-title">Rust에서 의미 중심 설계</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">케이퍼빌리티 대수</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Rust의 의미 타입</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">파생 의미와 합성</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">인터프리터와 효과</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">법칙, 시나리오, 증거</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">일차 프로그램</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">언어와 컴파일러 파이프라인</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">의미 우선 작업 흐름</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">개념</li><li class="chapter-item expanded "><a href="concepts/index.html">소개</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">작동 의미론</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">표현식 문제</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">참조 투명성</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">자유 모나드</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">연속 전달 스타일</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">디펑셔널라이제이션</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">분기와 합류성</a></li><li class="chapter-item expanded affix "><li class="part-title">통찰</li><li class="chapter-item expanded "><a href="insights/index.html">소개</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">의미론에서 기계로</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">표현식 문제 다시 보기</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">참조 투명성 다시 보기</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">EVM 대수</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">기여하기</li><li class="chapter-item expanded "><a href="about.html">책 소개</a></li></ol>';
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
