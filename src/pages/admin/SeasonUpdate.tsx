import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSeasons, updateSeason } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, DatePicker, Checkbox } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function SeasonUpdate() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState<Season | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(false)

  // Load season data
  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSeasons(context)
        if (result.error) throw result.error

        const allSeasons = Array.isArray(result.data) ? result.data : []
        const found = allSeasons.find(s => s.id === id)
        
        if (!found) {
          setError('Season not found')
          return
        }

        setSeason(found)
        setName(found.name)
        setStartDate(found.start_date)
        setEndDate(found.end_date)
        setIsActive(found.is_active ?? false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load season')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!id || !name.trim() || !startDate || !endDate) return
    
    if (endDate < startDate) {
      setError('End date must be after start date')
      return
    }
    
    setError(null)
    setSubmitting(true)

    try {
      const result = await updateSeason(context, id, {
        name,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
      })
      
      if (result.error) {
        setError(result.error.message || 'Failed to update season')
      } else {
        const destination = returnUrl && decodeURIComponent(returnUrl)
          ? decodeURIComponent(returnUrl)
          : getLink('admin.seasons.detail', { id })
        navigate(destination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update season')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    const destination = returnUrl && decodeURIComponent(returnUrl)
      ? decodeURIComponent(returnUrl)
      : getLink('admin.seasons.detail', { id: id || '' })
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

  if (!season) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card>
          <div className="oa-body-m oa-text-danger">Season not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />
      
      <AdminPageHeader
        title="Update Season"
        subtitle={`Edit ${season.name}`}
        breadcrumbs={[
          { label: 'Seasons', path: getLink('admin.seasons.list') },
          { label: season.name, path: getLink('admin.seasons.detail', { id: id || '' }) },
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
          <div className="oa-form-group">
            <Input
              label="Season Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isOffline || USE_FAKE_DATA || submitting}
              placeholder="e.g., Fall 2024 or Spring Season"
            />
          </div>

          <div className="oa-form-grid oa-form-grid-2 oa-form-grid-tablet-2col">
            <div className="oa-form-group">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(value) => setStartDate(value)}
                required
                isDisabled={isOffline || USE_FAKE_DATA || submitting}
              />
            </div>
            <div className="oa-form-group">
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(value) => setEndDate(value)}
                required
                isDisabled={isOffline || USE_FAKE_DATA || submitting}
              />
            </div>
          </div>

          <div className="oa-checkbox-row">
            <Checkbox
              label="Active Season"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isOffline || USE_FAKE_DATA || submitting}
              helperText="Mark this season as currently active"
            />
          </div>

          <div className="oa-form-actions">
            <Button
              type="submit"
              disabled={!name.trim() || !startDate || !endDate || submitting || isOffline || USE_FAKE_DATA}
              loading={submitting}
            >
              Update Season
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
