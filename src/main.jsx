import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('consejoscout:sw-need-refresh'));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('consejoscout:sw-offline-ready'));
  }
});

window.addEventListener('consejoscout:sw-apply-update', () => {
  void updateSW(true);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
