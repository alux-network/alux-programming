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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">ALUXプログラミング</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">意味論の視点</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">なぜ意味を先に考えるのか</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">表示と合成性</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">Denotational Design</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">法則と解釈</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">依存型と証明</a></li><li class="chapter-item expanded affix "><li class="part-title">Rustで意味から設計する</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">ケイパビリティ代数</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Rustの意味論的型</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">導出される意味と合成</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">インタープリターと副作用</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">法則、シナリオ、証拠</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">一階プログラム</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">言語とコンパイラーパイプライン</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">意味から始めるワークフロー</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">概念</li><li class="chapter-item expanded "><a href="concepts/index.html">はじめに</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">操作的意味論</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">式問題</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">参照透過性</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">自由モナド</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">継続渡し形式</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">関数のデファンクショナライズ</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">分岐と合流性</a></li><li class="chapter-item expanded affix "><li class="part-title">洞察</li><li class="chapter-item expanded "><a href="insights/index.html">はじめに</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">意味論から機械へ</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">Expression Problem再考</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">参照透過性再考</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">EVM代数</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">貢献する</li><li class="chapter-item expanded "><a href="about.html">本書について</a></li></ol>';
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
