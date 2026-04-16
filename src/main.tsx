import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Kakao SDK
const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY;
if ((window as any).Kakao) {
  const Kakao = (window as any).Kakao;
  if (!Kakao.isInitialized()) {
    if (KAKAO_KEY) {
      Kakao.init(KAKAO_KEY);
      console.log('[Kakao] SDK Initialized successfully');
    } else {
      console.warn('[Kakao] SDK found but VITE_KAKAO_JS_KEY is missing');
    }
  }
} else {
  console.error('[Kakao] SDK script not found in index.html');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
