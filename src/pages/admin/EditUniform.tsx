/**
 * EditUniform Page
 * 
 * Page for editing existing uniforms.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getUniformKit, updateUniformKit } from '../../data/services/uniformsService'
import { AdminPageHeader, Card, Button } from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { SportUniformForm } from '../../components/uniforms/SportUniformForm'
import type { CreateUniformKitDTO } from '../../types/uniforms'

export default function EditUniform() {
  const { id } = useParams<{ id: string }>()
  const { context, isReady } = useUserContext()
  const t = useT()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<Partial<CreateUniformKitDTO> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kitId = id
  if (!kitId) {
    return <Navigate to="/admin/uniforms" />
  }

  useEffect(() => {
    if (!isReady || !context || !kitId) return

    async function loadUniform() {
      if (!kitId) return

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await getUniformKit(context, kitId)
        if (fetchError) {
          setError(fetchError.message)
          return
        }

        if (!data) {
          setError('Uniform not found')
          return
        }

        // Map the uniform kit data to form data
        setInitialData({
          name: data.name,
          sport_id: (data as any).sport_id || '',
          program_id: (data as any).program_id || null,
          season_id: (data as any).season_id || null,
          team_id: (data as any).team_id || null,
          primary_color: (data as any).primary_color || null,
          secondary_color: (data as any).secondary_color || null,
          accent_color: (data as any).accent_color || null,
          vendor: (data as any).vendor || null,
          notes: (data as any).notes || null,
          status: (data as any).status || 'active',
          deadline_at: (data as any).deadline_at || null,
          sport_specific_fields: (data as any).sport_specific_fields || {},
        })
      } catch (err) {
        console.error('Error loading uniform:', err)
        setError(err instanceof Error ? err.message : 'Failed to load uniform')
      } finally {
        setLoading(false)
      }
    }

    loadUniform()
  }, [id, context, isReady])

  const handleSubmit = async (data: CreateUniformKitDTO) => {
    if (!context || !isReady || !id) {
      throw new Error('Missing required context or ID')
    }

    const { error } = await updateUniformKit(context, id, data)
    if (error) {
      throw error
    }

    // Navigate back to uniforms list
    navigate('/admin/uniforms')
  }

  if (!isReady) {
    return <div>Loading...</div>
  }

  if (loading) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Edit Uniform" />
        <Card>
          <div>Loading uniform...</div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Edit Uniform" />
        <Card>
          <div className="pa-alert pa-alert--error">{error}</div>
          <OrgAdminButton onClick={() => navigate('/admin/uniforms')} variant="primary">
            Back to Uniforms
          </OrgAdminButton>
        </Card>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Edit Uniform" />
        <Card>
          <div>Uniform not found</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Edit Uniform"
        subtitle={t('admin.uniforms.editSubtitle')}
        actions={null}
      />

      <div className="pa-form-container">
        <SportUniformForm
          onSubmit={handleSubmit}
          initialData={initialData}
          isOrgLevel={!initialData.team_id}
          teamId={initialData.team_id || null}
        />
      </div>
    </div>
  )
}
