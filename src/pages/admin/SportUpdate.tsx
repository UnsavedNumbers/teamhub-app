import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, updateSport } from '../../data/services/sportsService'
import type { Sport } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function SportUpdate() {
  const { sport_id } = useParams<{ sport_id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState<Sport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [name, setName] = useState('')

  // Load sport data
  useEffect(() => {
    if (!isReady || !sport_id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSports(context)
        if (result.error) throw result.error

        const allSports = Array.isArray(result.data) ? result.data : []
        const found = allSports.find(s => s.id === sport_id)
        
        if (!found) {
          setError('Sport not found')
          return
        }

        setSport(found)
        setName(found.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sport')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, sport_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sport_id || !name.trim()) return
    
    setError(null)
    setSubmitting(true)

    try {
      const result = await updateSport(context, sport_id, { name })
      
      if (result.error) {
        setError(result.error.message || 'Failed to update sport')
      } else {
        // Navigate to return URL or detail page
        const destination = returnUrl && decodeURIComponent(returnUrl)
          ? decodeURIComponent(returnUrl)
          : getLink('admin.sports.detail', { sport_slug: sport_id })
        navigate(destination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sport')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    const destination = returnUrl && decodeURIComponent(returnUrl)
      ? decodeURIComponent(returnUrl)
      : getLink('admin.sports.detail', { sport_slug: sport_id || '' })
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

  if (!sport) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card>
          <div className="oa-body-m oa-text-danger">Sport not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />
      
      <AdminPageHeader
        title="Update Sport"
        subtitle={`Edit ${sport.name}`}
        breadcrumbs={[
          { label: 'Sports', path: getLink('admin.sports.list') },
          { label: sport.name, path: getLink('admin.sports.detail', { sport_slug: sport_id || '' }) },
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
            <Input
              label="Sport Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder="Enter sport name"
            />
          </div>

          <div className="oa-form-actions">
            <Button
              type="submit"
              disabled={!name.trim() || submitting || isOffline || USE_FAKE_DATA}
              loading={submitting}
            >
              Update Sport
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

