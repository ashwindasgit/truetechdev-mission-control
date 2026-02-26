// client.ts — Browser-side Supabase client
// Used in Client Components (anything with 'use client' or event handlers).
// Creates a single Supabase instance for the browser using the anon key.

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
