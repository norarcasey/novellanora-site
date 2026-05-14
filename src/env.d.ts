/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_ANON_KEY: string
  readonly REVALIDATE_SECRET: string
  readonly REVALIDATE_BYPASS_TOKEN: string
  readonly SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
