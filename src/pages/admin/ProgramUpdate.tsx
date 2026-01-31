import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getPrograms, getSports, updateProgram } from '../../data/services/sportsService'
import type { Program, GenderCategory, Sport } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender category' },
  { value: 'boys', label: 'Boys' },
  { value: 'girls', label: 'Girls' },
  { value: 'coed', label: 'Co-ed' },
]

export default function ProgramUpdate() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<Program | null>(null)
  const [sports, setSports] = useState<Sport[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [sportId, setSportId] = useState('')
  const [gender, setGender] = useState<GenderCategory | ''>('')
  const [name, setName] = useState('')

  const sportOptions = useMemo(() => [
    { value: '', label: 'Select sport' },
    ...sports.map(sport => ({ value: sport.id, label: sport.name })),
  ], [sports])

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
        setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])
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
        <Card className="oa-mb-6" noPadding>
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
