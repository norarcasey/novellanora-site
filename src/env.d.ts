/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // Supabase — same project as the Noratives studio.
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // The studio uses this to gate auth; not used by the public site,
  // but present for parity with the shared .env file.
  readonly VITE_ALLOWED_EMAIL?: string

  // Canonical origin, for absolute URLs. Falls back to the request's own.
  readonly SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
