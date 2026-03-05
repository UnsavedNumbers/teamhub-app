/**
 * Portal Contact Page
 * 
 * Contact page for portal users (parents/guardians and athletes).
 * Requires authentication.
 */

import { ContactForm } from '../../components/contact/ContactForm'
import { PORTAL_CONTACT_SUBJECTS } from '../../types/contact'
import { useT } from '../../i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import PortalLayout from '../../components/portal/PortalLayout'

export default function PortalContactPage() {
  const t = useT()
  const { user, profile } = useAuth()

  const defaultName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || profile?.last_name || ''
  const defaultEmail = user?.email || ''

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('contact.title.portal')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('contact.subtitle.portal')}
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <ContactForm
            surface="portal"
            subjects={PORTAL_CONTACT_SUBJECTS}
            defaultEmail={defaultEmail}
            defaultName={defaultName}
            requireName={false}
            requireEmail={false}
          />
        </div>
      </div>
    </PortalLayout>
  )
}

