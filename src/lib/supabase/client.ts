import { createBrowserClient } from '@supabase/ssr'

/**
 * The public URL for the Supabase project, provided via environment variables.
 * Used to construct the API endpoint for Supabase client requests.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * The public anonymous key for the Supabase project, provided via environment variables.
 * This key is safe to use in a browser environment as Data API interactions are secured by RLS (Row Level Security).
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Export a globally accessible singleton instance of the Supabase client.
 * This client uses `@supabase/ssr` to automatically sync the user session into browser cookies
 * so that Middleware and Server Components can verify authentication safely.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
