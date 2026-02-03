import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseExtended } from './supabase.extended.types'
import { STORAGE_KEYS } from '../constants/storage'
import { ENV_VAR_NAMES } from '../constants/api'

// Get environment variables directly from import.meta.env (Vite's standard way)
const supabaseUrl = import.meta.env[ENV_VAR_NAMES.SUPABASE_URL]
const supabaseAnonKey = import.meta.env[ENV_VAR_NAMES.SUPABASE_ANON_KEY]

// Export whether Supabase is configured for conditional rendering
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Create client - fail fast if environment variables are missing
export const supabase: SupabaseClient<SupabaseExtended> = createClient<SupabaseExtended>(
    supabaseUrl || (() => {
        throw new Error(`${ENV_VAR_NAMES.SUPABASE_URL} is required`)
    })(),
    supabaseAnonKey || (() => {
        throw new Error(`${ENV_VAR_NAMES.SUPABASE_ANON_KEY} is required`)
    })(),
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Prevent Cloudflare cookie warnings in development
            flowType: 'pkce',
            storageKey: STORAGE_KEYS.AUTH_SESSION
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
        `⚠️ Supabase not configured. Create a .env file with ${ENV_VAR_NAMES.SUPABASE_URL} and ${ENV_VAR_NAMES.SUPABASE_ANON_KEY}`
    )
} else {
    console.log('[supabase] Client initialized with URL:', supabaseUrl?.substring(0, 20) + '...')
}
