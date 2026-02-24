import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '../../../utils/cn'
import { getSportImagePath, getDefaultImagePath, getSportImageAlt } from '../../../utils/sportImages'
import type { SportInfo } from '../../../utils/sportContext'

interface ContextHeroProps {
  headline: string
  subtext: string
  /** Optional badges (e.g. "Unread announcements", "Outstanding balance") */
  badges?: { label: string; href?: string }[]
  /** Optional primary CTA */
  primaryAction?: { label: string; href: string }
  /** Optional secondary actions */
  secondaryActions?: { label: string; href: string; icon?: 'calendar' | 'travel' }[]
  /** Optional sport info for background image */
  sport?: SportInfo | null
  className?: string
}

/**
 * Hero context panel below action cards (Guardian or Athlete variant).
 * Uses sport image background (no gradients).
 */
export function ContextHero({
  headline,
  subtext,
  badges,
  primaryAction,
  secondaryActions,
  sport,
  className,
}: ContextHeroProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imagePath, setImagePath] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const sportName = sport?.name || null
    const path = sportName
      ? getSportImagePath(sportName, 'card', false)
      : getDefaultImagePath('card', false)
    setImagePath(path)
    setImageLoaded(false)
    setImageError(false)
  }, [sport?.name])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Left: Welcome Message */}
        <div className="flex flex-1 flex-col justify-center p-8 lg:p-12">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
            {headline}
          </h2>
          <p className="mt-3 text-lg font-medium text-slate-700 dark:text-slate-300 lg:text-xl">
            {subtext}
          </p>
          {badges && badges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {badges.map((b) =>
                b.href ? (
                  <Link
                    key={b.label}
                    to={b.href}
                    className="rounded-full bg-[var(--org-btn-primary-bg)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span
                    key={b.label}
                    className="rounded-full bg-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {b.label}
                  </span>
                )
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {primaryAction && (
              <Link
                to={primaryAction.href}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--org-btn-primary-bg)] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                <Calendar className="h-5 w-5" />
                {primaryAction.label}
              </Link>
            )}
            {secondaryActions?.map((a) => (
              <Link
                key={a.label}
                to={a.href}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {a.icon === 'travel' ? <MapPin className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Large Picture */}
        <div className="relative h-64 w-full lg:h-auto lg:w-2/5">
          {imagePath && !imageError ? (
            <>
              <img
                ref={imgRef}
                src={imagePath}
                alt={getSportImageAlt(sport?.name || null, 'card')}
                className={cn(
                  'h-full w-full object-cover transition-opacity duration-500',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800" />
              )}
            </>
          ) : (
            <div className="h-full w-full bg-slate-100 dark:bg-slate-800" />
          )}
        </div>
      </div>
    </div>
  )
}
