import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization, Organization } from '../../contexts/OrganizationContext'
import OrganizationIdentityStep from '../../components/admin/onboarding/OrganizationIdentityStep'
import LicenseActivationStep from '../../components/admin/onboarding/LicenseActivationStep'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
  setSetupOrganizationFlag,
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

// Loading timeout in milliseconds (10 seconds)
const LOADING_TIMEOUT_MS = 10000

export default function OrganizationOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)
  
  // Ref to track if we've already redirected (prevent double redirects)
  const hasRedirected = useRef(false)
  // Ref to track which org ID we've already loaded (prevent duplicate calls)
  const hasLoadedOrgData = useRef<string | null>(null)
  
  const navigate = useNavigate()
  const { profile, loading: authLoading, user } = useAuth()
  const { currentOrganization, setCurrentOrganization, setOrganizations } = useOrganization()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: '',
      org_type: '',
      slug: '',
      contact_email: '',
      office_location: '',
    },
  })

  const watchedSlug = watch('slug')

  // Clean up stale flags on mount
  useEffect(() => {
    cleanupStaleFlags()
  }, [])

  // Main effect for handling authentication and redirection
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:66',message:'Main useEffect triggered',data:{authLoading,hasUser:!!user,hasProfile:!!profile,hasCurrentOrg:!!currentOrganization,currentOrgId:currentOrganization?.id,loading,hasRedirected:hasRedirected.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Prevent race conditions with multiple redirects
    if (hasRedirected.current) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:69',message:'Early return: already redirected',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return
    }

    // Still waiting for auth to initialize
    if (authLoading) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:73',message:'Early return: authLoading true',data:{authLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return
    }

    // User is not authenticated
    if (!user) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:78',message:'User not authenticated, checking setup flag',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const hasSetupFlag = getSetupOrganizationFlag()
      
      if (hasSetupFlag) {
        // User arrived here but isn't logged in, redirect to signup
        // Keep the flag so it persists through signup
        hasRedirected.current = true
        navigate('/portal/signup', {
          state: {
            setupOrganization: true,
            returnTo: '/admin/onboarding',
          },
          replace: true,
        })
      } else {
        // No setup intent, redirect to login
        hasRedirected.current = true
        navigate('/portal/login', { replace: true })
      }
      return
    }

    // User is authenticated but profile hasn't loaded yet
    if (!profile) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:101',message:'Early return: profile not loaded',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return
    }

    // User is authenticated and profile is loaded
    // Pre-fill email from profile if available
    if (profile.email) {
      setValue('contact_email', profile.email)
    }
    
    // Check if they already have a complete organization
    if (currentOrganization) {
      // Only load organization data once per org ID
      const orgId = currentOrganization.id
      if (hasLoadedOrgData.current !== orgId) {
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:129',message:'Current org exists, calling loadOrganizationData',data:{currentOrgId:orgId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        hasLoadedOrgData.current = orgId
        // We need to fetch full org details from DB to check if onboarding is complete
        // The currentOrganization from context may not have slug/org_type populated
        // So we'll load organization data which will also set loading to false
        loadOrganizationData()
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:142',message:'No current org, setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // No organization, proceed with fresh onboarding
      hasLoadedOrgData.current = null
      setLoading(false)
    }

    // Clear the setup flag since we've successfully reached onboarding
    clearSetupOrganizationFlag()
  }, [authLoading, user, profile, currentOrganization?.id, navigate, setValue])

  // Timeout protection for loading state
  useEffect(() => {
    if (!loading) {
      return
    }

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoadingTimedOut(true)
        setLoading(false)
        setError('Loading timed out. Please try refreshing the page.')
      }
    }, LOADING_TIMEOUT_MS)

    return () => clearTimeout(timeoutId)
  }, [loading])

  const loadOrganizationData = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:143',message:'loadOrganizationData called',data:{currentOrgId:currentOrganization?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!currentOrganization?.id) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:144',message:'No org ID, setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setLoading(false)
      return
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:149',message:'Starting Supabase query',data:{orgId:currentOrganization.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('name, slug, org_type, contact_email')
        .eq('id', currentOrganization.id)
        .single()

      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:156',message:'Supabase query completed',data:{hasData:!!data,hasError:!!fetchError,error:fetchError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (fetchError) throw fetchError

      if (data) {
        // Check if organization is already complete
        if (data.slug && data.org_type) {
          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:160',message:'Org complete, redirecting',data:{slug:data.slug,orgType:data.org_type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          // Organization is complete, redirect to settings (or dashboard)
          if (!hasRedirected.current) {
            hasRedirected.current = true
            clearSetupOrganizationFlag()
            navigate('/admin/organization', { replace: true })
          }
          return
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:170',message:'Org incomplete, populating form',data:{hasName:!!data.name,hasSlug:!!data.slug},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Organization needs completion, populate form
        setValue('name', data.name || '')
        setValue('slug', data.slug || '')
        setValue('org_type', (data.org_type as OrganizationFormData['org_type']) || '')
        setValue('contact_email', data.contact_email || '')
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:176',message:'Error in loadOrganizationData',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Error loading organization:', err)
      // Don't block the user from filling out the form
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OrganizationOnboarding.tsx:179',message:'loadOrganizationData finally: setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setLoading(false)
    }
  }, [currentOrganization?.id, setValue, navigate])

  const onStep1Submit = async (data: OrganizationFormData) => {
    // Prevent duplicate submissions
    if (creating) {
      return
    }

    // Double-check authentication
    if (!profile) {
      // Store data and flag, redirect to signup
      setSetupOrganizationFlag()
      navigate('/portal/signup', { 
        state: { 
          returnTo: '/admin/onboarding',
          setupOrganization: true,
          onboardingData: data,
        },
      })
      return
    }

    setError(null)
    setCreating(true)

    try {
      let orgId = currentOrganization?.id

      if (!orgId) {
        // Validate slug is unique before creating
        const { data: existingOrg, error: slugCheckError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', data.slug)
          .maybeSingle()

        if (slugCheckError) {
          throw new Error('Failed to validate slug availability. Please try again.')
        }

        if (existingOrg) {
          setError('This URL slug is already taken. Please choose a different one.')
          setCreating(false)
          return
        }

        // Create new organization
        // Convert empty string to undefined for database (allows null in DB)
        const orgTypeValue = data.org_type === '' ? undefined : data.org_type
        const { data: newOrg, error: createError } = await supabase
          .from('organizations')
          .insert({
            name: data.name,
            slug: data.slug,
            org_type: orgTypeValue,
            contact_email: data.contact_email,
          })
          .select()
          .single()

        if (createError) {
          // Handle specific database errors
          if (createError.code === '23505') {
            throw new Error('This URL slug is already taken. Please choose a different one.')
          }
          throw createError
        }

        if (!newOrg) {
          throw new Error('Failed to create organization. Please try again.')
        }

        orgId = newOrg.id

        // Add user as org_admin
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: orgId,
            user_id: profile.id,
            role: 'org_admin',
          })

        if (memberError) {
          // Clean up: delete the org if we couldn't add the member
          await supabase.from('organizations').delete().eq('id', orgId)
          throw new Error('Failed to set up organization membership. Please try again.')
        }

        // Update organization context
        const { data: orgs, error: fetchOrgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('id', orgId)
          .single()

        if (fetchOrgError) {
          console.error('Error fetching created org:', fetchOrgError)
        }

        if (orgs) {
          const nextOrg: Organization = {
            id: orgs.id,
            name: orgs.name,
            slug: orgs.slug ?? undefined,
            role: 'org_admin',
          }
          setCurrentOrganization(nextOrg)
          setOrganizations([nextOrg])
        }
      } else {
        // Update existing organization
        // Convert empty string to undefined for database
        const updateOrgTypeValue = data.org_type === '' ? undefined : data.org_type
        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            name: data.name,
            slug: data.slug,
            org_type: updateOrgTypeValue,
            contact_email: data.contact_email,
          })
          .eq('id', orgId)

        if (updateError) {
          if (updateError.code === '23505') {
            throw new Error('This URL slug is already taken. Please choose a different one.')
          }
          throw updateError
        }
      }

      // Clear the setup flag since organization is created
      clearSetupOrganizationFlag()

      // Move to next step
      setCurrentStep(2)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to save organization')
    } finally {
      setCreating(false)
    }
  }

  const onStep2Complete = () => {
    // Onboarding complete, clear flag and redirect to dashboard
    clearSetupOrganizationFlag()
    navigate('/admin')
  }

  // Loading state with spinner
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Timeout error state
  if (loadingTimedOut && error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-3xl">
              warning
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Loading Issue
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined">refresh</span>
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {currentStep === 1 && (
        <OrganizationIdentityStep
          control={control}
          errors={errors}
          watchedSlug={watchedSlug}
          onSubmit={handleSubmit(onStep1Submit)}
          loading={creating}
          error={error}
          onCancel={() => navigate('/admin')}
        />
      )}

      {currentStep === 2 && (
        <LicenseActivationStep
          organizationId={currentOrganization?.id}
          onComplete={onStep2Complete}
          onBack={() => setCurrentStep(1)}
        />
      )}
    </div>
  )
}
