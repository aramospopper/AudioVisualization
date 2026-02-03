import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import '../assets/css/style.css';
import '../assets/css/satoshi.css';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { SpeedInsights } from "@vercel/speed-insights/next"
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>,
);
