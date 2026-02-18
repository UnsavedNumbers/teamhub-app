/**
 * Help Center Configuration Service
 * 
 * Manages WordPress connection configuration in the database.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { WordPressConfig } from './wordpressApiService'

const supabaseUntyped = supabase as any

// ============================================================================
// Types
// ============================================================================

export interface HelpCenterConfig {
  id: string
  apiUrl: string
  authMethod: 'application_password' | 'oauth_token' | 'public'
  connectionStatus: 'connected' | 'disconnected' | 'error'
  lastSyncAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Get WordPress configuration
 */
export async function getWordPressConfig(): Promise<ServiceResponse<HelpCenterConfig>> {
  try {
    const { data, error } = await supabaseUntyped
      .from('help_wordpress_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      debug.error('HelpCenterConfigService', 'Failed to get config', { error })
      return { data: null, error }
    }

    if (!data) {
      return { data: null, error: null }
    }

    const config: HelpCenterConfig = {
      id: data.id,
      apiUrl: data.api_url,
      authMethod: data.auth_method as 'application_password' | 'oauth_token' | 'public',
      connectionStatus: data.connection_status as 'connected' | 'disconnected' | 'error',
      lastSyncAt: data.last_sync_at,
      lastError: data.last_error,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return { data: config, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterConfigService', 'Exception getting config', { error })
    return { data: null, error }
  }
}

/**
 * Save WordPress configuration
 */
export async function saveWordPressConfig(
  config: {
    apiUrl: string
    authMethod: 'application_password' | 'oauth_token' | 'public'
    credentials?: string // Will be encrypted
  }
): Promise<ServiceResponse<HelpCenterConfig>> {
  try {
    // Validate API URL
    if (!config.apiUrl || !config.apiUrl.trim()) {
      return {
        data: null,
        error: new Error('WordPress API URL is required'),
      }
    }

    // Ensure URL ends with /wp-json/wp/v2
    let apiUrl = config.apiUrl.trim()
    if (!apiUrl.endsWith('/wp-json/wp/v2')) {
      if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl + 'wp-json/wp/v2'
      } else {
        apiUrl = apiUrl + '/wp-json/wp/v2'
      }
    }

    // Validate URL format
    try {
      new URL(apiUrl)
    } catch {
      return {
        data: null,
        error: new Error('Invalid WordPress API URL format'),
      }
    }

    // Get current user for audit
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id

    // Check if config exists
    const existing = await getWordPressConfig()

    const configData: any = {
      api_url: apiUrl,
      auth_method: config.authMethod,
      credentials_encrypted: config.credentials || null,
      connection_status: 'disconnected',
      updated_by: userId,
    }

    let result
    if (existing.data) {
      // Update existing
      const { data, error } = await supabaseUntyped
        .from('help_wordpress_config')
        .update(configData)
        .eq('id', existing.data.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new
      const { data, error } = await supabaseUntyped
        .from('help_wordpress_config')
        .insert(configData)
        .select()
        .single()

      if (error) throw error
      result = data
    }

    const savedConfig: HelpCenterConfig = {
      id: result.id,
      apiUrl: result.api_url,
      authMethod: result.auth_method as 'application_password' | 'oauth_token' | 'public',
      connectionStatus: result.connection_status as 'connected' | 'disconnected' | 'error',
      lastSyncAt: result.last_sync_at,
      lastError: result.last_error,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }

    debug.data('HelpCenterConfigService', 'Config saved', { id: savedConfig.id })
    return { data: savedConfig, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterConfigService', 'Failed to save config', { error })
    return { data: null, error }
  }
}

/**
 * Update connection status
 */
export async function updateConnectionStatus(
  status: 'connected' | 'disconnected' | 'error',
  error?: string
): Promise<ServiceResponse<void>> {
  try {
    const updateData: any = {
      connection_status: status,
    }

    if (error !== undefined) {
      updateData.last_error = error
    }

    const { error: updateError } = await supabaseUntyped
      .from('help_wordpress_config')
      .update(updateData)

    if (updateError) {
      debug.error('HelpCenterConfigService', 'Failed to update connection status', { error: updateError })
      return { data: null, error: updateError }
    }

    return { data: null, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error('HelpCenterConfigService', 'Exception updating connection status', { error })
    return { data: null, error }
  }
}

/**
 * Get WordPress config for API use (with decrypted credentials)
 * Note: In production, credentials should be properly encrypted/decrypted
 */
export async function getWordPressConfigForApi(): Promise<ServiceResponse<WordPressConfig>> {
  try {
    const configResult = await getWordPressConfig()
    if (configResult.error || !configResult.data) {
      return {
        data: null,
        error: configResult.error || new Error('WordPress configuration not found'),
      }
    }

    const config = configResult.data

    // Get credentials (in production, decrypt here)
    const { data: configWithCreds } = await supabaseUntyped
      .from('help_wordpress_config')
      .select('credentials_encrypted')
      .eq('id', config.id)
      .single()

    const wpConfig: WordPressConfig = {
      apiUrl: config.apiUrl,
      authMethod: config.authMethod,
      credentials: configWithCreds?.credentials_encrypted || undefined,
    }

    return { data: wpConfig, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    return { data: null, error }
  }
}
