import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import '../assets/css/style.css';
import '../assets/css/satoshi.css';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Temporary visible mount badge to help debug a white screen (removed after debugging)
if (!document.getElementById('av-debug-badge')) {
  document.body.insertAdjacentHTML(
    'afterbegin',
    '<div id="av-debug-badge" style="position:fixed;left:12px;top:12px;z-index:99999;background:#3C50E0;color:#fff;padding:6px 8px;border-radius:6px;font-size:13px;font-family:Inter,ui-sans-serif">AudioVisor — mounting...</div>'
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>,
);

// remove mount badge after a short delay so it doesn't persist in normal use
setTimeout(() => document.getElementById('av-debug-badge')?.remove(), 3000);
