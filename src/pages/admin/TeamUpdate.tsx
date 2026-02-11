import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getTeams, updateTeam } from '../../data/services/teamsService'
import { getLevels } from '../../data/services/levelsService'
import type { Team, Level } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select, Checkbox } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function TeamUpdate() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [levelId, setLevelId] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  const levelOptions = useMemo(() => [
    { value: '', label: 'Select level' },
    ...levels.map(l => ({ value: l.id, label: l.name })),
  ], [levels])

  // Load team and levels data
  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [teamsResult, levelsResult] = await Promise.all([
          getTeams(context),
          getLevels(context),
        ])
        
        if (teamsResult.error) throw teamsResult.error
        if (levelsResult.error) throw levelsResult.error

        const allTeams = Array.isArray(teamsResult.data) ? teamsResult.data : []
        const found = allTeams.find(t => t.id === id)
        
        if (!found) {
          setError('Team not found')
          return
        }

        setTeam(found)
        setLevelId(found.level_id || '')
        setName(found.name)
        setIsActive(found.is_active ?? true)
        setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id || !levelId || !name.trim()) return
    
    setError(null)
    setSubmitting(true)

    try {
      const result = await updateTeam(context, id, {
        level_id: levelId,
        name,
        is_active: isActive,
      })
      
      if (result.error) {
        setError(result.error.message || 'Failed to update team')
      } else {
        const destination = returnUrl && decodeURIComponent(returnUrl)
          ? decodeURIComponent(returnUrl)
          : getLink('admin.teams.detail', { id })
        navigate(destination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    const destination = returnUrl && decodeURIComponent(returnUrl)
      ? decodeURIComponent(returnUrl)
      : getLink('admin.teams.detail', { id: id || '' })
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

  if (!team) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card>
          <div className="oa-body-m oa-text-danger">Team not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />
      
      <AdminPageHeader
        title="Update Team"
        subtitle={`Edit ${team.name}`}
        breadcrumbs={[
          { label: 'Teams', path: getLink('admin.teams.list') },
          { label: team.name, path: getLink('admin.teams.detail', { id: id || '' }) },
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
              label="Level"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              options={levelOptions}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          <div className="oa-form-group">
            <Input
              label="Team Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder="e.g., Team Red or Team A"
            />
          </div>

          <div className="oa-checkbox-row">
            <Checkbox
              label="Active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
            />
          </div>

          <div className="oa-form-actions">
            <Button
              type="submit"
              disabled={!levelId || !name.trim() || submitting || isOffline || USE_FAKE_DATA}
              loading={submitting}
            >
              Update Team
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

