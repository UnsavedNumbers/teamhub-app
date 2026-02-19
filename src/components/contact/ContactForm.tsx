/**
 * ContactForm Component
 * 
 * Shared contact form component used across help, portal, and admin surfaces.
 * Handles form state, validation, submission, and success/error states.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useT } from '../../i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUserContext } from '../../hooks/useUserContext'
import { useLocale } from '../../i18n/useI18n'
import { useTheme } from '../../hooks/useTheme'
import { useOffline } from '../../hooks/useOffline'
import { getGuardianAthletes } from '../../data/services/guardianService'
import { getTeamsForParent, getTeamsForCoach } from '../../data/services/teamsService'
import { buildContactPayload, submitContact } from '../../services/contactService'
import type { ContactFormProps, ContactFormState, ContactFormErrors } from './ContactForm.types'
import type { ContactSurface } from '../../types/contact'
import '../../styles/portal.css'
import '../../styles/orgAdmin.css'

export function ContactForm({
  surface,
  subjects,
  defaultEmail = '',
  defaultName = '',
  requireName = false,
  requireEmail = false,
}: ContactFormProps) {
  const t = useT()
  const { user, profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const { context: userContext } = useUserContext()
  const { locale } = useLocale()
  const { resolvedTheme } = useTheme()
  const { isOffline } = useOffline()

  // Form state
  const [formData, setFormData] = useState<ContactFormState>({
    subject: '',
    message: '',
    name: defaultName,
    email: defaultEmail || user?.email || '',
  })

  // UI state
  const [errors, setErrors] = useState<ContactFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Refs for focus management
  const successBannerRef = useRef<HTMLDivElement>(null)
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Update email when user changes
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }))
    }
  }, [user?.email, formData.email])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: ContactFormErrors = {}

    if (!formData.subject) {
      newErrors.subject = t('contact.subject.required')
    }

    if (!formData.message.trim()) {
      newErrors.message = t('contact.message.required')
    }

    if (requireName && !formData.name.trim()) {
      newErrors.name = t('contact.name.required')
    }

    if (requireEmail && !formData.email.trim()) {
      newErrors.email = t('contact.email.required')
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, requireName, requireEmail, t])

  // Get subject label from translations
  const getSubjectLabel = useCallback((subjectEnum: string): string => {
    const key = `contact.subject.${surface}.${subjectEnum}` as const
    const label = t(key)
    // If translation returns the key itself, fallback to enum value
    return label === key ? subjectEnum : label
  }, [surface, t])

  // Collect user metadata for payload
  const collectUserMetadata = useCallback(async () => {
    if (!user || !userContext) {
      return {
        roleContext: 'public' as const,
      }
    }

    const roleContext = currentOrganization?.roles?.includes('org_admin')
      ? 'org_admin'
      : currentOrganization?.roles?.includes('coach')
        ? 'coach'
        : currentOrganization?.roles?.includes('parent')
          ? 'guardian'
          : 'public'

    let teamIds: string[] | undefined
    let athleteIds: string[] | undefined

    // Fetch team IDs and athlete IDs if guardian or coach
    if (roleContext === 'guardian' && currentOrganization) {
      try {
        const teamsResult = await getTeamsForParent(userContext)
        teamIds = teamsResult.data?.map(t => t.id) || undefined

        const athletesResult = await getGuardianAthletes(user.id, currentOrganization.id)
        athleteIds = athletesResult.data?.map(a => a.id) || undefined
      } catch (error) {
        console.warn('Failed to fetch guardian metadata:', error)
      }
    } else if (roleContext === 'coach' && currentOrganization) {
      try {
        const teamsResult = await getTeamsForCoach(userContext)
        teamIds = teamsResult.data?.map(t => t.id) || undefined
      } catch (error) {
        console.warn('Failed to fetch coach metadata:', error)
      }
    }

    return {
      userId: user.id,
      email: user.email || formData.email || null,
      name: profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name || profile?.last_name || formData.name || null,
      roleContext,
      orgId: currentOrganization?.id || null,
      orgName: currentOrganization?.name || null,
      teamIds,
      athleteIds,
    }
  }, [user, userContext, currentOrganization, profile, formData.email, formData.name])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setShowSuccess(false)

    // Announce submission start to screen readers
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = t('contact.submit.sending')
    }

    try {
      // Collect user metadata
      const userMetadata = await collectUserMetadata()

      // Build payload
      const payload = buildContactPayload({
        surface,
        subjectEnum: formData.subject,
        subjectLabel: getSubjectLabel(formData.subject),
        message: formData.message,
        name: formData.name || undefined,
        email: formData.email || undefined,
        userContext: userMetadata,
        clientMetadata: {
          environment: undefined, // Will be set by buildContactPayload
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          routePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          timezone: undefined, // Will be set by buildContactPayload
          locale,
          theme: resolvedTheme,
          activeOrgId: currentOrganization?.id || null,
          activeRole: currentOrganization?.roles?.[0] || null,
        },
      })

      // Submit to webhook
      const result = await submitContact(payload, surface)

      if (result.success) {
        // Success: clear message, show success banner
        setFormData(prev => ({ ...prev, message: '' }))
        setShowSuccess(true)
        setErrors({})

        // Announce success to screen readers
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = t('contact.success.message')
        }

        // Focus success banner for accessibility
        setTimeout(() => {
          successBannerRef.current?.focus()
        }, 100)
      } else {
        // Error: show error message, preserve form data
        setSubmitError(result.error?.message || t('contact.error.message'))
        
        // Announce error to screen readers
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = result.error?.message || t('contact.error.message')
        }
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('contact.error.message'))
      
      // Announce error to screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = error instanceof Error ? error.message : t('contact.error.message')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    formData,
    validateForm,
    collectUserMetadata,
    getSubjectLabel,
    surface,
    locale,
    resolvedTheme,
    currentOrganization,
    isOffline,
    t,
  ])

  // Handle retry
  const handleRetry = useCallback(() => {
    setSubmitError(null)
    handleSubmit(new Event('submit') as any)
  }, [handleSubmit])

  // Handle input changes
  const handleChange = useCallback((field: keyof ContactFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  // Determine form container class based on surface
  const formContainerClass = surface === 'help' 
    ? 'portal-form' 
    : surface === 'admin'
      ? 'oa-form'
      : 'portal-form'

  const textareaRows = surface === 'help' ? 4 : 6

  return (
    <form onSubmit={handleSubmit} className={formContainerClass}>
      {/* ARIA live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}
      />

      {/* Success Banner */}
      {showSuccess && (
        <div
          ref={successBannerRef}
          role="alert"
          className="form-success-banner"
          tabIndex={-1}
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#d1fae5',
            border: '1px solid #10b981',
            borderRadius: '0.375rem',
            color: '#065f46',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{t('contact.success.title')}</strong>
              <p style={{ margin: '0.5rem 0 0 0' }}>{t('contact.success.message')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#065f46',
                padding: '0',
                marginLeft: '1rem',
              }}
              aria-label={t('contact.success.dismiss')}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!showSuccess && (
        <>
          {/* Error Banner */}
          {submitError && (
            <div
              role="alert"
              className="form-error-banner"
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #ef4444',
                borderRadius: '0.375rem',
                color: '#991b1b',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{t('contact.error.title')}</strong>
                  <p style={{ margin: '0.5rem 0 0 0' }}>{submitError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    padding: '0.5rem 1rem',
                    marginLeft: '1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {t('contact.error.retry')}
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="form-fields">
            {/* Subject Dropdown */}
            <div className="field-group">
              <label htmlFor="contact-subject" className="form-label">
                {t('contact.subject.label')}
                <span className="field-required">*</span>
              </label>
              <select
                id="contact-subject"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className={`form-select ${errors.subject ? 'form-input-error' : ''}`}
                disabled={isSubmitting}
                required
                aria-describedby={errors.subject ? 'subject-error' : undefined}
              >
                <option value="">{t('common.select')}</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {getSubjectLabel(subject)}
                  </option>
                ))}
              </select>
              {errors.subject && (
                <div id="subject-error" className="field-error" role="alert">
                  {errors.subject}
                </div>
              )}
            </div>

            {/* Message Textarea */}
            <div className="field-group">
              <label htmlFor="contact-message" className="form-label">
                {t('contact.message.label')}
                <span className="field-required">*</span>
              </label>
              <textarea
                id="contact-message"
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                className={`form-textarea ${errors.message ? 'form-input-error' : ''}`}
                rows={textareaRows}
                placeholder={t('contact.message.placeholder')}
                disabled={isSubmitting}
                required
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
              {errors.message && (
                <div id="message-error" className="field-error" role="alert">
                  {errors.message}
                </div>
              )}
            </div>

            {/* Name Input */}
            {(requireName || !user) && (
              <div className="field-group">
                <label htmlFor="contact-name" className="form-label">
                  {t('contact.name.label')}
                  {requireName && <span className="field-required">*</span>}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  placeholder={t('contact.name.placeholder')}
                  disabled={isSubmitting || (!!user && !requireName)}
                  required={requireName}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <div id="name-error" className="field-error" role="alert">
                    {errors.name}
                  </div>
                )}
              </div>
            )}

            {/* Email Input */}
            {(requireEmail || !user) && (
              <div className="field-group">
                <label htmlFor="contact-email" className="form-label">
                  {t('contact.email.label')}
                  {requireEmail && <span className="field-required">*</span>}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  placeholder={t('contact.email.placeholder')}
                  disabled={isSubmitting || (!!user && !requireEmail)}
                  readOnly={!!user && !requireEmail}
                  required={requireEmail}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <div id="email-error" className="field-error" role="alert">
                    {errors.email}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? t('contact.submit.sending') : t('contact.submit.label')}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
