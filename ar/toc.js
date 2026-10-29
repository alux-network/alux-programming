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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">برمجة ALUX</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">المنظور الدلالي</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">لماذا يأتي المعنى أولًا</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">الدلالات والتركيبية</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">التصميم الدلالي</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">القوانين والتفسيرات</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">الأنواع التابعة والبراهين</a></li><li class="chapter-item expanded affix "><li class="part-title">التصميم انطلاقًا من المعنى في Rust</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">جبر القدرات</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">الأنواع الدلالية في Rust</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">المعنى المشتق والتركيب</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">المفسرات والآثار</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">القوانين والسيناريوهات والأدلة</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">برامج من الرتبة الأولى</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">مسارات اللغة والمترجم</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">منهجية تبدأ بالمعنى</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">المفاهيم</li><li class="chapter-item expanded "><a href="concepts/index.html">مقدمة</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">الدلالات التشغيلية</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">مسألة التعبير</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">الشفافية المرجعية</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">الموناد الحر</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">أسلوب تمرير الاستمرار</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">إزالة الدوال</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">التفرع والتلاقي</a></li><li class="chapter-item expanded affix "><li class="part-title">رؤى</li><li class="chapter-item expanded "><a href="insights/index.html">مقدمة</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">من الدلالات إلى الآلات</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">إعادة طرح مسألة التعبير</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">إعادة طرح الشفافية المرجعية</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">جبر EVM</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">المساهمة</li><li class="chapter-item expanded "><a href="about.html">حول الكتاب</a></li></ol>';
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
