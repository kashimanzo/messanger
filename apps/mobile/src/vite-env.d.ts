/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_FEATURE_SMS_ENABLED?: string;
  readonly VITE_CLICKSEND_FROM?: string;
  readonly FEATURE_SMS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
