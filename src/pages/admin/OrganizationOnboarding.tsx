import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization, Organization } from '../../contexts/OrganizationContext'
import OrganizationIdentityStep from '../../components/admin/onboarding/OrganizationIdentityStep'
import LicenseActivationStep from '../../components/admin/onboarding/LicenseActivationStep'
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
  const { profile, loading: authLoading, user } = useAuth()
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
            hasRedirected.current = true; clearSetupOrganizationFlag()
            try { if (profile?.requiresOrgSetup) await supabase.from('users').update({ requires_org_setup: false }).eq('id', profile.id) } catch (err) { console.error('Error clearing DB flag:', err) }
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

        const { data: newOrg, error: createError } = await supabase.from('organizations').insert({ name: data.name, slug: data.slug, org_type: data.org_type || undefined, contact_email: data.contact_email } as Database['public']['Tables']['organizations']['Insert']).select().single() as { data: { id: string; name: string; slug: string | null } | null; error: { message?: string } | null }
        if (createError || !newOrg) throw createError || new Error('Failed to create organization')
        orgId = newOrg.id
        const { error: memberError } = await supabase.from('organization_members').insert({ organization_id: orgId, user_id: profile.id, role: 'org_admin' } as Database['public']['Tables']['organization_members']['Insert'])
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
        const { error: updateError } = await supabase.from('organizations').update({ name: data.name, slug: data.slug, org_type: data.org_type || undefined, contact_email: data.contact_email } as Database['public']['Tables']['organizations']['Update']).eq('id', orgId)
        if (updateError) throw updateError
      }
      clearSetupOrganizationFlag()
      try { await supabase.from('users').update({ requires_org_setup: false }).eq('id', profile.id) } catch (err) { console.error('Error clearing DB flag:', err) }
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
