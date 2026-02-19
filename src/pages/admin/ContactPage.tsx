/**
 * Admin Contact Page
 * 
 * Contact page for organization administrators.
 * Requires authentication and org_admin role.
 */

import { ContactForm } from '../../components/contact/ContactForm'
import { AdminPageHeader, Card } from '../../components/admin'
import { ADMIN_CONTACT_SUBJECTS } from '../../types/contact'
import { useT } from '../../i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'

export default function AdminContactPage() {
  const t = useT()
  const { user, profile } = useAuth()

  const defaultName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || profile?.last_name || ''
  const defaultEmail = user?.email || ''

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('contact.title.admin')}
        subtitle={t('contact.subtitle.admin')}
      />

      <div className="oa-max-w-3xl">
        <Card>
          <div className="oa-p-6">
            <ContactForm
              surface="admin"
              subjects={ADMIN_CONTACT_SUBJECTS}
              defaultEmail={defaultEmail}
              defaultName={defaultName}
              requireName={false}
              requireEmail={false}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
