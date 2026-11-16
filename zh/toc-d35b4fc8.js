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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">ALUX 编程</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">语义视角</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">为何含义优先</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">指称与组合性</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">指称设计</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">定律与解释</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">依赖类型与证明</a></li><li class="chapter-item expanded affix "><li class="part-title">Rust 中的语义驱动设计</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">能力代数</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Rust 中的语义类型</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">派生含义与组合</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">解释器与效应</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">定律、场景与证据</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">一阶程序</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">语言与编译器流水线</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">语义优先的工作流程</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">概念</li><li class="chapter-item expanded "><a href="concepts/index.html">简介</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">操作语义</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">表达式问题</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">引用透明性</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">自由单子</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">延续传递风格</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">去函数化</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">分支与合流</a></li><li class="chapter-item expanded affix "><li class="part-title">洞见</li><li class="chapter-item expanded "><a href="insights/index.html">简介</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">从语义到机器</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">重新审视表达式问题</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">重新审视引用透明性</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">EVM 代数</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">参与贡献</li><li class="chapter-item expanded "><a href="about.html">关于本书</a></li></ol>';
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
