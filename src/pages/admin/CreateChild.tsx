import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader, Card, Input, Button, Select, ErrorState } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { createChild, getFamilyDetails } from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { Gender } from '../../types/family'

export default function CreateChild() {
  const navigate = useNavigate()
  const { familyId } = useParams<{ familyId: string }>()
  const { context, isReady } = useUserContext()
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [familyName, setFamilyName] = useState('')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '' as Gender | '',
    jersey_number: '',
    medical_notes: '',
    allergies: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })

  useEffect(() => {
    async function fetchFamily() {
      if (!familyId || !isReady) return
      const { data, error } = await getFamilyDetails(context, familyId)
      if (data) {
        setFamilyName(data.name || '')
        // Pre-fill last name from family name if it ends in "Family" (simple heuristic)
        if (!formData.last_name && data.name) {
           const simpleName = data.name.replace(/\s+Family$/i, '')
           setFormData(prev => ({ ...prev, last_name: simpleName }))
        }
      }
      // If error, we still allow creation but maybe name isn't prefilled
      setInitializing(false)
    }
    fetchFamily()
  }, [familyId, context, isReady])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyId || !isReady) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: createError } = await createChild(context, {
        family_id: familyId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender || null,
        jersey_number: formData.jersey_number || null,
        medical_notes: formData.medical_notes || null,
        allergies: formData.allergies || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null
      })

      if (createError) throw createError
      navigate(`/admin/families/${familyId}`)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('admin.createChild.errorCreate')))
      setLoading(false)
    }
  }

  // If we are waiting for User/Org context, show platform-level spinner
  if (!isReady) return <AdminLoadingSpinner />
  
  // If we are just fetching family name details, show lightweight loading
  if (initializing) return <div className="pa-loader" />

  return (
    <div className="pa-root">
      <PageHeader
        title={t('admin.createChild.title')}
        subtitle={familyName ? `For ${familyName}` : ''}
        breadcrumbs={[
          { label: 'Families', to: '/admin/families' },
          { label: familyName || 'Family', to: `/admin/families/${familyId}` },
          { label: t('admin.createChild.addChild'), to: '#' }
        ]}
      />

      <div className="pa-grid pa-grid-12">
        <div className="pa-col-8 pa-offset-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <h2 className="pa-h2 pa-mb-6">Player Details</h2>
              
              {error && <ErrorState title="Creation Failed" message={error.message} onRetry={() => setError(null)} />}

              <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
                <Input
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>

              <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  required
                />
                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other/Prefer not to say' }
                  ]}
                />
              </div>

              <div className="pa-mb-6">
                 <Input
                    label="Jersey Number (Optional)"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    placeholder="e.g. 23"
                  />
              </div>

              <h3 className="pa-h3 pa-mt-8 pa-mb-4">Medical & Emergency</h3>
              
              <div className="pa-mb-4">
                <Input
                  label="Allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g. Peanuts, Bee stings (Leave empty if none)"
                />
              </div>

              <div className="pa-mb-4">
                <Input
                  label="Medical Notes"
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  placeholder="e.g. Asthmatic, carries inhaler"
                />
              </div>

              <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
                 <Input
                    label="Emergency Contact Name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                  <Input
                    label="Emergency Contact Phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
              </div>

              <div className="pa-flex pa-justify-end pa-gap-4 pa-mt-8">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => navigate(`/admin/families/${familyId}`)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !formData.first_name || !formData.last_name || !formData.date_of_birth}
                >
                  {loading ? t('admin.createChild.adding') : t('admin.createChild.addChild')}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
