import { useState, useCallback, useEffect } from 'react'
import { Control, FieldErrors, Controller } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../platformAdmin'

interface OrganizationFormData {
  name: string
  org_type: 'school' | 'club' | 'league' | 'academy' | 'aau' | ''
  slug: string
  contact_email: string
  office_location?: string
}

interface OrganizationIdentityStepProps {
  control: Control<OrganizationFormData>
  errors: FieldErrors<OrganizationFormData>
  watchedSlug: string
  onSubmit: () => void
  loading: boolean
  error: string | null
  onCancel: () => void
}

const SLUG_CHECK_DEBOUNCE_MS = 500

export default function OrganizationIdentityStep({
  control,
  errors,
  watchedSlug,
  onSubmit,
  loading,
  error,
  onCancel,
}: OrganizationIdentityStepProps) {
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [slugError, setSlugError] = useState<string | null>(null)

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus('idle'); setSlugError(null); return }
    const slugPattern = /^[a-z0-9-]+$/
    if (!slugPattern.test(slug) || slug.startsWith('-') || slug.endsWith('-') || slug.includes('--')) {
      setSlugStatus('invalid'); setSlugError('Invalid slug format (lowercase, numbers, and hyphens only)'); return
    }

    setSlugStatus('checking'); setSlugError(null)
    try {
      const { data, error: queryError } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
      if (queryError) { setSlugStatus('idle'); return }
      if (data) { setSlugStatus('taken'); setSlugError('This URL slug is already taken') }
      else { setSlugStatus('available'); setSlugError(null) }
    } catch { setSlugStatus('idle') }
  }, [])

  useEffect(() => {
    if (!watchedSlug) { setSlugStatus('idle'); setSlugError(null); return }
    const timeoutId = setTimeout(() => checkSlugAvailability(watchedSlug), SLUG_CHECK_DEBOUNCE_MS)
    return () => clearTimeout(timeoutId)
  }, [watchedSlug, checkSlugAvailability])

  const isSubmitDisabled = loading || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'

  return (
    <div className="pa-flex pa-justify-center pa-items-center pa-p-8" style={{ minHeight: '100vh', background: 'var(--pa-bg)' }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        <header className="pa-mb-10 pa-text-center">
          <h1 className="pa-h1 pa-mb-2" style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.04em' }}>ORGANIZATION SETUP</h1>
          <p className="pa-body-m pa-text-muted">Define your identity. Set the standard.</p>
        </header>

        <Card style={{ padding: 'var(--pa-space-12)' }}>
          {error && <div className="pa-card pa-mb-6 pa-text-danger pa-bg-danger-bg" style={{ border: 'none' }}>{error}</div>}

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="pa-flex pa-flex-col pa-gap-6">
            <div className="pa-grid pa-grid-2 pa-gap-6">
              <div className="pa-col-2">
                <Controller name="name" control={control} rules={{ required: 'Name is required' }} render={({ field }) => (
                  <Input {...field} label="ORGANIZATION NAME" placeholder="e.g. NORTH SHORE ACADEMY" required error={errors.name?.message || undefined} />
                )} />
              </div>
              
              <Controller name="org_type" control={control} rules={{ required: 'Type is required' }} render={({ field }) => (
                <Select {...field} value={field.value || ''} label="TYPE" options={[{value:'club', label:'CLUB'}, {value:'school', label:'SCHOOL'}, {value:'academy', label:'ACADEMY'}, {value:'league', label:'LEAGUE'}, {value:'aau', label:'AAU'}]} required />
              )} />

              <Controller name="slug" control={control} rules={{ required: 'Slug is required' }} render={({ field }) => (
                <div className="pa-flex pa-flex-col">
                  <Input 
                    {...field} 
                    label="URL SLUG" 
                    placeholder="your-name" 
                    required 
                    error={(slugError || errors.slug?.message) || undefined}
                    onChange={(e) => { const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); field.onChange(val); }}
                  />
                  <div className="pa-text-overline pa-mt-1 pa-text-muted">th.io/{field.value || 'your-name'}</div>
                  {slugStatus === 'available' && <div className="pa-body-xs pa-text-success pa-mt-1">URL IS AVAILABLE</div>}
                </div>
              )} />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-6">
              <Controller name="contact_email" control={control} rules={{ required: 'Email is required' }} render={({ field }) => (
                <Input {...field} label="CONTACT EMAIL" type="email" placeholder="admin@organization.com" required error={errors.contact_email?.message || undefined} />
              )} />
              <Controller name="office_location" control={control} render={({ field }) => (
                <Input {...field} label="OFFICE LOCATION" placeholder="CITY, STATE" />
              )} />
            </div>

            <div className="pa-mt-8 pa-flex pa-flex-col pa-gap-4">
              <Button type="submit" style={{ width: '100%', height: '64px', fontSize: '1.2rem' }} disabled={isSubmitDisabled} loading={loading}>
                CONTINUE TO LICENSE
              </Button>
              <div className="pa-flex pa-justify-between pa-items-center pa-text-overline pa-text-muted">
                <span>STEP 1 OF 2 • IDENTITY & COMPLIANCE</span>
                <button type="button" onClick={onCancel} className="pa-clickable" style={{ color: 'inherit', border: 'none', background: 'none' }}>CANCEL SETUP</button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
