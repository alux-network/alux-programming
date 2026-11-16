// Entry of the magic world, a React app served under /magic/ (magic/index.html). The real world is
// mdBook's own site; this app reads the same book as JSON (magic-book.ts) and presents it in the
// approved reader: mdBook's stylesheets (linked from the book's build by vite.config.ts), then
// reader.css.
//
// Routes, all plain browser history through React Router:
//   /magic/                 picks an edition (saved choice, country, browser language)
//   /magic/<lang>/          the entrance: welcome and the choice between worlds
//   /magic/<lang>/<path>    a chapter, at the same path mdBook gives its real page
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { applyTheme, storedTheme } from './chrome.ts';
import { ChooseEdition, Entrance } from './Gateway.tsx';
import { Reader } from './Reader.tsx';
// The KaTeX version mdbook-katex renders the book's math with (package.json pins it exactly).
import 'katex/dist/katex.min.css';
import './reader.css';

// The magic world reads by day or by night only, before the first paint.
applyTheme(storedTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/magic">
      <Routes>
        <Route path="/" element={<ChooseEdition />} />
        <Route path="/:lang" element={<Entrance />} />
        <Route path="/:lang/*" element={<Reader />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
