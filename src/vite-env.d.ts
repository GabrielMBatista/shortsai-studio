// Reference to vite/client removed to avoid type error
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_SUNO: string;
  readonly GEMINI_API_KEY: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
