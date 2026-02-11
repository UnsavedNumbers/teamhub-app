import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getLevels, updateLevel } from '../../data/services/levelsService'
import { getPrograms } from '../../data/services/sportsService'
import type { Level, LevelType, Program } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function LevelUpdate() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState<Level | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [programId, setProgramId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<LevelType | ''>('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [gradeMin, setGradeMin] = useState('')
  const [gradeMax, setGradeMax] = useState('')
  const [skillDescription, setSkillDescription] = useState('')

  const programOptions = useMemo(() => [
    { value: '', label: 'Select program' },
    ...programs.map(p => ({ value: p.id, label: p.name })),
  ], [programs])

  const typeOptions = [
    { value: '', label: 'Select level type' },
    { value: 'age_based', label: 'Age-based' },
    { value: 'grade_based', label: 'Grade-based' },
    { value: 'skill_based', label: 'Skill-based' },
  ]

  // Load level and programs data
  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [levelsResult, programsResult] = await Promise.all([
          getLevels(context),
          getPrograms(context),
        ])
        
        if (levelsResult.error) throw levelsResult.error
        if (programsResult.error) throw programsResult.error

        const allLevels = Array.isArray(levelsResult.data) ? levelsResult.data : []
        const found = allLevels.find(l => l.id === id)
        
        if (!found) {
          setError('Level not found')
          return
        }

        setLevel(found)
        setProgramId(found.program_id)
        setName(found.name)
        setType(found.level_type)
        setAgeMin(found.age_min ? String(found.age_min) : '')
        setAgeMax(found.age_max ? String(found.age_max) : '')
        setGradeMin(found.grade_min ? String(found.grade_min) : '')
        setGradeMax(found.grade_max ? String(found.grade_max) : '')
        setSkillDescription(found.description || '')
        setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load level')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id || !programId || !name.trim() || !type) return
    
    setError(null)
    setSubmitting(true)

    try {
      const result = await updateLevel(context, id, {
        name,
        level_type: type as LevelType,
        age_min: type === 'age_based' && ageMin ? parseInt(ageMin) : undefined,
        age_max: type === 'age_based' && ageMax ? parseInt(ageMax) : undefined,
        grade_min: type === 'grade_based' && gradeMin ? parseInt(gradeMin) : undefined,
        grade_max: type === 'grade_based' && gradeMax ? parseInt(gradeMax) : undefined,
        description: type === 'skill_based' ? skillDescription : undefined,
      })
      
      if (result.error) {
        setError(result.error.message || 'Failed to update level')
      } else {
        const destination = returnUrl && decodeURIComponent(returnUrl)
          ? decodeURIComponent(returnUrl)
          : getLink('admin.levels.detail', { id })
        navigate(destination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update level')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    const destination = returnUrl && decodeURIComponent(returnUrl)
      ? decodeURIComponent(returnUrl)
      : getLink('admin.levels.detail', { id: id || '' })
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

  if (!level) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card>
          <div className="oa-body-m oa-text-danger">Level not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />
      
      <AdminPageHeader
        title="Update Level"
        subtitle={`Edit ${level.name}`}
        breadcrumbs={[
          { label: 'Levels', path: getLink('admin.levels.list') },
          { label: level.name, path: getLink('admin.levels.detail', { id: id || '' }) },
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
          <div className="oa-form-group">
            <Select
              label="Program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              options={programOptions}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          <div className="oa-form-group">
            <Input
              label="Level Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder="e.g., U12 or Varsity"
            />
          </div>

          <div className="oa-form-group">
            <Select
              label="Level Type"
              value={type}
              onChange={(e) => setType(e.target.value as LevelType)}
              options={typeOptions}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          {type === 'age_based' && (
            <>
              <div className="oa-form-group">
                <Input
                  label="Minimum Age"
                  type="number"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  required
                  disabled={isOffline || USE_FAKE_DATA || submitting}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="oa-form-group">
                <Input
                  label="Maximum Age"
                  type="number"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  required
                  disabled={isOffline || USE_FAKE_DATA || submitting}
                  placeholder="e.g., 12"
                />
              </div>
            </>
          )}

          {type === 'grade_based' && (
            <>
              <div className="oa-form-group">
                <Input
                  label="Minimum Grade"
                  type="number"
                  value={gradeMin}
                  onChange={(e) => setGradeMin(e.target.value)}
                  required
                  disabled={isOffline || USE_FAKE_DATA || submitting}
                  placeholder="e.g., 6"
                />
              </div>
              <div className="oa-form-group">
                <Input
                  label="Maximum Grade"
                  type="number"
                  value={gradeMax}
                  onChange={(e) => setGradeMax(e.target.value)}
                  required
                  disabled={isOffline || USE_FAKE_DATA || submitting}
                  placeholder="e.g., 8"
                />
              </div>
            </>
          )}

          {type === 'skill_based' && (
            <div className="oa-form-group">
              <Input
                label="Skill Description"
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
                required
                disabled={isOffline || USE_FAKE_DATA || submitting}
                placeholder="e.g., Beginner, Intermediate, Advanced"
              />
            </div>
          )}

          <div className="oa-form-actions">
            <Button
              type="submit"
              disabled={!programId || !name.trim() || !type || submitting || isOffline || USE_FAKE_DATA}
              loading={submitting}
            >
              Update Level
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

