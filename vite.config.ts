import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.ENABLE_SUNO': JSON.stringify(env.VITE_ENABLE_SUNO === 'true'),
      'process.env.USE_DEMO_LOGIN': JSON.stringify(env.VITE_USE_DEMO_LOGIN !== 'false'), // Default to true if not set
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || '')
    },
    resolve: {
      alias: {
        // Alias removed to force relative paths
      }
    }
  };
});