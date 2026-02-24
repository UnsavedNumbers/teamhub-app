import { useI18n } from '../../i18n/useI18n'
import { DatePicker } from '../platformAdmin'
import type { PhotoFilters, PhotoDensity } from '../../hooks/usePhotoFilters'

interface FilterOption {
  value: string
  label: string
}

interface PhotoFilterBarProps {
  filters: PhotoFilters
  onFiltersChange: (updates: Partial<PhotoFilters>) => void
  onClear?: () => void
  searchPlaceholder?: string
  showSearch?: boolean
  showDateRange?: boolean
  sortOptions?: FilterOption[]
  showStatus?: boolean
  statusOptions?: FilterOption[]
  albumOptions?: FilterOption[]
  athleteOptions?: FilterOption[]
  orgOptions?: FilterOption[]
  showDensity?: boolean
  onDensityChange?: (density: PhotoDensity) => void
  searchValue?: string // Optional override for search input value (for debouncing)
}

export function PhotoFilterBar({
  filters,
  onFiltersChange,
  onClear,
  searchPlaceholder,
  showSearch = true,
  showDateRange = true,
  sortOptions = [],
  showStatus = false,
  statusOptions = [],
  albumOptions = [],
  athleteOptions = [],
  orgOptions = [],
  showDensity = false,
  onDensityChange,
  searchValue,
}: PhotoFilterBarProps) {
  const { t } = useI18n()

  // Use searchValue prop if provided (for debouncing), otherwise use filters.q
  const currentSearchValue = searchValue !== undefined ? searchValue : filters.q

  const hasActiveFilters =
    !!filters.q ||
    !!filters.album ||
    !!filters.athlete ||
    !!filters.from ||
    !!filters.to ||
    (!!filters.status && filters.status !== 'all') ||
    (!!filters.org)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {showSearch && (
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.searchLabel')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={currentSearchValue}
                onChange={(e) => onFiltersChange({ q: e.target.value })}
                placeholder={searchPlaceholder || t('photos.filters.search')}
                className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm"
              />
              {currentSearchValue && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => onFiltersChange({ q: '' })}
                  aria-label={t('photos.filters.clearSearch')}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {orgOptions.length > 0 && (
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.org')}
            </label>
            <select
              value={filters.org || ''}
              onChange={(e) => onFiltersChange({ org: e.target.value || null })}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="">{t('photos.filters.allOrgs')}</option>
              {orgOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {albumOptions.length > 0 && (
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.album')}
            </label>
            <select
              value={filters.album || ''}
              onChange={(e) => onFiltersChange({ album: e.target.value || null })}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="">{t('photos.filters.allAlbums')}</option>
              {albumOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {athleteOptions.length > 0 && (
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.athlete')}
            </label>
            <select
              value={filters.athlete || ''}
              onChange={(e) => onFiltersChange({ athlete: e.target.value || null })}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              <option value="">{t('photos.filters.allAthletes')}</option>
              {athleteOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDateRange && (
          <>
            <div className="min-w-[150px] [&_.pa-form-group]:mb-0">
              <DatePicker
                label={t('photos.filters.from')}
                value={filters.from || ''}
                onChange={(value) => onFiltersChange({ from: value || null })}
              />
            </div>
            <div className="min-w-[150px] [&_.pa-form-group]:mb-0">
              <DatePicker
                label={t('photos.filters.to')}
                value={filters.to || ''}
                minValue={filters.from || undefined}
                onChange={(value) => onFiltersChange({ to: value || null })}
              />
            </div>
          </>
        )}

        {sortOptions.length > 0 && (
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('common.sort')}
            </label>
            <select
              value={filters.sort}
              onChange={(e) => onFiltersChange({ sort: e.target.value })}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showStatus && statusOptions.length > 0 && (
          <div className="min-w-[180px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ status: e.target.value })}
              className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showDensity && onDensityChange && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.filters.density')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                  filters.density === 'comfortable'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-slate-300 text-slate-500'
                }`}
                onClick={() => onDensityChange('comfortable')}
              >
                {t('photos.filters.densityComfortable')}
              </button>
              <button
                type="button"
                className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                  filters.density === 'compact'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-slate-300 text-slate-500'
                }`}
                onClick={() => onDensityChange('compact')}
              >
                {t('photos.filters.densityCompact')}
              </button>
            </div>
          </div>
        )}

        <div className="min-w-[180px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {t('photos.filters.hideEmpty')}
          </label>
          <div className="h-11 flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hideEmpty ?? true}
                onChange={(e) => onFiltersChange({ hideEmpty: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {filters.hideEmpty ? 'Hide' : 'Show'}
              </span>
            </label>
          </div>
        </div>

        {onClear && hasActiveFilters && (
          <button
            type="button"
            className="h-11 px-4 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:text-slate-900"
            onClick={onClear}
          >
            {t('photos.filters.clearFilters')}
          </button>
        )}
      </div>
    </div>
  )
}
