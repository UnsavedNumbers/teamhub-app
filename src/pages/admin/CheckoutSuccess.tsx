import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/platformAdmin'

export default function CheckoutSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/admin/organization/billing'), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="pa-root">
      <AdminPageHeader title={t('billing.checkoutSuccessTitle').toUpperCase()} />
      <Card style={{ maxWidth: '600px' }}>
        <div className="pa-flex pa-items-center pa-gap-4 pa-mb-6 pa-text-success">
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>check_circle</span>
          <div>
            <h3 className="pa-h3 pa-mb-1">{t('billing.checkoutSuccessTitle')}</h3>
            <p className="pa-body-m">{t('billing.checkoutSuccessBody')}</p>
          </div>
        </div>
        <div className="pa-flex pa-flex-col pa-gap-4">
          <p className="pa-body-s pa-text-muted">{t('checkout.redirecting')}</p>
          <Button onClick={() => navigate('/admin/organization/billing')}>{t('checkout.returnToBilling')}</Button>
        </div>
      </Card>
    </div>
  )
}
