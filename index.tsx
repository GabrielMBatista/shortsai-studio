import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">Loading Studio...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);