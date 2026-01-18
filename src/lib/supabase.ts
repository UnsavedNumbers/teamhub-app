import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseExtended } from './supabase.extended.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export whether Supabase is configured for conditional rendering
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Create client with placeholder or real values
// The placeholder allows the UI to render for development/preview
export const supabase: SupabaseClient<SupabaseExtended> = createClient<SupabaseExtended>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
)

if (!isSupabaseConfigured) {
    console.warn(
        '⚠️ Supabase not configured. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
}

