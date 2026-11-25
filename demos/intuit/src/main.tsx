import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isAutoplay } from './demo/script';
import { startAutoplay } from './demo/autoplay';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (isAutoplay()) {
  // Inside the portfolio the page behind the phone is the portfolio's own.
  document.documentElement.classList.add('embed');
  startAutoplay();
}
