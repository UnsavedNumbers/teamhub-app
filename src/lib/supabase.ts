import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseExtended } from './supabase.extended.types'

// Get environment variables directly from import.meta.env (Vite's standard way)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export whether Supabase is configured for conditional rendering
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Create client with placeholder or real values
// The placeholder allows the UI to render for development/preview
export const supabase: SupabaseClient<SupabaseExtended> = createClient<SupabaseExtended>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Prevent Cloudflare cookie warnings in development
            flowType: 'pkce',
            storageKey: 'youthsports-auth'
        },
        global: {
            headers: {
                'X-Client-Info': 'youthsports-web'
            }
        }
    }
)

if (!isSupabaseConfigured) {
    console.warn(
        '⚠️ Supabase not configured. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
} else {
    console.log('[supabase] Client initialized with URL:', supabaseUrl?.substring(0, 20) + '...')
}

