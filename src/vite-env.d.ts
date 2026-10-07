/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional, for local dev only. On the deployed site each user enters their own key in Settings. */
  readonly VITE_FINNHUB_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
