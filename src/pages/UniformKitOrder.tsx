import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getUniformKit, 
  getUniformKitItems, 
  getUniformSubmissions,
  submitUniformSizes,
  type UniformKit,
  type UniformItem 
} from '../data/services/uniformsService'
import { getAthletes } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'
import { getLink } from '../utils/routes'
import { showSuccess, showError } from '../utils/toast'

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface SizeSelection {
  item_id: string
  size: string
}

interface ChildSelections {
  [childId: string]: {
    [itemId: string]: string // item_id -> size
  }
}

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function UniformKitOrder() {
  useDebugLifecycle('UniformKitOrder')
  
  const t = useT()
  const { kitId } = useParams<{ kitId: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()

  const [kit, setKit] = useState<UniformKit | null>(null)
  const [items, setItems] = useState<UniformItem[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<ChildSelections>({})

  const fetchData = useCallback(async () => {
    if (!isReady || !kitId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch kit
      const { data: kitData, error: kitError } = await getUniformKit(context, kitId)
      if (kitError || !kitData) {
        const errorMessage = kitError?.message || 'Uniform kit not found'
        setError(errorMessage)
        showError(errorMessage)
        setLoading(false)
        return
      }
      setKit(kitData)

      // Fetch kit items
      const { data: itemsData, error: itemsError } = await getUniformKitItems(context, [kitId])
      if (itemsError) {
        console.error('Error fetching items:', itemsError)
      } else {
        setItems(itemsData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
      }

      // Fetch children
      const { data: childData } = await getAthletes(context)
      const childrenList = childData.map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
      }))
      setChildren(childrenList)

      // Selections will be initialized after fetching submissions

      // Fetch existing submissions to pre-populate
      const { data: submissionsData } = await getUniformSubmissions(context, childrenList.map(c => c.id))
      setSubmissions(submissionsData || [])
      
      // Pre-populate selections from existing submissions
      if (submissionsData && itemsData) {
        const existingSelections: ChildSelections = {}
        childrenList.forEach(child => {
          existingSelections[child.id] = {}
          const submission = submissionsData.find(s => s.kit_id === kitId && ((s as any).athlete_id ?? (s as any).child_id) === child.id)
          if (submission && submission.items && Array.isArray(submission.items)) {
            submission.items.forEach((item: any) => {
              if (item.item_id && item.size) {
                existingSelections[child.id][item.item_id] = item.size
              }
            })
          }
        })
        setSelections(existingSelections)
      } else {
        // Initialize empty selections if no existing data
        const emptySelections: ChildSelections = {}
        childrenList.forEach(child => {
          emptySelections[child.id] = {}
        })
        setSelections(emptySelections)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load uniform kit'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [context, isReady, kitId])

  useEffect(() => {
    if (isReady) fetchData()
    else setLoading(false)
  }, [isReady, fetchData])

  const handleSizeChange = (childId: string, itemId: string, size: string) => {
    setSelections(prev => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [itemId]: size,
      },
    }))
  }

  const handleSubmit = async (childId: string) => {
    if (!kitId) return

    setSubmitting(true)
    setError(null)

    const childSelections = selections[childId] || {}
    const submissionItems: SizeSelection[] = Object.entries(childSelections)
      .filter(([_, size]) => size && size.trim() !== '')
      .map(([item_id, size]) => ({ item_id, size }))

    // Validate required items
    const requiredItems = items.filter(item => item.required)
    const missingRequired = requiredItems.filter(
      item => !submissionItems.find(si => si.item_id === item.id)
    )

    if (missingRequired.length > 0) {
      const errorMessage = `Please select sizes for all required items: ${missingRequired.map(i => i.name).join(', ')}`
      setError(errorMessage)
      showError(errorMessage)
      setSubmitting(false)
      return
    }

    try {
      const { error: submitError } = await submitUniformSizes(
        context,
        kitId,
        childId,
        submissionItems
      )

      if (submitError) {
        const errorMessage = submitError.message || 'Failed to submit uniform sizes'
        setError(errorMessage)
        showError(errorMessage)
      } else {
        // Refresh data to show updated submission
        await fetchData()
        // Show success message
        const child = children.find(c => c.id === childId)
        const childName = child ? `${child.first_name} ${child.last_name}` : 'Order'
        showSuccess(`Uniform sizes submitted successfully for ${childName}`)
        setError(null)
      }
    } catch (err) {
      console.error('Error submitting sizes:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit uniform sizes'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const getSizeOptions = (item: UniformItem): string[] => {
    // Handle fake data format (sizes_available)
    if (item.sizes_available && Array.isArray(item.sizes_available)) {
      return item.sizes_available
    }
    
    // Handle real data format (size_options)
    if (!item.size_options) return []
    if (Array.isArray(item.size_options)) return item.size_options
    
    // Handle JSONB case (string or object)
    try {
      const parsed = typeof item.size_options === 'string' 
        ? JSON.parse(item.size_options) 
        : item.size_options
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getSubmissionStatus = (childId: string) => {
    const submission = submissions.find(s => s.kit_id === kitId && (s.athlete_id ?? (s as { child_id?: string }).child_id) === childId)
    return submission?.status || null
  }

  const isKitLocked = () => {
    // Check if kit itself is locked
    return !!(kit as any)?.locked_at
  }

  const isKitExpired = () => {
    // Check if deadline has passed (handle both deadline and deadline_at)
    const deadline = (kit as any)?.deadline_at || (kit as any)?.deadline
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const isSubmissionLocked = (childId: string) => {
    // Kit-level lock takes precedence
    if (isKitLocked() || isKitExpired()) return true
    
    const status = getSubmissionStatus(childId)
    // Status enum: 'not_submitted' | 'submitted' | 'locked' | 'fulfilled'
    return status === 'locked' || status === 'fulfilled'
  }

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Uniforms', path: getLink('portal.uniforms') },
          { label: 'Order' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (error && !kit) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Uniforms', path: getLink('portal.uniforms') },
          { label: 'Order' },
        ]}
      >
        <Card className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <Button variant="primary" onClick={() => navigate(getLink('portal.uniforms'))}>
            Back to Uniforms
          </Button>
        </Card>
      </PortalLayout>
    )
  }

  if (!kit) {
    return null
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Uniforms', path: getLink('portal.uniforms') },
        { label: kit.name },
      ]}
    >
      <div className="mb-12">
        <PageTitle>{kit.name}</PageTitle>
        {kit.description && (
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
            {kit.description}
          </p>
        )}
        {((kit as any).deadline || (kit as any).deadline_at) && (
          <p className={`text-sm mt-2 ${
            new Date((kit as any).deadline_at || (kit as any).deadline || '') < new Date() 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-slate-600 dark:text-slate-300'
          }`}>
            <Icon name="schedule" size="text-sm" className="inline mr-1" />
            Order deadline: {new Date((kit as any).deadline_at || (kit as any).deadline || '').toLocaleDateString()}
            {new Date((kit as any).deadline_at || (kit as any).deadline || '') < new Date() && (
              <span className="ml-2 font-semibold">(Expired)</span>
            )}
          </p>
        )}
        {((kit as any).locked_at) && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">
            <Icon name="lock" size="text-sm" className="inline mr-1" />
            Submissions are locked for this kit.
          </p>
        )}
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {children.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {t('portal.uniforms.addChildrenFirst')}
          </p>
          <Button variant="primary" onClick={() => navigate('/portal/athletes')}>
            {t('portal.uniforms.add')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {children.map((child) => {
            const isLocked = isSubmissionLocked(child.id)
            const submissionStatus = getSubmissionStatus(child.id)

            return (
              <Card key={child.id} className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <CardTitle className="mb-1">
                      {child.first_name} {child.last_name}
                    </CardTitle>
                    {submissionStatus && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        submissionStatus === 'submitted' || submissionStatus === 'locked' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : submissionStatus === 'fulfilled'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {submissionStatus === 'not_submitted' ? 'Not Submitted' : submissionStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {items.map((item) => {
                    const sizeOptions = getSizeOptions(item)
                    const selectedSize = selections[child.id]?.[item.id] || ''

                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex-1">
                          <label className="form-label">
                            {item.name}
                            {item.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          {sizeOptions.length > 0 ? (
                            <select
                              value={selectedSize}
                              onChange={(e) => handleSizeChange(child.id, item.id, e.target.value)}
                              disabled={isLocked}
                              className="form-select"
                            >
                              <option value="">Select size...</option>
                              {sizeOptions.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={selectedSize}
                              onChange={(e) => handleSizeChange(child.id, item.id, e.target.value)}
                              disabled={isLocked}
                              placeholder="Enter size..."
                              className="form-input"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 flex justify-end">
                  {isLocked ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {isKitLocked() ? (
                        <p>This kit is locked and no longer accepting submissions.</p>
                      ) : isKitExpired() ? (
                        <p>The deadline for this kit has passed. Submissions are no longer accepted.</p>
                      ) : (
                        <p>This order has been {submissionStatus === 'locked' ? 'locked' : submissionStatus === 'fulfilled' ? 'fulfilled' : submissionStatus} and cannot be modified.</p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleSubmit(child.id)}
                      disabled={submitting || isKitLocked() || isKitExpired()}
                    >
                      {submitting ? 'Submitting...' : submissionStatus === 'submitted' ? 'Update Order' : 'Submit Order'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PortalLayout>
  )
}
