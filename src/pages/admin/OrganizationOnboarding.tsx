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
    // Prevent race conditions with multiple redirects
    if (hasRedirected.current) {
      return
    }

    // Still waiting for auth to initialize
    if (authLoading) {
      return
    }

    // User is not authenticated
    if (!user) {
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
      return
    }

    // User is authenticated and profile is loaded
    // Check if they already have a complete organization
    if (currentOrganization) {
      const needsOnboarding = !currentOrganization.slug || !currentOrganization.org_type
      if (!needsOnboarding) {
        // Organization is already complete, redirect to settings
        hasRedirected.current = true
        clearSetupOrganizationFlag()
        navigate('/admin/organization', { replace: true })
        return
      }
      // Organization exists but needs completion - handled by separate useEffect
    } else {
      // No organization, proceed with fresh onboarding
      // Pre-fill email from profile if available
      if (profile.email) {
        setValue('contact_email', profile.email)
      }
      setLoading(false)
    }

    // Clear the setup flag since we've successfully reached onboarding
    clearSetupOrganizationFlag()
  }, [authLoading, user, profile, currentOrganization, navigate, setValue])

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
    if (!currentOrganization?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('name, slug, org_type, contact_email')
        .eq('id', currentOrganization.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setValue('name', data.name || '')
        setValue('slug', data.slug || '')
        setValue('org_type', (data.org_type as OrganizationFormData['org_type']) || '')
        setValue('contact_email', data.contact_email || '')
      }
    } catch (err) {
      console.error('Error loading organization:', err)
      // Don't block the user from filling out the form
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id, setValue])

  // Call loadOrganizationData when organization exists but needs completion
  useEffect(() => {
    if (currentOrganization && (!currentOrganization.slug || !currentOrganization.org_type)) {
      loadOrganizationData()
    }
  }, [currentOrganization, loadOrganizationData])

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
