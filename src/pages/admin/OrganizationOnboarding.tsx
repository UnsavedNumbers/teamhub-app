import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization, Organization } from '../../contexts/OrganizationContext'
import OrganizationIdentityStep from '../../components/admin/onboarding/OrganizationIdentityStep'
import LicenseActivationStep from '../../components/admin/onboarding/LicenseActivationStep'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
  cleanupStaleFlags,
} from '../../utils/setupOrganization'
import { getErrorMessage } from '../../utils/errorUtils'

interface OrganizationFormData {
  name: string
  org_type: 'school' | 'club' | 'league' | 'academy' | 'aau' | ''
  slug: string
  contact_email: string
  office_location?: string
}

export default function OrganizationOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const hasRedirected = useRef(false)
  const hasLoadedOrgData = useRef<string | null>(null)
  
  const navigate = useNavigate()
  const { profile, loading: authLoading, user, refreshProfile } = useAuth()
  const { currentOrganization, setCurrentOrganization, setOrganizations } = useOrganization()

  const { control, handleSubmit, watch, formState: { errors }, setValue } = useForm<OrganizationFormData>({
    defaultValues: { name: '', org_type: '', slug: '', contact_email: '', office_location: '' },
  })

  const watchedSlug = watch('slug')

  useEffect(() => { cleanupStaleFlags() }, [])

  const loadOrganizationData = useCallback(async () => {
    if (!currentOrganization?.id) { setLoading(false); return }
    try {
      const { data, error: fetchError } = await supabase.from('organizations').select('name, slug, org_type, contact_email').eq('id', currentOrganization.id).single() as { data: { name?: string; slug?: string; org_type?: string; contact_email?: string } | null; error: { message?: string } | null }
      if (fetchError) throw fetchError
      if (data) {
        if (data.slug && data.org_type) {
          if (!hasRedirected.current) {
            hasRedirected.current = true
            clearSetupOrganizationFlag()
            try {
              if (profile?.requiresOrgSetup) {
                type UsersUpdate = Database['public']['Tables']['users']['Update']
                await supabase.from('users').update({ requires_org_setup: false } satisfies UsersUpdate).eq('id', profile.id)
                // Refresh profile to update requiresOrgSetup flag
                await refreshProfile()
              }
            } catch (err) {
              console.error('Error clearing DB flag:', err)
            }
            navigate('/admin', { replace: true })
          }
          return
        }
        setValue('name', data.name || ''); setValue('slug', data.slug || ''); setValue('org_type', (data.org_type as any) || ''); setValue('contact_email', data.contact_email || '')
      }
    } finally { setLoading(false) }
  }, [currentOrganization?.id, setValue, navigate, profile?.requiresOrgSetup, profile?.id])

  useEffect(() => {
    if (hasRedirected.current || authLoading) return
    if (!user) {
      if (getSetupOrganizationFlag()) {
        hasRedirected.current = true
        navigate('/portal/signup', { state: { setupOrganization: true, returnTo: '/admin/onboarding' }, replace: true })
      } else {
        hasRedirected.current = true; navigate('/portal/login', { replace: true })
      }
      return
    }
    if (!profile) return
    if (profile.email) setValue('contact_email', profile.email)
    
    if (currentOrganization) {
      if (hasLoadedOrgData.current !== currentOrganization.id) {
        hasLoadedOrgData.current = currentOrganization.id; loadOrganizationData()
      }
    } else {
      hasLoadedOrgData.current = null; setLoading(false)
    }
    clearSetupOrganizationFlag()
  }, [authLoading, user, profile, currentOrganization, navigate, loadOrganizationData, setValue])

  const onStep1Submit = async (data: OrganizationFormData) => {
    if (creating || !profile) return
    setError(null); setCreating(true)
    try {
      let orgId = currentOrganization?.id
      if (!orgId) {
        const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', data.slug).maybeSingle()
        if (existingOrg) { setError('This URL slug is already taken. Please choose a different one.'); setCreating(false); return }

        type OrgInsert = Database['public']['Tables']['organizations']['Insert']
        const orgInsertData = { name: data.name, slug: data.slug, org_type: data.org_type || undefined, contact_email: data.contact_email } satisfies OrgInsert
        const { data: newOrg, error: createError } = await supabase.from('organizations').insert(orgInsertData).select().single() as { data: { id: string; name: string; slug: string | null } | null; error: { message?: string } | null }
        if (createError || !newOrg) throw createError || new Error('Failed to create organization')
        orgId = newOrg.id
        type MemberInsert = Database['public']['Tables']['organization_members']['Insert']
        const memberInsertData = { organization_id: orgId, user_id: profile.id, role: 'org_admin' } satisfies MemberInsert
        const { error: memberError } = await supabase.from('organization_members').insert(memberInsertData)
        if (memberError) { await supabase.from('organizations').delete().eq('id', orgId); throw memberError }

        const nextOrg: Organization = { 
          id: newOrg.id, 
          name: newOrg.name, 
          slug: newOrg.slug ?? undefined, 
          roles: ['org_admin'],
          get role() { return this.roles[0] ?? 'parent' }
        }
        setCurrentOrganization(nextOrg); setOrganizations([nextOrg])
      } else {
        type OrgUpdate = Database['public']['Tables']['organizations']['Update']
        const orgUpdateData = { name: data.name, slug: data.slug, org_type: data.org_type || undefined, contact_email: data.contact_email } satisfies OrgUpdate
        const { error: updateError } = await supabase.from('organizations').update(orgUpdateData).eq('id', orgId)
        if (updateError) throw updateError
      }
      clearSetupOrganizationFlag()
      try {
        type UsersUpdate = Database['public']['Tables']['users']['Update']
        await supabase.from('users').update({ requires_org_setup: false } satisfies UsersUpdate).eq('id', profile.id)
        // Refresh profile to update requiresOrgSetup flag and organizations
        await refreshProfile()
      } catch (err) {
        console.error('Error clearing DB flag:', err)
      }
      setCurrentStep(2)
    } catch (err: unknown) { setError(getErrorMessage(err) || 'Failed to save organization') } finally { setCreating(false) }
  }

  if (loading || authLoading) return <div className="pa-root pa-flex pa-justify-center pa-items-center" style={{ minHeight: '100vh' }}><div className="pa-skeleton" style={{ width: '400px', height: '300px' }} /></div>

  return (
    <div className="pa-root" style={{ background: 'var(--pa-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentStep === 1 ? (
        <OrganizationIdentityStep
          control={control}
          errors={errors}
          watchedSlug={watchedSlug}
          onSubmit={handleSubmit(onStep1Submit)}
          loading={creating}
          error={error}
          onCancel={() => navigate('/admin')}
        />
      ) : (
        <LicenseActivationStep
          organizationId={currentOrganization?.id}
          onComplete={() => navigate('/admin')}
          onBack={() => setCurrentStep(1)}
        />
      )}
    </div>
  )
}
