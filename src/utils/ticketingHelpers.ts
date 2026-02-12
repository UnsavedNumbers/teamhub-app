import type { SeatSelection } from '@/types/ticketing'

function toComparableSeatValue(seat: string): number | null {
  if (/^\d+$/.test(seat)) {
    return Number(seat)
  }

  if (/^[A-Za-z]+$/.test(seat)) {
    return seat
      .toUpperCase()
      .split('')
      .reduce((total, char) => total * 26 + (char.charCodeAt(0) - 64), 0)
  }

  return null
}

export function validateAdjacentSeats(selections: SeatSelection[]): boolean {
  if (selections.length <= 1) {
    return true
  }

  const [first] = selections
  const sameSectionAndRow = selections.every(
    (selection) => selection.section === first.section && selection.row === first.row,
  )

  if (!sameSectionAndRow) {
    return false
  }

  const sortable = selections
    .map((selection) => toComparableSeatValue(selection.seat))
    .filter((value): value is number => value !== null)

  if (sortable.length !== selections.length) {
    return false
  }

  sortable.sort((a, b) => a - b)

  for (let index = 1; index < sortable.length; index += 1) {
    if (sortable[index] - sortable[index - 1] !== 1) {
      return false
    }
  }

  return true
}

