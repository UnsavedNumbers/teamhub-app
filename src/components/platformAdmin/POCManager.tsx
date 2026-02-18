import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CreateDemoPOCInput, DemoOrgPOC, UpdateDemoPOCInput } from '@/types/demoManagement'
import { addPOC, listPOCs, removePOC, setPrimaryPOC, updatePOC } from '@/data/services/demoOrgService'
import { Button, Input, Modal } from '@/components/platformAdmin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { useI18n } from '@/i18n/useI18n'

interface POCManagerProps {
  orgId: string
}

interface PocFormState {
  first_name: string
  last_name: string
  title: string
  email: string
  phone: string
  notes: string
  is_primary: boolean
}

function defaultPocFormState(): PocFormState {
  return {
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    phone: '',
    notes: '',
    is_primary: false,
  }
}

export default function POCManager({ orgId }: POCManagerProps) {
  const { t } = useI18n()
  const [pocs, setPocs] = useState<DemoOrgPOC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPoc, setEditingPoc] = useState<DemoOrgPOC | null>(null)
  const [pocToDelete, setPocToDelete] = useState<DemoOrgPOC | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PocFormState>(defaultPocFormState)

  const loadPocs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const rows = await listPOCs(orgId)
      setPocs(rows)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.loadFailed'))
      setPocs([])
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => {
    void loadPocs()
  }, [loadPocs])

  const sortedPocs = useMemo(
    () => [...pocs].sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
    [pocs],
  )

  const openCreateModal = (): void => {
    setEditingPoc(null)
    setForm(defaultPocFormState())
    setError(null)
    setModalOpen(true)
  }

  const openEditModal = (poc: DemoOrgPOC): void => {
    setEditingPoc(poc)
    setForm({
      first_name: poc.first_name,
      last_name: poc.last_name,
      title: poc.title ?? '',
      email: poc.email,
      phone: poc.phone ?? '',
      notes: poc.notes ?? '',
      is_primary: poc.is_primary,
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)

    const basePayload: CreateDemoPOCInput & UpdateDemoPOCInput = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      title: form.title.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      is_primary: form.is_primary,
    }

    try {
      if (editingPoc) {
        await updatePOC(orgId, editingPoc.id, basePayload)
      } else {
        await addPOC(orgId, basePayload)
      }

      setModalOpen(false)
      await loadPocs()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (poc: DemoOrgPOC): Promise<void> => {
    setError(null)
    try {
      await removePOC(orgId, poc.id)
      await loadPocs()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    }
  }

  const handleSetPrimary = async (poc: DemoOrgPOC): Promise<void> => {
    setError(null)
    try {
      await setPrimaryPOC(orgId, poc.id)
      await loadPocs()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    }
  }

  return (
    <div className="pa-stack" style={{ gap: 'var(--pa-space-4)' }}>
      <div className="pa-flex pa-justify-between pa-items-center">
        <h3 className="pa-h3">{t('platformAdmin.demoManagement.pocs.title')}</h3>
        <Button onClick={openCreateModal} icon="add">
          {t('platformAdmin.demoManagement.pocs.actions.add')}
        </Button>
      </div>

      {error && <div className="pa-text-danger">{error}</div>}

      {loading ? (
        <div>{t('common.loading')}</div>
      ) : sortedPocs.length === 0 ? (
        <div>{t('platformAdmin.demoManagement.pocs.empty')}</div>
      ) : (
        <div className="pa-stack" style={{ gap: 'var(--pa-space-2)' }}>
          {sortedPocs.map((poc) => (
            <div
              key={poc.id}
              className="pa-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--pa-space-3)',
              }}
            >
              <div>
                <div className="pa-text-strong">
                  {poc.first_name} {poc.last_name}
                  {poc.is_primary && (
                    <span className="pa-badge pa-badge--success" style={{ marginLeft: 'var(--pa-space-2)' }}>
                      {t('platformAdmin.demoManagement.pocs.primary')}
                    </span>
                  )}
                </div>
                <div>{poc.email}</div>
                {poc.title && <div>{poc.title}</div>}
              </div>

              <div className="pa-flex pa-gap-2">
                {!poc.is_primary && (
                  <Button variant="ghost" onClick={() => void handleSetPrimary(poc)}>
                    {t('platformAdmin.demoManagement.pocs.actions.makePrimary')}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => openEditModal(poc)}>
                  {t('common.edit')}
                </Button>
                <Button variant="ghost" onClick={() => setPocToDelete(poc)}>
                  {t('common.remove')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingPoc
            ? t('platformAdmin.demoManagement.pocs.editTitle')
            : t('platformAdmin.demoManagement.pocs.createTitle')
        }
      >
        <div className="pa-stack" style={{ gap: 'var(--pa-space-3)' }}>
          <Input
            label={t('platformAdmin.demoManagement.pocs.fields.firstName')}
            value={form.first_name}
            onChange={(event) => setForm((previous) => ({ ...previous, first_name: event.target.value }))}
            required
          />
          <Input
            label={t('platformAdmin.demoManagement.pocs.fields.lastName')}
            value={form.last_name}
            onChange={(event) => setForm((previous) => ({ ...previous, last_name: event.target.value }))}
            required
          />
          <Input
            label={t('platformAdmin.demoManagement.pocs.fields.title')}
            value={form.title}
            onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
          />
          <Input
            label={t('platformAdmin.demoManagement.pocs.fields.email')}
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            required
          />
          <Input
            label={t('platformAdmin.demoManagement.pocs.fields.phone')}
            value={form.phone}
            onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
          />

          <label className="pa-flex pa-items-center pa-gap-2">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(event) => setForm((previous) => ({ ...previous, is_primary: event.target.checked }))}
            />
            <span>{t('platformAdmin.demoManagement.pocs.fields.isPrimary')}</span>
          </label>

          <div className="pa-flex pa-justify-end pa-gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              {editingPoc
                ? t('platformAdmin.demoManagement.pocs.actions.save')
                : t('platformAdmin.demoManagement.pocs.actions.create')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pocToDelete !== null}
        title={t('common.remove')}
        description={t('platformAdmin.demoManagement.pocs.confirmDelete')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          const poc = pocToDelete
          setPocToDelete(null)
          if (poc) {
            void confirmDelete(poc)
          }
        }}
        onCancel={() => setPocToDelete(null)}
      />
    </div>
  )
}
