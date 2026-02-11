import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminPageHeader, Card, Input, Button, Select, DatePicker, ErrorState } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { useUserContext } from '../../hooks/useUserContext'
import { createAthleteBasic, getFamilyDetails } from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { Gender } from '../../types/family'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

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
      const { data } = await getFamilyDetails(context, familyId)
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
      const { error: createError } = await createAthleteBasic(context, {
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
      navigate(getLink('admin.guardians.detail', { id: familyId }))
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('admin.createChild.errorCreate')))
      setLoading(false)
    }
  }

  // If we are waiting for User/Org context, show platform-level spinner
  if (!isReady) return <AdminLoadingSpinner />
  
  // If we are just fetching family name details, show lightweight loading
  if (initializing) return <div className="oa-loader" />

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.createChild.title')}
        subtitle={familyName ? t('admin.createChild.subtitle', { familyName }) : ''}
        breadcrumbs={[
          { label: 'Families', path: '/admin/families' },
          { label: familyName || 'Family', path: `/admin/families/${familyId}` },
          { label: t('admin.createChild.addChild'), path: '#' }
        ]}
      />

      <div className="oa-form-container">
          <form onSubmit={handleSubmit}>
            <Card>
              <h2 className="oa-h2 oa-mb-6">Player Details</h2>
              
              {error && <ErrorState title="Creation Failed" message={error.message} onRetry={() => setError(null)} />}

              <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
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

              <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
                <DatePicker
                  label="Date of Birth"
                  value={formData.date_of_birth}
                  onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
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

              <div className="oa-mb-6">
                  <Input
                    label="Jersey Number (Optional)"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    placeholder="e.g. 23"
                  />
              </div>

              <h3 className="oa-h3 oa-mt-8 oa-mb-4">Medical & Emergency</h3>
              
              <div className="oa-mb-4">
                <Input
                  label="Allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g. Peanuts, Bee stings (Leave empty if none)"
                />
              </div>

              <div className="oa-mb-4">
                <Input
                  label="Medical Notes"
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  placeholder="e.g. Asthmatic, carries inhaler"
                />
              </div>

              <div className="oa-grid oa-grid-2 oa-gap-4 oa-mb-4">
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

              <div className="oa-flex oa-justify-end oa-gap-4 oa-mt-8">
                <OrgAdminButton
                  variant="primary"
                  onClick={() => navigate(getLink('admin.guardians.detail', { id: familyId! }))}
                  disabled={loading}
                >
                  Cancel
                </OrgAdminButton>
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
  )
}
