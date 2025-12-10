// 🚨把这段放在 import 之后，ReactDOM.createRoot 之前
window.onerror = function (message, source, lineno, colno, error) {
  alert(`报错啦：${message}\n行号：${lineno}`);
};

// 专门捕获 Promise 报错（比如 Supabase 连接失败）
window.onunhandledrejection = function (event) {
  alert(`异步报错：${event.reason}`);
};
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'
import './modules/ConstructionLog/install';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/*// Register Service Worker for Offline Capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}*/