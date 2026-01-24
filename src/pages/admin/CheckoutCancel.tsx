import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/platformAdmin'

export default function CheckoutCancel() {
  const navigate = useNavigate()

  return (
    <div className="pa-root">
      <AdminPageHeader title={t('billing.checkoutCancelTitle').toUpperCase()} />
      <Card style={{ maxWidth: '600px' }}>
        <div className="pa-flex pa-items-center pa-gap-4 pa-mb-6 pa-text-muted">
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>cancel</span>
          <div>
            <h3 className="pa-h3 pa-mb-1">{t('billing.checkoutCancelTitle')}</h3>
            <p className="pa-body-m">{t('billing.checkoutCancelBody')}</p>
          </div>
        </div>
        <div className="pa-flex pa-gap-3">
          <Button onClick={() => navigate('/admin/organization/billing')}>{t('checkout.returnToBilling')}</Button>
          <Button variant="blue" onClick={() => navigate('/admin/organization/billing/plan-selection')}>{t('billing.planSelectionTitle')}</Button>
        </div>
      </Card>
    </div>
  )
}
