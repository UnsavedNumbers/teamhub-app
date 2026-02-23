import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getPrograms, getSports, updateProgram } from '../../data/services/sportsService'
import { getVenuesForOrg } from '../../data/services/venueService'
import type { Program, GenderCategory, Sport, RegistrationMode } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select, DatePicker, Checkbox } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { useI18n } from '../../i18n/useI18n'
import '../../styles/orgAdmin.css'

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender category' },
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'coed', label: 'Co-ed' },
]

// Registration mode options will be generated from i18n

export default function ProgramUpdate() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<Program | null>(null)
  const [sports, setSports] = useState<Sport[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [sportId, setSportId] = useState('')
  const [gender, setGender] = useState<GenderCategory | ''>('')
  const [name, setName] = useState('')
  const [is_public, setIsPublic] = useState(false)
  const [activity_start_date, setActivityStartDate] = useState('')
  const [activity_end_date, setActivityEndDate] = useState('')
  const [registration_start_date, setRegistrationStartDate] = useState('')
  const [registration_end_date, setRegistrationEndDate] = useState('')
  const [program_code, setProgramCode] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [default_location_id, setDefaultLocationId] = useState('')
  const [registration_mode, setRegistrationMode] = useState<RegistrationMode>('both')
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([])

  const sportOptions = useMemo(() => [
    { value: '', label: 'Select sport' },
    ...sports.map(sport => ({ value: sport.id, label: sport.name })),
  ], [sports])

  const registrationModeOptions = useMemo(() => [
    { value: 'both', label: 'Both individual and team registration' },
    { value: 'individual_only', label: 'Individual registration only' },
    { value: 'team_only', label: 'Team registration only' },
  ], [])

  // Load program and sports data
  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [programsResult, sportsResult] = await Promise.all([
          getPrograms(context),
          getSports(context),
        ])
        
        if (programsResult.error) throw programsResult.error
        if (sportsResult.error) throw sportsResult.error

        const allPrograms = Array.isArray(programsResult.data) ? programsResult.data : []
        const found = allPrograms.find(p => p.id === id)
        
        if (!found) {
          setError('Program not found')
          return
        }

        setProgram(found)
        setSportId(found.sport_id)
        setGender(found.gender_category)
        setName(found.name)
        setIsPublic(found.is_public ?? false)
        setActivityStartDate(found.activity_start_date ? found.activity_start_date.split('T')[0] : '')
        setActivityEndDate(found.activity_end_date ? found.activity_end_date.split('T')[0] : '')
        setRegistrationStartDate(found.registration_start_date ? found.registration_start_date.split('T')[0] : '')
        setRegistrationEndDate(found.registration_end_date ? found.registration_end_date.split('T')[0] : '')
        setProgramCode(found.program_code || '')
        setSponsor(found.sponsor || '')
        setDefaultLocationId(found.default_location_id || '')
        setRegistrationMode(found.registration_mode || 'both')
        setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])

        // Load venues
        try {
          const venuesList = await getVenuesForOrg(context.orgId)
          setVenues(venuesList.map(v => ({ id: v.id, name: v.name })))
        } catch (err) {
          console.error('[ProgramUpdate] Error loading venues:', err)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load program')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id || !sportId || !gender || !name.trim()) return
    
    setError(null)
    setSubmitting(true)

    try {
      const result = await updateProgram(context, id, {
        gender_category: gender as GenderCategory,
        name,
        is_public,
        activity_start_date: activity_start_date || undefined,
        activity_end_date: activity_end_date || undefined,
        registration_start_date: registration_start_date || undefined,
        registration_end_date: registration_end_date || undefined,
        program_code: program_code.trim() || undefined,
        sponsor: sponsor.trim() || undefined,
        default_location_id: default_location_id || undefined,
        registration_mode: registration_mode,
      })
      
      if (result.error) {
        setError(result.error.message || 'Failed to update program')
      } else {
        const destination = returnUrl && decodeURIComponent(returnUrl)
          ? decodeURIComponent(returnUrl)
          : getLink('admin.programs.detail', { id })
        navigate(destination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update program')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    const destination = returnUrl && decodeURIComponent(returnUrl)
      ? decodeURIComponent(returnUrl)
      : getLink('admin.programs.detail', { id: id || '' })
    navigate(destination)
  }

  if (loading) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <div className="oa-skeleton" style={{ height: '400px' }} />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card>
          <div className="oa-body-m oa-text-danger">Program not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />

      <AdminPageHeader
        title="Update Program"
        subtitle={`Edit ${program.name}`}
        breadcrumbs={[
          { label: 'Programs', path: getLink('admin.programs.list') },
          { label: program.name, path: getLink('admin.programs.detail', { id: id || '' }) },
          { label: 'Update' },
        ]}
      />

      {error && (
        <Card className="oa-mb-6">
          <div className="oa-alert-card oa-alert-card--error">
            <div className="oa-body-m oa-text-danger">{error}</div>
          </div>
        </Card>
      )}

      <div className="oa-form-container">
        <Card>
          <form onSubmit={handleSubmit} className="oa-form-grid">
          <div className="oa-form-group oa-form-row-thirds">
            <Select
              label="Sport"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              options={sportOptions}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
            <Select
              label="Gender Category"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderCategory)}
              options={GENDER_OPTIONS}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          <div className="oa-form-group">
            <Input
              label="Program Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder="e.g., Boys Basketball"
            />
          </div>

          <div className="oa-form-group">
            <Checkbox
              label={t('admin.programs.fields.isPublic.label')}
              checked={is_public}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper={t('admin.programs.fields.isPublic.helper')}
            />
          </div>

          <div className="oa-form-group oa-form-row-halves">
            <DatePicker
              label={t('admin.programs.fields.activityStartDate.label')}
              value={activity_start_date}
              onChange={(e) => setActivityStartDate(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper={t('admin.programs.fields.activityStartDate.helper')}
            />
            <DatePicker
              label={t('admin.programs.fields.activityEndDate.label')}
              value={activity_end_date}
              onChange={(e) => setActivityEndDate(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper={t('admin.programs.fields.activityEndDate.helper')}
            />
          </div>

          <div className="oa-form-group oa-form-row-halves">
            <DatePicker
              label={t('admin.programs.fields.registrationStartDate.label')}
              value={registration_start_date}
              onChange={(e) => setRegistrationStartDate(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper={t('admin.programs.fields.registrationStartDate.helper')}
            />
            <DatePicker
              label={t('admin.programs.fields.registrationEndDate.label')}
              value={registration_end_date}
              onChange={(e) => setRegistrationEndDate(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper={t('admin.programs.fields.registrationEndDate.helper')}
            />
          </div>

          <div className="oa-form-group oa-form-row-halves">
            <Input
              label={t('admin.programs.fields.programCode.label')}
              value={program_code}
              onChange={(e) => setProgramCode(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder={t('admin.programs.fields.programCode.placeholder')}
              helper={t('admin.programs.fields.programCode.helper')}
            />
            <Input
              label={t('admin.programs.fields.sponsor.label')}
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder={t('admin.programs.fields.sponsor.placeholder')}
              helper={t('admin.programs.fields.sponsor.helper')}
            />
          </div>

          <div className="oa-form-group">
            <Select
              label={t('admin.programs.fields.defaultLocation.label')}
              value={default_location_id}
              onChange={(e) => setDefaultLocationId(e.target.value)}
              options={[
                { value: '', label: t('admin.programs.fields.defaultLocation.noLocation') },
                ...venues.map(v => ({ value: v.id, label: v.name })),
              ]}
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          <div className="oa-form-group">
            <Select
              label="Registration Mode"
              value={registration_mode}
              onChange={(e) => setRegistrationMode(e.target.value as RegistrationMode)}
              options={registrationModeOptions}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helper="Controls whether this program allows individual registration, team registration, or both"
            />
          </div>

          <div className="oa-form-actions">
            <Button
              type="submit"
              disabled={!sportId || !gender || !name.trim() || submitting || isOffline || USE_FAKE_DATA}
              loading={submitting}
            >
              Update Program
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  )
}

