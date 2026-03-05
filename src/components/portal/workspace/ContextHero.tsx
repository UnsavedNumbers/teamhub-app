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
      ? getSportImagePath(sportName, 'hero', false)
      : getDefaultImagePath('hero', false)
    setImagePath(path)
    setImageLoaded(false)
    setImageError(false)
  }, [sport?.name])

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl bg-gray-950',
        className
      )}
    >
      <div className="absolute inset-0">
        {imagePath && !imageError ? (
          <>
            <img
              ref={imgRef}
              src={imagePath}
              alt={getSportImageAlt(sport?.name || null, 'hero')}
              className={cn(
                'h-full w-full object-cover transition-opacity duration-500',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
            {!imageLoaded && <div className="absolute inset-0 bg-gray-800" />}
          </>
        ) : (
          <div className="h-full w-full bg-gray-800" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-900/65 to-gray-950/35" />

      <div className="relative flex min-h-[320px] flex-col justify-end p-7 sm:p-10 lg:min-h-[380px] lg:p-12">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            {headline}
          </h2>
          <p className="mt-3 text-base font-medium text-gray-200 sm:text-lg lg:text-xl">
            {subtext}
          </p>
          {badges && badges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {badges.map((b) =>
                b.href ? (
                  <Link
                    key={b.label}
                    to={b.href}
                    className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span
                    key={b.label}
                    className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-100"
                  >
                    {b.label}
                  </span>
                )
              )}
            </div>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {primaryAction && (
              <Link
                to={primaryAction.href}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-gray-900 transition-colors hover:bg-gray-100"
              >
                <Calendar className="h-5 w-5 text-gray-700" />
                {primaryAction.label}
              </Link>
            )}
            {secondaryActions?.map((a) => (
              <Link
                key={a.label}
                to={a.href}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {a.icon === 'travel' ? <MapPin className="h-5 w-5 text-gray-200" /> : <Calendar className="h-5 w-5 text-gray-200" />}
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

