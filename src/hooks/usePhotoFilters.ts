import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isValidUUID } from '../utils/uuid'

export type PhotoDensity = 'comfortable' | 'compact'

export interface PhotoFilters {
  q: string
  album: string | null
  athlete: string | null
  from: string | null
  to: string | null
  sort: string
  status: string
  org: string | null
  density: PhotoDensity
}

export interface UsePhotoFiltersOptions {
  viewKey: string
  defaultSort?: string
  allowedSorts?: string[]
  defaultStatus?: string
  allowedStatuses?: string[]
  defaultOrg?: string | null
  persistSort?: boolean
  persistOrg?: boolean
  persistDensity?: boolean
  defaultDensity?: PhotoDensity
}

type FilterUpdates = Partial<PhotoFilters>

const DEFAULT_SORT = 'recent'
const DEFAULT_STATUS = 'all'
const DEFAULT_DENSITY: PhotoDensity = 'comfortable'

function sanitizeText(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
}

function isValidDateString(value: string | null): value is string {
  if (!value) return false
  const parsed = Date.parse(value)
  return !Number.isNaN(parsed)
}

function getStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

export function usePhotoFilters(options: UsePhotoFiltersOptions) {
  const {
    viewKey,
    defaultSort = DEFAULT_SORT,
    allowedSorts,
    defaultStatus = DEFAULT_STATUS,
    allowedStatuses,
    defaultOrg = null,
    persistSort = true,
    persistOrg = true,
    persistDensity = true,
    defaultDensity = DEFAULT_DENSITY,
  } = options

  const [searchParams, setSearchParams] = useSearchParams()

  const sortStorageKey = `photoFilters:${viewKey}:sort`
  const orgStorageKey = `photoFilters:${viewKey}:org`
  const densityStorageKey = `photoFilters:${viewKey}:density`

  const filters = useMemo<PhotoFilters>(() => {
    const qParam = sanitizeText(searchParams.get('q') || '')
    const albumParam = searchParams.get('album')
    const athleteParam = searchParams.get('athlete')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const sortParam = searchParams.get('sort')
    const statusParam = searchParams.get('status')
    const orgParam = searchParams.get('org')

    const storedSort = persistSort ? getStoredValue(sortStorageKey) : null
    const storedOrg = persistOrg ? getStoredValue(orgStorageKey) : null
    const storedDensity = persistDensity ? getStoredValue(densityStorageKey) : null

    const resolvedSort = allowedSorts?.includes(sortParam || '')
      ? (sortParam as string)
      : allowedSorts?.includes(storedSort || '')
      ? (storedSort as string)
      : defaultSort

    const resolvedStatus = allowedStatuses?.includes(statusParam || '')
      ? (statusParam as string)
      : allowedStatuses?.includes(defaultStatus)
      ? defaultStatus
      : DEFAULT_STATUS

    const resolvedOrg = isValidUUID(orgParam) ? orgParam : isValidUUID(storedOrg) ? storedOrg : defaultOrg

    const resolvedDensity: PhotoDensity =
      storedDensity === 'compact' || storedDensity === 'comfortable'
        ? (storedDensity as PhotoDensity)
        : defaultDensity

    const isFavoritesAlbum = albumParam === 'favorites'

    return {
      q: qParam,
      album: isFavoritesAlbum ? 'favorites' : isValidUUID(albumParam) ? albumParam : null,
      athlete: isValidUUID(athleteParam) ? athleteParam : null,
      from: isValidDateString(fromParam) ? fromParam : null,
      to: isValidDateString(toParam) ? toParam : null,
      sort: resolvedSort,
      status: resolvedStatus,
      org: resolvedOrg,
      density: resolvedDensity,
    }
  }, [
    searchParams,
    allowedSorts,
    allowedStatuses,
    defaultSort,
    defaultStatus,
    defaultOrg,
    persistSort,
    persistOrg,
    persistDensity,
    sortStorageKey,
    orgStorageKey,
    densityStorageKey,
    defaultDensity,
  ])

  const setFilters = useCallback(
    (updates: FilterUpdates) => {
      const nextParams = new URLSearchParams(searchParams)

      const updateParam = (key: keyof PhotoFilters, value: string | null | undefined) => {
        if (value === null || value === undefined || value === '') {
          nextParams.delete(key)
        } else {
          nextParams.set(key, value)
        }
      }

      if ('q' in updates) updateParam('q', updates.q ? sanitizeText(updates.q) : '')
      if ('album' in updates) updateParam('album', updates.album || '')
      if ('athlete' in updates) updateParam('athlete', updates.athlete || '')
      if ('from' in updates) updateParam('from', updates.from || '')
      if ('to' in updates) updateParam('to', updates.to || '')
      if ('sort' in updates) updateParam('sort', updates.sort || '')
      if ('status' in updates) updateParam('status', updates.status || '')
      if ('org' in updates) updateParam('org', updates.org || '')

      if (persistSort && updates.sort) {
        setStoredValue(sortStorageKey, updates.sort)
      }

      if (persistOrg && updates.org) {
        setStoredValue(orgStorageKey, updates.org)
      }

      if (persistDensity && updates.density) {
        setStoredValue(densityStorageKey, updates.density)
      }

      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams, persistSort, persistOrg, persistDensity, sortStorageKey, orgStorageKey, densityStorageKey]
  )

  const clearFilters = useCallback(() => {
    setFilters({
      q: '',
      album: null,
      athlete: null,
      from: null,
      to: null,
      status: defaultStatus,
      org: defaultOrg,
    })
  }, [setFilters, defaultStatus, defaultOrg])

  const setDensity = useCallback(
    (density: PhotoDensity) => {
      if (persistDensity) {
        setStoredValue(densityStorageKey, density)
      }
      setFilters({ density })
    },
    [persistDensity, densityStorageKey, setFilters]
  )

  return {
    filters,
    setFilters,
    clearFilters,
    setDensity,
  }
}
