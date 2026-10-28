/**
 * Starts the app: loads the font and styles, renders <App />, and turns on offline support.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support (service worker). Only when the app is opened on its own over http(s):
// embedded previews and files opened from disk can't use service workers.
const embedded = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();
if (!embedded && /^https?:$/.test(location.protocol) && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {
    // Offline mode is optional; the app works without it.
  });
}
