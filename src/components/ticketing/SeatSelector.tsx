import { useEffect, useMemo, useState } from 'react'
import { getSeatAvailability } from '@/data/services'
import { useT } from '@/i18n/useI18n'
import type { SeatAvailabilityMap, SeatSelection } from '@/types/ticketing'
import { validateAdjacentSeats } from '@/utils/ticketingHelpers'

interface SeatSelectorProps {
  ticketTypeId: string
  quantity: number
  onSeatsSelected: (seats: SeatSelection[]) => void
}

interface SeatRow {
  id: string
  section: string
  row: string
  seat: string
  available: boolean
}

function sortSeatValue(value: string): number {
  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  return value
    .toUpperCase()
    .split('')
    .reduce((total, char) => total * 26 + (char.charCodeAt(0) - 64), 0)
}

export default function SeatSelector({ ticketTypeId, quantity, onSeatsSelected }: SeatSelectorProps) {
  const t = useT()
  const [availability, setAvailability] = useState<SeatAvailabilityMap>({})
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedRow, setSelectedRow] = useState('')
  const [selectedSeats, setSelectedSeats] = useState<SeatSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadAvailability = async () => {
      try {
        if (mounted) {
          setLoading(true)
        }
        const data = await getSeatAvailability(ticketTypeId)
        if (!mounted) {
          return
        }

        setAvailability(data)
        setError(null)
      } catch (loadError: any) {
        if (!mounted) {
          return
        }

        setError(loadError.message || t('ticketing.reservedSeating.selector.errors.loadFailed'))
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadAvailability()
    const interval = window.setInterval(loadAvailability, 10000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [ticketTypeId, t])

  const seats = useMemo(() => {
    return Object.entries(availability).map(([id, value]) => ({
      id,
      section: value.section,
      row: value.row,
      seat: value.seat,
      available: value.available,
    }))
  }, [availability])

  const sections = useMemo(() => {
    return Array.from(new Set(seats.map((seat) => seat.section))).sort((left, right) => left.localeCompare(right))
  }, [seats])

  useEffect(() => {
    if (selectedSection && sections.includes(selectedSection)) {
      return
    }

    setSelectedSection(sections[0] ?? '')
  }, [sections, selectedSection])

  const rows = useMemo(() => {
    return Array.from(
      new Set(
        seats
          .filter((seat) => seat.section === selectedSection)
          .map((seat) => seat.row),
      ),
    ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  }, [seats, selectedSection])

  useEffect(() => {
    if (selectedRow && rows.includes(selectedRow)) {
      return
    }

    setSelectedRow(rows[0] ?? '')
  }, [rows, selectedRow])

  const rowSeats = useMemo(() => {
    return seats
      .filter((seat) => seat.section === selectedSection && seat.row === selectedRow)
      .sort((left, right) => sortSeatValue(left.seat) - sortSeatValue(right.seat))
  }, [seats, selectedSection, selectedRow])

  useEffect(() => {
    const stillValidSelections = selectedSeats.filter((selection) => {
      const current = availability[selection.seat_map_section_id]
      return Boolean(current?.available)
    })

    if (stillValidSelections.length !== selectedSeats.length) {
      setSelectedSeats(stillValidSelections)
      onSeatsSelected(stillValidSelections)
    }
  }, [availability, onSeatsSelected, selectedSeats])

  const buildSeatSelection = (seat: SeatRow): SeatSelection => ({
    seat_map_section_id: seat.id,
    section: seat.section,
    row: seat.row,
    seat: seat.seat,
  })

  const getAdjacentBlock = (startIndex: number): SeatRow[] => {
    const block = rowSeats.slice(startIndex, startIndex + quantity)
    if (block.length !== quantity) {
      return []
    }

    if (block.some((seat) => !seat.available)) {
      return []
    }

    const values = block.map((seat) => sortSeatValue(seat.seat))
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] - values[index - 1] !== 1) {
        return []
      }
    }

    return block
  }

  const isSelected = (seatId: string) => selectedSeats.some((selection) => selection.seat_map_section_id === seatId)

  const onSeatClick = (seat: SeatRow, index: number) => {
    if (quantity <= 1) {
      const next = isSelected(seat.id) ? [] : [buildSeatSelection(seat)]
      setSelectedSeats(next)
      onSeatsSelected(next)
      return
    }

    if (isSelected(seat.id)) {
      setSelectedSeats([])
      onSeatsSelected([])
      return
    }

    const adjacentBlock = getAdjacentBlock(index)
    if (adjacentBlock.length !== quantity) {
      setError(t('ticketing.reservedSeating.selector.errors.adjacentRequired'))
      return
    }

    const nextSelections = adjacentBlock.map((blockSeat) => buildSeatSelection(blockSeat))
    if (!validateAdjacentSeats(nextSelections)) {
      setError(t('ticketing.reservedSeating.selector.errors.adjacentRequired'))
      return
    }

    setError(null)
    setSelectedSeats(nextSelections)
    onSeatsSelected(nextSelections)
  }

  const summary = useMemo(() => {
    if (selectedSeats.length === 0) {
      return t('ticketing.reservedSeating.selector.noneSelected')
    }

    const sorted = [...selectedSeats].sort((left, right) => sortSeatValue(left.seat) - sortSeatValue(right.seat))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]

    if (sorted.length === 1) {
      return t('ticketing.reservedSeating.selector.summarySingle', {
        section: first.section,
        row: first.row,
        seat: first.seat,
      })
    }

    return t('ticketing.reservedSeating.selector.summaryRange', {
      section: first.section,
      row: first.row,
      seatStart: first.seat,
      seatEnd: last.seat,
    })
  }, [selectedSeats, t])

  if (loading) {
    return <p className="text-sm text-gray-500">{t('ticketing.reservedSeating.selector.loading')}</p>
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            {t('ticketing.reservedSeating.selector.section')}
          </label>
          <select
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            {t('ticketing.reservedSeating.selector.row')}
          </label>
          <select
            value={selectedRow}
            onChange={(event) => setSelectedRow(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            {rows.map((row) => (
              <option key={row} value={row}>
                {row}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {rowSeats.map((seat, index) => {
          const selected = isSelected(seat.id)
          const selectable = quantity <= 1 ? seat.available : getAdjacentBlock(index).length === quantity

          return (
            <button
              key={seat.id}
              type="button"
              onClick={() => onSeatClick(seat, index)}
              disabled={!selected && (!seat.available || !selectable)}
              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : seat.available && selectable
                  ? 'border-green-600 text-green-700 hover:bg-green-50'
                  : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400'
              }`}
            >
              {seat.seat}
            </button>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <p className="text-sm text-gray-700">{summary}</p>
    </div>
  )
}

