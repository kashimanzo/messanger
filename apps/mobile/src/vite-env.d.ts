/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_CLICKSEND_FROM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
