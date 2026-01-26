/**
 * CreateUniform Page
 * 
 * Page for creating new uniforms (org-level or team-level).
 */

import { useNavigate, Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganizationSports } from '../../hooks/useOrganizationSports'
import { useT } from '../../i18n/useI18n'
import { createUniformKit } from '../../data/services/uniformsService'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { AdminPageHeader, Card, Button, EmptyState } from '../../components/platformAdmin'
import { SportUniformForm } from '../../components/uniforms/SportUniformForm'
import type { CreateUniformKitDTO } from '../../types/uniforms'
import { getLink } from '../../utils/routes'

export default function CreateUniform() {
  const { context, isReady } = useUserContext()
  const { sports, loading: sportsLoading, error: sportsError, refetch: refetchSports } = useOrganizationSports()
  const navigate = useNavigate()
  const t = useT()

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

  // Guard: Check if context is ready
  if (!isReady || !context?.orgId) {
    return <AdminLoadingSpinner />
  }

  // Show loading state while sports are loading
  if (sportsLoading) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <AdminLoadingSpinner />
      </div>
    )
  }

  // Show error state if sports failed to load
  if (sportsError) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <Card>
          <div className="pa-p-8 pa-text-center">
            <p className="pa-text-danger pa-mb-4">{t('admin.uniforms.prerequisite.loadError', { message: sportsError.message })}</p>
            <Button onClick={refetchSports} variant="primary">
              {t('admin.uniforms.prerequisite.retry')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Show empty state if no sports exist
  if ((sports?.length ?? 0) === 0) {
    const returnUrl = encodeURIComponent('/admin/uniforms/new')
    return (
      <div className="pa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <Card>
          <EmptyState
            icon="checkroom"
            title={t('admin.uniforms.prerequisite.noSportsTitle')}
            description={t('admin.uniforms.prerequisite.noSportsDescription')}
          >
            <Link to={`${getLink('admin.organization.forms')}?type=sport&returnUrl=${returnUrl}`}>
              <Button variant="primary">{t('admin.uniforms.prerequisite.addSport')}</Button>
            </Link>
          </EmptyState>
        </Card>
      </div>
    )
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
