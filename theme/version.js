// Book version shown just under the sidebar title ("ALUX programming").
// Update this string on each release; that is the only line to change.
//
// mdBook populates the sidebar table of contents asynchronously via a
// <mdbook-sidebar-scrollbox> custom element (toc.js), so we wait for the
// title item (".affix") to appear before inserting the version beneath it.
(function () {
  const VERSION = "v1.0.0";

  function place () {
    const box = document.querySelector("#sidebar .sidebar-scrollbox");
    if (!box) return false;
    if (box.querySelector(".sidebar-version")) return true;
    const affix = box.querySelector(".affix");
    if (!affix || !affix.parentNode) return false; // TOC not populated yet
    const el = document.createElement("li");
    el.className = "sidebar-version";
    el.textContent = VERSION;
    affix.parentNode.insertBefore(el, affix.nextSibling);
    return true;
  }

  function start () {
    if (place()) return;
    const target = document.querySelector("#sidebar") || document.body;
    const observer = new MutationObserver(function () {
      if (place()) observer.disconnect();
    });
    observer.observe(target, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
