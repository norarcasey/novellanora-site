import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Anonymous client. RLS on `published_entries` allows public SELECT;
// every other table is owner-only and invisible to this client.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

export interface PublishedEntry {
  entry_id: string
  user_id: string
  title: string | null
  slug: string
  body_html: string
  body_text: string
  location: string | null
  published_at: string
  updated_at: string
}

export async function listPublished(): Promise<PublishedEntry[]> {
  const { data, error } = await supabase
    .from('published_entries')
    .select('*')
    .order('published_at', { ascending: false })
  if (error) {
    console.error('Failed to list published entries:', error)
    return []
  }
  return (data ?? []) as PublishedEntry[]
}

export async function getPublishedBySlug(slug: string): Promise<PublishedEntry | null> {
  const { data, error } = await supabase
    .from('published_entries')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('Failed to load published entry:', error)
    return null
  }
  return (data as PublishedEntry | null) ?? null
}
