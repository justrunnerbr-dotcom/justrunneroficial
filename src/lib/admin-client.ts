import { createClient } from '@supabase/supabase-js'

/** Server-only Supabase client — uses service role key to bypass RLS.
 *  Falls back to anon key if SUPABASE_SERVICE_ROLE_KEY is not set. */
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}
