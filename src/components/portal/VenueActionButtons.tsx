import Button from './Button'
import Icon from './Icon'

interface VenueMapActionButtonsProps {
  googleUrl?: string | null
  appleUrl?: string | null
  wazeUrl?: string | null
  onCopyAddress: () => void
  copied: boolean
  copyError?: string | null
  fullWidth?: boolean
}

interface VenueRideShareButtonsProps {
  uberUrl?: string | null
  lyftUrl?: string | null
  fullWidth?: boolean
}

function LinkButton({
  href,
  label,
  icon,
  className,
  variant = 'secondary',
  fullWidth = true,
}: {
  href?: string | null
  label: string
  icon: string
  className?: string
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
}) {
  const buttonClasses = `${fullWidth ? 'w-full justify-center' : ''} text-sm px-4 py-2 ${className ?? ''}`.trim()

  if (!href) {
    return (
      <Button variant={variant} className={buttonClasses} disabled>
        <Icon name={icon} size="text-sm" className="mr-2" />
        {label}
      </Button>
    )
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={fullWidth ? 'block w-full' : undefined}>
      <Button variant={variant} className={buttonClasses}>
        <Icon name={icon} size="text-sm" className="mr-2" />
        {label}
      </Button>
    </a>
  )
}

export function VenueMapActionButtons({
  googleUrl,
  appleUrl,
  wazeUrl,
  onCopyAddress,
  copied,
  copyError,
  fullWidth = true,
}: VenueMapActionButtonsProps) {
  const groupClass = fullWidth ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'

  return (
    <div className={groupClass}>
      <LinkButton href={googleUrl} label="Google Maps" icon="map" variant="primary" fullWidth={fullWidth} />
      <LinkButton href={appleUrl} label="Apple Maps" icon="map" fullWidth={fullWidth} />
      <LinkButton href={wazeUrl} label="Waze" icon="navigation" fullWidth={fullWidth} />

      <Button variant="secondary" className={`${fullWidth ? 'w-full justify-center' : ''} text-sm px-4 py-2`} onClick={onCopyAddress}>
        <Icon name={copied ? 'check' : 'content_copy'} size="text-sm" className="mr-2" />
        {copied ? 'Copied!' : 'Copy Address'}
      </Button>

      {copyError && (
        <span className="text-xs text-red-500">{copyError}</span>
      )}
    </div>
  )
}

export function VenueRideShareButtons({ uberUrl, lyftUrl, fullWidth = true }: VenueRideShareButtonsProps) {
  const groupClass = fullWidth ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'

  return (
    <div className={groupClass}>
      <LinkButton
        href={uberUrl}
        label="Uber"
        icon="local_taxi"
        fullWidth={fullWidth}
        className="border-black bg-black text-white hover:bg-black/90 hover:text-white dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
      />
      <LinkButton
        href={lyftUrl}
        label="Lyft"
        icon="local_taxi"
        fullWidth={fullWidth}
        className="border-[#FF00BF] bg-[#FF00BF] text-black hover:bg-[#FF00BF]/90 hover:text-black dark:border-[#FF00BF] dark:bg-[#FF00BF] dark:text-white dark:hover:bg-[#FF00BF]/90"
      />
    </div>
  )
}
