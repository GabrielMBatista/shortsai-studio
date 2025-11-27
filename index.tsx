import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import App from './src/App';
import Loader from './src/components/Loader';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Loader fullScreen text="Initializing Studio..." />}>
        <App />
      </Suspense>
    </QueryClientProvider>
  </React.StrictMode>
);