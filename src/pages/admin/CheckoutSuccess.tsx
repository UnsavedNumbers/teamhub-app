import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'
import { 
  AdminPageHeader, 
  Card, 
  Button 
} from '../../components/admin'

export default function CheckoutSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/admin/organization/billing'), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="oa-root">
      <AdminPageHeader title={t('billing.checkoutSuccessTitle').toUpperCase()} />
      <Card style={{ maxWidth: '600px' }}>
        <div className="oa-flex oa-items-center oa-gap-4 oa-mb-6 oa-text-success">
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>check_circle</span>
          <div>
            <h3 className="oa-h3 oa-mb-1">{t('billing.checkoutSuccessTitle')}</h3>
            <p className="oa-body-m">{t('billing.checkoutSuccessBody')}</p>
          </div>
        </div>
        <div className="oa-flex oa-flex-col oa-gap-4">
          <p className="oa-body-s oa-text-muted">{t('checkout.redirecting')}</p>
          <Button onClick={() => navigate('/admin/organization/billing')}>{t('checkout.returnToBilling')}</Button>
        </div>
      </Card>
    </div>
  )
}
