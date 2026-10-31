import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* One Supabase client for the whole site. It shares the Creed platform's
   project, so a login here is the same account (and the same owner / rep role)
   everywhere. Sessions persist in this browser until the person logs out. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export const isConfigured = !!supabase;

