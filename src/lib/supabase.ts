import { createClient } from '@supabase/supabase-js';

// Read from env variables, or check localStorage for a client-side developer fallback
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 
    (typeof window !== 'undefined' ? window.localStorage.getItem('supabase_url') : '') || 
    '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    (typeof window !== 'undefined' ? window.localStorage.getItem('supabase_anon_key') : '') || 
    '';
  return { url, key };
};

const config = getSupabaseConfig();

// Provide placeholder URL/Key to prevent createClient from throwing an instant crash on startup
export const supabase = createClient(
  config.url || 'https://placeholder-url.supabase.co', 
  config.key || 'placeholder-anon-key'
);

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return !!(
    url && 
    url !== 'https://placeholder-url.supabase.co' && 
    key && 
    key !== 'placeholder-anon-key'
  );
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('supabase_url', url);
    window.localStorage.setItem('supabase_anon_key', key);
  }
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('supabase_url');
    window.localStorage.removeItem('supabase_anon_key');
  }
};
