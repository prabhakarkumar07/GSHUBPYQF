export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const PHONE_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === "true";
// Google login button stays hidden until the Google provider is set up in Supabase.
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
