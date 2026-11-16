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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">ALUX-Programmierung</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">The Semantic View</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">Warum Bedeutung an erster Stelle steht</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">Denotationen und Kompositionalität</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">Denotational Design</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">Gesetze und Interpretationen</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">Abhängige Typen und Beweise</a></li><li class="chapter-item expanded affix "><li class="part-title">Design by Meaning in Rust</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">Capability-Algebren</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Semantische Typen in Rust</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">Abgeleitete Bedeutung und Komposition</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">Interpreter und Effekte</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">Gesetze, Szenarien und Nachweise</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">Programme erster Ordnung</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">Sprach- und Compiler-Pipelines</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">Ein bedeutungsorientierter Arbeitsablauf</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Concepts</li><li class="chapter-item expanded "><a href="concepts/index.html">Einführung</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">Operationale Semantik</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">Expression Problem</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">Referenzielle Transparenz</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">Freie Monade</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">Continuation-Passing Style</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">Defunktionalisierung</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">Verzweigung und Konfluenz</a></li><li class="chapter-item expanded affix "><li class="part-title">Insights</li><li class="chapter-item expanded "><a href="insights/index.html">Einführung</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">Von der Semantik zu Maschinen</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">Expression Problem neu betrachtet</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">Referenzielle Transparenz neu betrachtet</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">EVM-Algebra</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Mitwirken</li><li class="chapter-item expanded "><a href="about.html">Über das Buch</a></li></ol>';
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
