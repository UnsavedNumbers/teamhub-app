import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, Input, Button, ErrorState } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { createFamily } from '../../data/services/familyService'

export default function CreateFamily() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const [formData, setFormData] = useState({
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !isReady) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: createError } = await createFamily(context, {
        name: formData.name,
        org_id: context.orgId || ''
      })

      if (createError) throw createError
      if (data) {
        navigate(`/admin/families/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create family'))
      setLoading(false)
    }
  }

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <PageHeader
        title="NEW FAMILY"
        breadcrumbs={[
          { label: 'Families', to: '/admin/families' },
          { label: 'New Family', to: '/admin/families/new' }
        ]}
      />

      <div className="pa-grid pa-grid-12">
        <div className="pa-col-8 pa-offset-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <h2 className="pa-h2 pa-mb-6">Family Details</h2>
              
              {error && <ErrorState title="Creation Failed" message={error.message} onRetry={() => setError(null)} />}

              <div className="pa-form-group pa-mb-6">
                <Input
                  label="Family Name"
                  placeholder="e.g. Johnson Family"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
                <div className="pa-text-sm pa-text-muted pa-mt-2">
                  This is how the family will be identified in reports and lists.
                </div>
              </div>

              <div className="pa-flex pa-justify-end pa-gap-4 pa-mt-8">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => navigate('/admin/families')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !formData.name}
                >
                  {loading ? 'Creating...' : 'Create Family'}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
