import { supabase } from '../../lib/supabase'

export interface EmailBrandingSettings {
  organization_name: string
  logo_url: string | null
  branding_primary_color: string | null
  branding_secondary_color: string | null
  branding_email_footer_text: string | null
  branding_email_from_name: string | null
}

export interface EmailBrandingUpdateDTO {
  organization_name?: string
  logo_url?: string | null
  branding_primary_color?: string | null
  branding_secondary_color?: string | null
  branding_email_footer_text?: string | null
  branding_email_from_name?: string | null
}

const DEFAULT_PRIMARY_COLOR = '#2563eb'
const DEFAULT_SECONDARY_COLOR = '#1e293b'

/**
 * Get email branding settings for an organization
 */
export async function getEmailBrandingSettings(
  orgId: string
): Promise<{ data: EmailBrandingSettings | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from('organizations')
      .select('name, logo_url, branding_primary_color, branding_secondary_color, branding_email_footer_text, branding_email_from_name')
      .eq('id', orgId)
      .single()

    if (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }

    if (!data) {
      return { data: null, error: new Error('Organization not found') }
    }

    const settings: EmailBrandingSettings = {
      organization_name: data.name || 'Organization',
      logo_url: data.logo_url || null,
      branding_primary_color: data.branding_primary_color || DEFAULT_PRIMARY_COLOR,
      branding_secondary_color: data.branding_secondary_color || DEFAULT_SECONDARY_COLOR,
      branding_email_footer_text: data.branding_email_footer_text || null,
      branding_email_from_name: data.branding_email_from_name || null,
    }

    return { data: settings, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Update email branding settings for an organization
 */
export async function updateEmailBrandingSettings(
  orgId: string,
  updates: EmailBrandingUpdateDTO
): Promise<{ data: EmailBrandingSettings | null; error: Error | null }> {
  try {
    // Build update object, only including fields that are provided
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.organization_name !== undefined) {
      updateData.name = updates.organization_name
    }
    if (updates.logo_url !== undefined) {
      updateData.logo_url = updates.logo_url
    }
    if (updates.branding_primary_color !== undefined) {
      updateData.branding_primary_color = updates.branding_primary_color
    }
    if (updates.branding_secondary_color !== undefined) {
      updateData.branding_secondary_color = updates.branding_secondary_color
    }
    if (updates.branding_email_footer_text !== undefined) {
      updateData.branding_email_footer_text = updates.branding_email_footer_text
    }
    if (updates.branding_email_from_name !== undefined) {
      updateData.branding_email_from_name = updates.branding_email_from_name
    }

    const { data, error } = await (supabase as any)
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select('name, logo_url, branding_primary_color, branding_secondary_color, branding_email_footer_text, branding_email_from_name')
      .single()

    if (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }

    if (!data) {
      return { data: null, error: new Error('Organization not found after update') }
    }

    const settings: EmailBrandingSettings = {
      organization_name: data.name || 'Organization',
      logo_url: data.logo_url || null,
      branding_primary_color: data.branding_primary_color || DEFAULT_PRIMARY_COLOR,
      branding_secondary_color: data.branding_secondary_color || DEFAULT_SECONDARY_COLOR,
      branding_email_footer_text: data.branding_email_footer_text || null,
      branding_email_from_name: data.branding_email_from_name || null,
    }

    return { data: settings, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
