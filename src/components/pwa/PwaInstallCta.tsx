import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { usePwaInstallCta } from '@/lib/pwa/usePwaInstallCta'

interface PwaInstallCtaProps {
  buttonClassName?: string
  compactOnMobile?: boolean
  hideLabel?: boolean
  suppressOnRoutes?: RegExp[]
}

const DEFAULT_SUPPRESSED_ROUTES: RegExp[] = [
  /\/scanner/i,
  /\/checkout/i,
  /\/payment/i,
  /\/video\/[^/]+$/i,
]

export default function PwaInstallCta({
  buttonClassName,
  compactOnMobile = true,
  hideLabel = false,
  suppressOnRoutes = DEFAULT_SUPPRESSED_ROUTES,
}: PwaInstallCtaProps) {
  const location = useLocation()
  const {
    canShow,
    ctaIcon,
    ctaLabel,
    triggerInstall,
    showIosSheet,
    closeIosInstructions,
    dismissForDays,
    platform,
  } = usePwaInstallCta()

  const suppressedByRoute = useMemo(
    () => suppressOnRoutes.some((pattern) => pattern.test(location.pathname)),
    [location.pathname, suppressOnRoutes],
  )

  if (!canShow || suppressedByRoute) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={triggerInstall}
        className={buttonClassName ?? 'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'}
        aria-label={ctaLabel}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          {ctaIcon}
        </span>
        {!hideLabel && (
          <span className={compactOnMobile ? 'hidden sm:inline' : ''}>{ctaLabel}</span>
        )}
      </button>

      {showIosSheet && platform === 'ios' && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close install instructions"
            onClick={closeIosInstructions}
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add to Home Screen</h3>
              <button
                type="button"
                onClick={closeIosInstructions}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              <li>Tap the Share icon in Safari.</li>
              <li>Select <strong>Add to Home Screen</strong>.</li>
              <li>Confirm to install the app icon.</li>
            </ol>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => dismissForDays(14)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={closeIosInstructions}
                className="rounded-lg bg-[var(--org-btn-primary-bg,#137fec)] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
