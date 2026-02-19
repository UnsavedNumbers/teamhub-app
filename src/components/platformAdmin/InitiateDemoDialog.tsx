import { useEffect, useMemo, useState } from 'react'
import type { DemoCode, DemoOrgPOC } from '@/types/demoManagement'
import { createDemoCode } from '@/data/services/demoCodeService'
import { Button, Modal, Select } from '@/components/platformAdmin'
import { useI18n } from '@/i18n/useI18n'

interface InitiateDemoDialogProps {
  open: boolean
  orgId: string
  pocs: DemoOrgPOC[]
  onClose: () => void
  onCreated?: (code: DemoCode) => void
}

function formatDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export default function InitiateDemoDialog({
  open,
  orgId,
  pocs,
  onClose,
  onCreated,
}: InitiateDemoDialogProps) {
  const { t } = useI18n()
  const [selectedPocId, setSelectedPocId] = useState<string>('')
  const [expirationDate, setExpirationDate] = useState<string>('')
  const [createdCode, setCreatedCode] = useState<DemoCode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const defaultExpiration = new Date()
    defaultExpiration.setDate(defaultExpiration.getDate() + 14)

    setSelectedPocId('')
    setExpirationDate(formatDateInputValue(defaultExpiration))
    setCreatedCode(null)
    setError(null)
  }, [open])

  const pocOptions = useMemo(
    () => [
      { value: '', label: t('platformAdmin.demoManagement.codes.noPoc') },
      ...pocs.map((poc) => ({
        value: poc.id,
        label: `${poc.first_name} ${poc.last_name} (${poc.email})`,
      })),
    ],
    [pocs, t],
  )

  const handleGenerate = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const expiresAt = new Date(`${expirationDate}T23:59:59.000Z`).toISOString()
      const code = await createDemoCode({
        demo_org_id: orgId,
        poc_id: selectedPocId || null,
        expires_at: expiresAt,
      })

      setCreatedCode(code)
      onCreated?.(code)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (): Promise<void> => {
    if (!createdCode) return

    try {
      await navigator.clipboard.writeText(createdCode.demo_code)
    } catch {
      setError(t('common.error.clipboardFailed'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('platformAdmin.demoManagement.codes.initiateTitle')}
      size="medium"
    >
      <div className="pa-stack" style={{ gap: 'var(--pa-space-3)' }}>
        <Select
          label={t('platformAdmin.demoManagement.codes.fields.poc')}
          value={selectedPocId}
          onChange={(event) => setSelectedPocId(event.target.value)}
          options={pocOptions}
        />

        <div className="pa-form-group">
          <label className="pa-label">{t('platformAdmin.demoManagement.codes.fields.expiresAt')}</label>
          <input
            className="pa-input"
            type="date"
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
          />
        </div>

        {createdCode && (
          <div className="pa-card" style={{ background: 'var(--pa-n50)' }}>
            <div className="pa-label">{t('platformAdmin.demoManagement.codes.generatedLabel')}</div>
            <div className="pa-flex pa-items-center pa-justify-between pa-gap-2">
              <code style={{ fontSize: '1.125rem', fontWeight: 700 }}>{createdCode.demo_code}</code>
              <Button variant="ghost" onClick={() => void handleCopy()}>
                {t('platformAdmin.demoManagement.codes.actions.copy')}
              </Button>
            </div>
          </div>
        )}

        {error && <div className="pa-text-danger">{error}</div>}

        <div className="pa-flex pa-justify-end pa-gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.close')}
          </Button>
          <Button onClick={() => void handleGenerate()} loading={loading}>
            {t('platformAdmin.demoManagement.codes.actions.generate')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
