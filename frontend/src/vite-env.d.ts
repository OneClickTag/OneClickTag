/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: string
  readonly VITE_ENABLE_DEBUG_TOOLS: string
  readonly VITE_ENABLE_MOCK_API: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_GTM_CONTAINER_ID: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_POSTHOG_KEY: string
  readonly VITE_MIXPANEL_TOKEN: string
  readonly VITE_INTERCOM_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}