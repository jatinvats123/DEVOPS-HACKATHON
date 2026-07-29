import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

/**
 * Apply the webfont stylesheet.
 *
 * index.html declares it with media="print" so it downloads without blocking
 * the first paint; switching to media="all" is what actually applies it. Doing
 * that here rather than with an inline `onload` attribute keeps helmet's
 * Content-Security-Policy (`script-src-attr 'none'`) intact — bundled module
 * code is allowed, inline handlers are not.
 */
const applyFonts = () => {
  document
    .querySelectorAll('link[data-font-stylesheet][media="print"]')
    .forEach((link) => {
      link.media = 'all';
    });
};

// The stylesheet may already be cached and complete by the time this module
// evaluates, in which case there is no load event left to wait for.
if (document.readyState === 'complete') applyFonts();
else window.addEventListener('load', applyFonts, { once: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
