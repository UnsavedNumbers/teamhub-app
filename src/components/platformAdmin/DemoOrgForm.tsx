import { useEffect, useMemo, useState } from 'react'
import type { CreateDemoOrgInput, DemoOrganization } from '@/types/demoManagement'
import { SPORT_CODES, SPORT_NAMES, type SportCode } from '@/types/sports'
import { Modal, Button, Input } from '@/components/platformAdmin'
import { useI18n } from '@/i18n/useI18n'

interface DemoOrgFormProps {
  open: boolean
  initialValue?: DemoOrganization | null
  loading?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (input: CreateDemoOrgInput) => Promise<void> | void
}

interface FormState {
  name: string
  city: string
  state: string
  country: string
  timezone: string
  org_type: string
  notes: string
  sports_sponsored: SportCode[]
}

function defaultFormState(): FormState {
  return {
    name: '',
    city: '',
    state: '',
    country: 'US',
    timezone: 'America/New_York',
    org_type: '',
    notes: '',
    sports_sponsored: [],
  }
}

export default function DemoOrgForm({
  open,
  initialValue,
  loading = false,
  error = null,
  onClose,
  onSubmit,
}: DemoOrgFormProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(defaultFormState)
  const [searchSports, setSearchSports] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    if (initialValue) {
      setForm({
        name: initialValue.name,
        city: initialValue.city ?? '',
        state: initialValue.state ?? '',
        country: initialValue.country,
        timezone: initialValue.timezone,
        org_type: initialValue.org_type ?? '',
        notes: initialValue.notes ?? '',
        sports_sponsored: initialValue.sports_sponsored,
      })
      return
    }

    setForm(defaultFormState())
    setSearchSports('')
    setFormError(null)
  }, [open, initialValue])

  const visibleSports = useMemo(() => {
    const normalizedSearch = searchSports.trim().toLowerCase()
    if (!normalizedSearch) return SPORT_CODES

    return SPORT_CODES.filter((sportCode) => {
      const sportName = SPORT_NAMES[sportCode].toLowerCase()
      return sportName.includes(normalizedSearch) || sportCode.includes(normalizedSearch)
    })
  }, [searchSports])

  const isEditMode = Boolean(initialValue)

  const handleSportToggle = (sportCode: SportCode): void => {
    setForm((previous) => {
      const exists = previous.sports_sponsored.includes(sportCode)
      if (exists) {
        return {
          ...previous,
          sports_sponsored: previous.sports_sponsored.filter((code) => code !== sportCode),
        }
      }

      return {
        ...previous,
        sports_sponsored: [...previous.sports_sponsored, sportCode],
      }
    })
  }

  const handleSubmit = async (): Promise<void> => {
    setFormError(null)

    if (!form.name.trim()) {
      setFormError(t('platformAdmin.demoManagement.form.errors.nameRequired'))
      return
    }

    if (!form.timezone.trim()) {
      setFormError(t('platformAdmin.demoManagement.form.errors.timezoneRequired'))
      return
    }

    if (form.sports_sponsored.length === 0) {
      setFormError(t('platformAdmin.demoManagement.form.errors.sportsRequired'))
      return
    }

    await onSubmit({
      name: form.name.trim(),
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || 'US',
      timezone: form.timezone.trim(),
      org_type: form.org_type.trim() || null,
      notes: form.notes.trim() || null,
      sports_sponsored: form.sports_sponsored,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEditMode
          ? t('platformAdmin.demoManagement.form.editTitle')
          : t('platformAdmin.demoManagement.form.createTitle')
      }
      size="large"
    >
      <div className="pa-stack" style={{ gap: 'var(--pa-space-4)' }}>
        <div className="pa-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--pa-space-3)' }}>
          <Input
            label={t('platformAdmin.demoManagement.form.fields.name')}
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            required
          />
          <Input
            label={t('platformAdmin.demoManagement.form.fields.timezone')}
            value={form.timezone}
            onChange={(event) => setForm((previous) => ({ ...previous, timezone: event.target.value }))}
            required
          />
          <Input
            label={t('platformAdmin.demoManagement.form.fields.city')}
            value={form.city}
            onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))}
          />
          <Input
            label={t('platformAdmin.demoManagement.form.fields.state')}
            value={form.state}
            onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value }))}
          />
          <Input
            label={t('platformAdmin.demoManagement.form.fields.country')}
            value={form.country}
            onChange={(event) => setForm((previous) => ({ ...previous, country: event.target.value }))}
          />
          <Input
            label={t('platformAdmin.demoManagement.form.fields.orgType')}
            value={form.org_type}
            onChange={(event) => setForm((previous) => ({ ...previous, org_type: event.target.value }))}
          />
        </div>

        <div className="pa-form-group">
          <label className="pa-label">{t('platformAdmin.demoManagement.form.fields.notes')}</label>
          <textarea
            className="pa-input"
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
          />
        </div>

        <div className="pa-form-group">
          <label className="pa-label">{t('platformAdmin.demoManagement.form.fields.sports')}</label>

          <div className="pa-flex pa-gap-2 pa-mb-2">
            <Input
              value={searchSports}
              onChange={(event) => setSearchSports(event.target.value)}
              placeholder={t('platformAdmin.demoManagement.form.searchSportsPlaceholder')}
            />
            <Button
              variant="ghost"
              onClick={() => setForm((previous) => ({ ...previous, sports_sponsored: [...SPORT_CODES] }))}
            >
              {t('platformAdmin.demoManagement.form.selectAll')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setForm((previous) => ({ ...previous, sports_sponsored: [] }))}
            >
              {t('platformAdmin.demoManagement.form.clearSports')}
            </Button>
          </div>

          <div
            className="pa-grid"
            style={{
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'var(--pa-space-2)',
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--pa-n200)',
              borderRadius: 'var(--pa-radius-sm)',
              padding: 'var(--pa-space-3)',
            }}
          >
            {visibleSports.map((sportCode) => {
              const checked = form.sports_sponsored.includes(sportCode)
              return (
                <label key={sportCode} className="pa-flex pa-items-center pa-gap-2" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleSportToggle(sportCode)}
                  />
                  <span>{SPORT_NAMES[sportCode]}</span>
                </label>
              )
            })}
          </div>
        </div>

        {(formError || error) && <div className="pa-text-danger">{formError ?? error}</div>}

        <div className="pa-flex pa-justify-end pa-gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEditMode
              ? t('platformAdmin.demoManagement.form.actions.save')
              : t('platformAdmin.demoManagement.form.actions.create')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
