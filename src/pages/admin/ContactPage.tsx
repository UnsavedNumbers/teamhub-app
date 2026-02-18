/**
 * Admin Contact Page
 * 
 * Contact page for organization administrators.
 * Requires authentication and org_admin role.
 */

import { ContactForm } from '../../components/contact/ContactForm'
import { ADMIN_CONTACT_SUBJECTS } from '../../types/contact'
import { useT } from '../../i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import AdminLayout from '../../layouts/AdminLayout'

export default function AdminContactPage() {
  const t = useT()
  const { user, profile } = useAuth()

  const defaultName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || profile?.last_name || ''
  const defaultEmail = user?.email || ''

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('contact.title.admin')}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('contact.subtitle.admin')}
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
          <ContactForm
            surface="admin"
            subjects={ADMIN_CONTACT_SUBJECTS}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
            requireName={false}
            requireEmail={false}
          />
        </div>
      </div>
    </AdminLayout>
  )
}
