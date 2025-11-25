import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Loader from './components/Loader';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Suspense fallback={<Loader fullScreen text="Initializing Studio..." />}>
      <App />
    </Suspense>
  </React.StrictMode>
);