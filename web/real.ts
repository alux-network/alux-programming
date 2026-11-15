// The real world's only addition to mdBook's page: the header title links to the entrance, where the
// reader chooses between worlds (/magic/<lang>/). Loaded by theme/head.hbs as a deferred classic
// script, so the header exists when it runs; it imports nothing and is bundled as plain code.
(() => {
  const title = document.querySelector('.menu-title');
  if (!title) return;
  const link = document.createElement('a');
  link.href = `/magic/${document.documentElement.lang}/`;
  link.textContent = title.textContent;
  title.replaceChildren(link);
})();
