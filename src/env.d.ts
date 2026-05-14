/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // Supabase — same project as the journal-app studio.
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // The studio uses this to gate auth; not used by the public site,
  // but present for parity with the shared .env file.
  readonly VITE_ALLOWED_EMAIL?: string

  // Optional — set when wiring up on-demand revalidation from the studio.
  // Without these, /api/revalidate returns 500. Site still renders.
  readonly REVALIDATE_SECRET?: string
  readonly REVALIDATE_BYPASS_TOKEN?: string
  readonly SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
