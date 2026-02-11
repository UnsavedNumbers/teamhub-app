import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, Card, Input, Button, ErrorState } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { createFamily } from '../../data/services/familyService'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import '../../styles/orgAdmin.css'

export default function CreateFamily() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const t = useT()
  
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
        navigate(getLink('admin.guardians.detail', { id: data.id }))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create family'))
      setLoading(false)
    }
  }

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="oa-root">
      <AdminPageHeader
        title="NEW FAMILY"
        subtitle={t('admin.families.createSubtitle' as TranslationKey)}
        breadcrumbs={[
          { label: 'Families', path: '/admin/families' },
          { label: 'New Family', path: '/admin/families/new' }
        ]}
      />

      <div className="oa-form-container">
        <form onSubmit={handleSubmit}>
          <Card>
            <h2 className="oa-h2 oa-mb-6">Family Details</h2>
            
            {error && <ErrorState title="Creation Failed" message={error.message} onRetry={() => setError(null)} />}

            <div className="oa-form-group oa-mb-6">
              <Input
                label="Family Name"
                placeholder="e.g. Johnson Family"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
              <div className="oa-text-sm oa-text-muted oa-mt-2">
                This is how the family will be identified in reports and lists.
              </div>
            </div>

            <div className="oa-flex oa-justify-end oa-gap-4 oa-mt-8">
              <OrgAdminButton
                variant="primary"
                onClick={() => navigate(getLink('admin.guardians.list'))}
                disabled={loading}
              >
                Cancel
              </OrgAdminButton>
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
  )
}
