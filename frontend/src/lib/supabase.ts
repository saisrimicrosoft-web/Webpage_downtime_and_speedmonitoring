import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Placeholder values from .env.local that indicate the env vars haven't been set yet
const PLACEHOLDER_URL = 'https://your-supabase-project-id.supabase.co';
const PLACEHOLDER_KEY = 'your-supabase-anon-key';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 &&
  SUPABASE_URL !== PLACEHOLDER_URL &&
  SUPABASE_ANON_KEY.length > 0 &&
  SUPABASE_ANON_KEY !== PLACEHOLDER_KEY;

// Always create the client (createClient is safe even with placeholder values;
// queries will simply fail with a network/auth error which components handle).
export const supabase = createClient(
  SUPABASE_URL || PLACEHOLDER_URL,
  SUPABASE_ANON_KEY || PLACEHOLDER_KEY
);
