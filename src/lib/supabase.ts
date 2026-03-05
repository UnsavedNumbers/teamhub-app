import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { SupabaseExtended } from './supabase.extended.types'
import { STORAGE_KEYS } from '../constants/storage'
import { ENV_VAR_NAMES } from '../constants/api'

// Conditionally import debug fetch wrapper for API logging
const debugFetch = import.meta.env.DEV
  ? (await import('./debug/integrations/createDebugFetch')).createDebugFetch()
  : undefined

// Get environment variables directly from import.meta.env (Vite's standard way)
const supabaseUrl = import.meta.env[ENV_VAR_NAMES.SUPABASE_URL]
const supabaseAnonKey = import.meta.env[ENV_VAR_NAMES.SUPABASE_ANON_KEY]
const useFakeData = String(import.meta.env.VITE_USE_FAKE_DATA).toLowerCase() === 'true'
const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey)

// Export whether Supabase is configured for conditional rendering
export const isSupabaseConfigured = hasSupabaseCredentials

// Create client - fail fast if environment variables are missing
export const supabase: SupabaseClient<SupabaseExtended> = createClient<SupabaseExtended>(
  supabaseUrl ||
    (useFakeData
      ? 'https://demo.supabase.local'
      : (() => {
          throw new Error(`${ENV_VAR_NAMES.SUPABASE_URL} is required`)
        })()),
  supabaseAnonKey ||
    (useFakeData
      ? 'demo-anon-key'
      : (() => {
          throw new Error(`${ENV_VAR_NAMES.SUPABASE_ANON_KEY} is required`)
        })()),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Prevent Cloudflare cookie warnings in development
      flowType: 'pkce',
      storageKey: STORAGE_KEYS.AUTH_SESSION,
    },
    global: {
      headers: {
        'X-Client-Info': 'youthsports-web',
      },
      fetch: debugFetch,
    },
  }
)

if (!isSupabaseConfigured && !useFakeData) {
  console.warn(
    `[supabase] Missing ${ENV_VAR_NAMES.SUPABASE_URL} or ${ENV_VAR_NAMES.SUPABASE_ANON_KEY}. ` +
      `Set them in .env.<mode> (for example .env.demo) or your deployment environment variables.`
  )
} else if (!isSupabaseConfigured && useFakeData) {
  console.info('[supabase] Running in fake-data mode without Supabase credentials.')
} else {
  console.log('[supabase] Client initialized with URL:', supabaseUrl?.substring(0, 20) + '...')
}
