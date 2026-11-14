// Adds the reader's stylesheet after mdBook's, so the cascade order matches additional-css.
// Loaded by theme/header.hbs, a classic script at the top of the page, on every mdBook page;
// it adds nothing unless world.ts marked <html data-reader> (the magic world or the entrance).
// The link goes in <head>: the magic world's shell replaces the body's children, and the veil
// world.ts writes stays until this stylesheet applies.
if (document.documentElement.hasAttribute('data-reader')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/reader.css';
  document.head.append(link);
}
