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
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="index.html">Programación ALUX</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">La perspectiva semántica</li><li class="chapter-item expanded "><a href="denotational-design/semantic-view.html">Por qué el significado va primero</a></li><li class="chapter-item expanded "><a href="denotational-design/denotations.html">Denotaciones y composicionalidad</a></li><li class="chapter-item expanded "><a href="denotational-design/design.html">Diseño denotacional</a></li><li class="chapter-item expanded "><a href="denotational-design/laws-and-interpretations.html">Leyes e interpretaciones</a></li><li class="chapter-item expanded "><a href="denotational-design/dependent-types.html">Tipos dependientes y pruebas</a></li><li class="chapter-item expanded affix "><li class="part-title">Diseño basado en el significado en Rust</li><li class="chapter-item expanded "><a href="rust-dd/capability-algebras.html">Álgebras de capacidades</a></li><li class="chapter-item expanded "><a href="rust-dd/semantic-types.html">Tipos semánticos en Rust</a></li><li class="chapter-item expanded "><a href="rust-dd/derived-meaning.html">Significado derivado y composición</a></li><li class="chapter-item expanded "><a href="rust-dd/interpreters.html">Intérpretes y efectos</a></li><li class="chapter-item expanded "><a href="rust-dd/laws.html">Leyes, escenarios y evidencia</a></li><li class="chapter-item expanded "><a href="rust-dd/first-order-programs.html">Programas de primer orden</a></li><li class="chapter-item expanded "><a href="rust-dd/compiler-pipelines.html">Lenguaje y procesos de compilación</a></li><li class="chapter-item expanded "><a href="rust-dd/workflow.html">Un flujo de trabajo guiado por el significado</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Conceptos</li><li class="chapter-item expanded "><a href="concepts/index.html">Introducción</a></li><li class="chapter-item expanded "><a href="concepts/operational_semantics.html">Semántica operacional</a></li><li class="chapter-item expanded "><a href="concepts/expression-problem.html">Problema de expresiones</a></li><li class="chapter-item expanded "><a href="concepts/referential_transparency.html">Transparencia referencial</a></li><li class="chapter-item expanded "><a href="concepts/free_monad.html">Mónada libre</a></li><li class="chapter-item expanded "><a href="concepts/cps.html">Estilo de paso de continuaciones</a></li><li class="chapter-item expanded "><a href="concepts/defunctionalization.html">Defuncionalización</a></li><li class="chapter-item expanded "><a href="concepts/branching.html">Ramificación y confluencia</a></li><li class="chapter-item expanded affix "><li class="part-title">Perspectivas</li><li class="chapter-item expanded "><a href="insights/index.html">Introducción</a></li><li class="chapter-item expanded "><a href="insights/operational_semantics.html">De la semántica a las máquinas</a></li><li class="chapter-item expanded "><a href="insights/expression-problem.html">El problema de expresiones, reexaminado</a></li><li class="chapter-item expanded "><a href="insights/referential-transparency.html">Transparencia referencial, reexaminada</a></li><li class="chapter-item expanded "><a href="insights/evm-alg.html">Álgebra EVM</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded affix "><li class="part-title">Contribuir</li><li class="chapter-item expanded "><a href="about.html">Acerca del libro</a></li></ol>';
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
