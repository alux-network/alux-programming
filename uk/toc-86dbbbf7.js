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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">Програмування ALUX</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Семантичний погляд</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">Чому значення має бути першим</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">Денотації та композиційність</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">Денотаційне проєктування</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">Закони та інтерпретації</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">Залежні типи та доведення</a></li><li class="chapter-item expanded affix "><li class="part-title">Проєктування від значення в Rust</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">Алгебри можливостей</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Семантичні типи в Rust</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">Похідне значення та композиція</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">Інтерпретатори й ефекти</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">Закони, сценарії та свідчення</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">Програми першого порядку</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">Мова й конвеєри компілятора</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">Робочий процес, орієнтований на значення</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Поняття</li><li class="chapter-item expanded "><a href="concepts/index.html">Вступ</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">Операційна семантика</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">Проблема виразів</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">Референційна прозорість</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">Вільна монада</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">Стиль передавання продовжень</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">Дефункціоналізація</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">Розгалуження та конфлюентність</a></li><li class="chapter-item expanded affix "><li class="part-title">Інсайти</li><li class="chapter-item expanded "><a href="insights/index.html">Вступ</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">Від семантики до машин</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">Проблема виразів: новий погляд</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">Референційна прозорість: новий погляд</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">Алгебра EVM</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Долучитися до розробки</li><li class="chapter-item expanded "><a href="about.html">Про книжку</a></li></ol>';
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
