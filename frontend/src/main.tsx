import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useLab } from './state/labStore';

if (import.meta.env.DEV) (window as unknown as { __lab: typeof useLab }).__lab = useLab;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
