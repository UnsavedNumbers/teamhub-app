/**
 * Branding Service for Email Templates
 * 
 * Fetches organization branding information for use in email templates
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface OrganizationBranding {
  logo_url: string | null
  primary_color: string
  secondary_color: string
  email_footer_text: string | null
  email_from_name: string
  organization_name: string
}

const DEFAULT_BRANDING: Omit<OrganizationBranding, 'organization_name' | 'logo_url'> = {
  primary_color: '#2563eb',
  secondary_color: '#1e293b',
  email_footer_text: null,
  email_from_name: 'YouthSports Team Hub',
}

/**
 * Get organization branding for email templates
 */
export async function getOrganizationBranding(
  orgId: string,
  supabase: any
): Promise<OrganizationBranding> {
  try {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url, branding_primary_color, branding_secondary_color, branding_email_footer_text, branding_email_from_name')
      .eq('id', orgId)
      .single()

    if (error) {
      console.error('Failed to fetch organization branding:', error)
      return {
        ...DEFAULT_BRANDING,
        organization_name: 'Organization',
        logo_url: null,
      }
    }

    return {
      logo_url: org.logo_url || null,
      primary_color: org.branding_primary_color || DEFAULT_BRANDING.primary_color,
      secondary_color: org.branding_secondary_color || DEFAULT_BRANDING.secondary_color,
      email_footer_text: org.branding_email_footer_text || DEFAULT_BRANDING.email_footer_text,
      email_from_name: org.branding_email_from_name || org.name || DEFAULT_BRANDING.email_from_name,
      organization_name: org.name || 'Organization',
    }
  } catch (err) {
    console.error('Exception fetching organization branding:', err)
    return {
      ...DEFAULT_BRANDING,
      organization_name: 'Organization',
      logo_url: null,
    }
  }
}

/**
 * Inject branding variables into email template
 */
export function injectBrandingVariables(
  template: string,
  branding: OrganizationBranding
): string {
  let result = template

  // Replace branding variables
  const brandingVars: Record<string, string> = {
    organization_logo_url: branding.logo_url || '',
    organization_name: branding.organization_name,
    organization_primary_color: branding.primary_color,
    organization_secondary_color: branding.secondary_color,
    email_footer_text: branding.email_footer_text || `© ${new Date().getFullYear()} ${branding.organization_name}. All rights reserved.`,
    email_from_name: branding.email_from_name,
  }

  for (const [key, value] of Object.entries(brandingVars)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value)
  }

  return result
}
