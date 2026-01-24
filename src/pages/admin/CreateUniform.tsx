/**
 * CreateUniform Page
 * 
 * Page for creating new uniforms (org-level or team-level).
 */

import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { createUniformKit } from '../../data/services/uniformsService'
import { AdminPageHeader, Card } from '../../components/platformAdmin'
import { SportUniformForm } from '../../components/uniforms/SportUniformForm'
import type { CreateUniformKitDTO } from '../../types/uniforms'

export default function CreateUniform() {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const handleSubmit = async (data: CreateUniformKitDTO) => {
    if (!context || !isReady) {
      throw new Error('User context not ready')
    }

    const { error } = await createUniformKit(context, data)
    if (error) {
      throw error
    }

    // Navigate back to uniforms list
    navigate('/admin/uniforms')
  }

  if (!isReady) {
    return <div>Loading...</div>
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create Uniform"
        actions={null}
      />

      <div className="pa-form-container">
        <SportUniformForm
          onSubmit={handleSubmit}
          isOrgLevel={false}
        />
      </div>
    </div>
  )
}
