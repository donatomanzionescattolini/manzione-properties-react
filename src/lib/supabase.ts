import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Returns true when both Supabase environment variables are configured.
 * The app falls back to local Zustand state when this is false (demo mode).
 */
export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'your-project-url' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key';

/**
 * Supabase client – only used when `isSupabaseConfigured` is true.
 * Accessing this client without valid env vars will throw at runtime,
 * which is intentional: the app must be configured before using Supabase.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
