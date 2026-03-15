import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * supabaseClient — cliente público (anon key).
 * Usa RLS. Adequado para chamadas no lado do browser.
 */
export function createSupabaseClient() {
    return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * supabaseServiceClient — cliente com service_role (bypassa RLS).
 * SOMENTE no server (API Routes, Server Actions, callbacks do NextAuth).
 * NUNCA expor ao browser.
 */
export function createSupabaseServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
