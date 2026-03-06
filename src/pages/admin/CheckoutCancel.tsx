import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'
import { AdminPageHeader, Card, Button } from '../../components/admin'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function CheckoutCancel() {
  const navigate = useNavigate()

  return (
    <div className="oa-root">
      <AdminPageHeader title={t('billing.checkoutCancelTitle').toUpperCase()} />
      <Card style={{ maxWidth: '600px' }}>
        <div className="oa-flex oa-items-center oa-gap-4 oa-mb-6 oa-text-muted">
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>cancel</span>
          <div>
            <h3 className="oa-h3 oa-mb-1">{t('billing.checkoutCancelTitle')}</h3>
            <p className="oa-body-m">{t('billing.checkoutCancelBody')}</p>
          </div>
        </div>
        <div className="oa-flex oa-gap-3">
          <Button onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING))}>{t('checkout.returnToBilling')}</Button>
          <Button variant="primary" onClick={() => navigate(getLink(RouteKeys.ADMIN_ORGANIZATION_BILLING_PLAN_SELECTION))}>{t('billing.planSelectionTitle')}</Button>
        </div>
      </Card>
    </div>
  )
}
