import { useMemo, useState, type FormEvent } from 'react'
import { useT } from '@/i18n/useI18n'
import type { BulkSeatConfig } from '@/types/ticketing'

interface SeatMapBulkGeneratorProps {
  onGenerate: (config: BulkSeatConfig) => Promise<unknown> | void
  loading?: boolean
}

export default function SeatMapBulkGenerator({ onGenerate, loading = false }: SeatMapBulkGeneratorProps) {
  const t = useT()
  const [sectionName, setSectionName] = useState('')
  const [rowStart, setRowStart] = useState(1)
  const [rowEnd, setRowEnd] = useState(1)
  const [seatStart, setSeatStart] = useState(1)
  const [seatEnd, setSeatEnd] = useState(1)
  const [accessible, setAccessible] = useState(false)
  const [obstructed, setObstructed] = useState(false)
  const [companionRequired, setCompanionRequired] = useState(false)
  const [vip, setVip] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSeats = useMemo(() => {
    const rows = rowEnd - rowStart + 1
    const seats = seatEnd - seatStart + 1
    if (rows <= 0 || seats <= 0) {
      return 0
    }
    return rows * seats
  }, [rowStart, rowEnd, seatStart, seatEnd])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!sectionName.trim()) {
      setError(t('ticketing.reservedSeating.bulkGenerator.errors.sectionRequired'))
      return
    }

    if (rowEnd < rowStart) {
      setError(t('ticketing.reservedSeating.bulkGenerator.errors.rowRangeInvalid'))
      return
    }

    if (seatEnd < seatStart) {
      setError(t('ticketing.reservedSeating.bulkGenerator.errors.seatRangeInvalid'))
      return
    }

    setError(null)

    await onGenerate({
      section_name: sectionName.trim(),
      row_start: rowStart,
      row_end: rowEnd,
      seat_start: seatStart,
      seat_end: seatEnd,
      seat_attributes: {
        accessible,
        obstructed_view: obstructed,
        companion_required: companionRequired,
        vip,
      },
    })
  }

  return (
    <form onSubmit={onSubmit} className="oa-space-y-4">
      {error && (
        <div className="oa-card oa-card--bordered oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
          {error}
        </div>
      )}

      <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
        <div>
          <label className="oa-label">{t('ticketing.reservedSeating.bulkGenerator.sectionName')}</label>
          <input
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            className="oa-input"
            placeholder={t('ticketing.reservedSeating.bulkGenerator.sectionPlaceholder')}
            required
          />
        </div>

        <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
          <div>
            <label className="oa-label">{t('ticketing.reservedSeating.bulkGenerator.rowStart')}</label>
            <input
              type="number"
              min={1}
              value={rowStart}
              onChange={(event) => setRowStart(Number(event.target.value))}
              className="oa-input"
              required
            />
          </div>
          <div>
            <label className="oa-label">{t('ticketing.reservedSeating.bulkGenerator.rowEnd')}</label>
            <input
              type="number"
              min={1}
              value={rowEnd}
              onChange={(event) => setRowEnd(Number(event.target.value))}
              className="oa-input"
              required
            />
          </div>
        </div>

        <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
          <div>
            <label className="oa-label">{t('ticketing.reservedSeating.bulkGenerator.seatStart')}</label>
            <input
              type="number"
              min={1}
              value={seatStart}
              onChange={(event) => setSeatStart(Number(event.target.value))}
              className="oa-input"
              required
            />
          </div>
          <div>
            <label className="oa-label">{t('ticketing.reservedSeating.bulkGenerator.seatEnd')}</label>
            <input
              type="number"
              min={1}
              value={seatEnd}
              onChange={(event) => setSeatEnd(Number(event.target.value))}
              className="oa-input"
              required
            />
          </div>
        </div>
      </div>

      <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
        <label className="oa-checkbox-wrapper">
          <input type="checkbox" checked={accessible} onChange={(event) => setAccessible(event.target.checked)} />
          <span>{t('ticketing.reservedSeating.bulkGenerator.attributes.accessible')}</span>
        </label>
        <label className="oa-checkbox-wrapper">
          <input type="checkbox" checked={obstructed} onChange={(event) => setObstructed(event.target.checked)} />
          <span>{t('ticketing.reservedSeating.bulkGenerator.attributes.obstructed')}</span>
        </label>
        <label className="oa-checkbox-wrapper">
          <input
            type="checkbox"
            checked={companionRequired}
            onChange={(event) => setCompanionRequired(event.target.checked)}
          />
          <span>{t('ticketing.reservedSeating.bulkGenerator.attributes.companionRequired')}</span>
        </label>
        <label className="oa-checkbox-wrapper">
          <input type="checkbox" checked={vip} onChange={(event) => setVip(event.target.checked)} />
          <span>{t('ticketing.reservedSeating.bulkGenerator.attributes.vip')}</span>
        </label>
      </div>

      <div className="oa-flex oa-justify-between oa-items-center oa-gap-4">
        <p className="oa-text-muted">
          {t('ticketing.reservedSeating.bulkGenerator.preview', { count: totalSeats })}
        </p>
        <button type="submit" className="oa-btn oa-btn-primary" disabled={loading || totalSeats <= 0}>
          {loading
            ? t('ticketing.reservedSeating.bulkGenerator.generating')
            : t('ticketing.reservedSeating.bulkGenerator.generate')}
        </button>
      </div>
    </form>
  )
}

