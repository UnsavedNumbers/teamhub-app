/**
 * CreateUniform Page
 * 
 * Page for creating new uniforms (org-level or team-level).
 */

import { useNavigate, Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganizationSports } from '../../hooks/useOrganizationSports'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { createUniformKit } from '../../data/services/uniformsService'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { AdminPageHeader, Card, Button } from '../../components/admin'
import { SportUniformForm } from '../../components/uniforms/SportUniformForm'
import type { CreateUniformKitDTO } from '../../types/uniforms'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function CreateUniform() {
  const { context, isReady } = useUserContext()
  const { sports, loading: sportsLoading, error: sportsError, refetch: refetchSports } = useOrganizationSports()
  const navigate = useNavigate()
  const t = useT()

  const handleSubmit = async (data: CreateUniformKitDTO): Promise<void> => {
    if (!context || !isReady) {
      throw new Error('User context not ready')
    }

    const { data: result, error } = await createUniformKit(context, data)
    if (error) {
      throw error
    }
    if (!result?.id) {
      throw new Error('Uniform was not created. Please try again.')
    }

    navigate('/admin/uniforms')
  }

  // Guard: Check if context is ready
  if (!isReady || !context?.orgId) {
    return <AdminLoadingSpinner />
  }

  // Show loading state while sports are loading
  if (sportsLoading) {
    return (
      <div className="oa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <AdminLoadingSpinner />
      </div>
    )
  }

  // Show error state if sports failed to load
  if (sportsError) {
    return (
      <div className="oa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <Card>
          <div className="oa-p-8 oa-text-center">
            <p className="oa-text-danger oa-mb-4">{t('admin.uniforms.prerequisite.loadError', { message: sportsError.message })}</p>
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
      <div className="oa-root">
        <AdminPageHeader title="Create Uniform" actions={null} />
        <Card className="oa-border-2 oa-border-dashed">
          <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
            <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>checkroom</span>
            <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
              <h3 className="oa-h3 oa-mb-0">{t('admin.uniforms.prerequisite.noSportsTitle')}</h3>
              <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.uniforms.prerequisite.noSportsDescription')}</p>
              <Link to={`${getLink('admin.organization.forms')}?type=sport&returnUrl=${returnUrl}`}>
                <Button variant="primary">{t('admin.uniforms.prerequisite.addSport')}</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title="Create Uniform"
        subtitle={t('admin.uniforms.createSubtitle' as TranslationKey)}
        actions={null}
      />

      <div className="oa-form-container">
        <SportUniformForm
          onSubmit={handleSubmit}
          isOrgLevel={false}
        />
      </div>
    </div>
  )
}
