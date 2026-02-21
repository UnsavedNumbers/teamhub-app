/**
 * Bulk Invite Page
 * 
 * Main page for bulk invite feature with wizard and history views
 */

import { useState } from 'react'
import { useT } from '@/i18n/useI18n'
import { AdminPageHeader } from '@/components/admin'
import BulkInviteWizard from '@/components/admin/bulkInvite/BulkInviteWizard'
import BulkInviteHistory from '@/components/admin/bulkInvite/BulkInviteHistory'
import { Button } from '@/components/admin'

export default function BulkInvitePage() {
  const t = useT()
  const [view, setView] = useState<'wizard' | 'history'>('wizard')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('admin.bulkInvite.title')}
        description={t('admin.bulkInvite.description')}
      />

      <div className="flex gap-4">
        <Button
          variant={view === 'wizard' ? 'default' : 'outline'}
          onClick={() => setView('wizard')}
        >
          {t('admin.bulkInvite.uploadFile')}
        </Button>
        <Button
          variant={view === 'history' ? 'default' : 'outline'}
          onClick={() => setView('history')}
        >
          {t('admin.bulkInvite.viewHistory')}
        </Button>
      </div>

      {view === 'wizard' && (
        <BulkInviteWizard
          onComplete={() => setView('history')}
          onCancel={() => setView('history')}
        />
      )}

      {view === 'history' && <BulkInviteHistory />}
    </div>
  )
}
