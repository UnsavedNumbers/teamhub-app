import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { useT } from '../../i18n/useI18n'
import type { CalendarExportEvent } from '../../features/calendar/addToCalendar'
import { buildCalendarExportLinks } from '../../features/calendar/addToCalendar'

interface AddToCalendarActionsProps {
  event: CalendarExportEvent
  className?: string
  buttonClassName?: string
  layout?: 'stack' | 'inline'
  googleVariant?: 'primary' | 'secondary'
  icsVariant?: 'primary' | 'secondary'
}

export function AddToCalendarActions({
  event,
  className = '',
  buttonClassName = '',
  layout = 'stack',
  googleVariant = 'primary',
  icsVariant = 'secondary',
}: AddToCalendarActionsProps) {
  const t = useT()
  const { googleUrl, icsUrl, filename } = buildCalendarExportLinks(event)
  const containerClassName = layout === 'inline'
    ? 'flex flex-wrap gap-3'
    : 'flex flex-col gap-3'

  return (
    <div className={`${containerClassName} ${className}`.trim()}>
      {googleUrl ? (
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className={layout === 'inline' ? 'inline-flex' : 'block'}
        >
          <Button variant={googleVariant} className={buttonClassName}>
            <Icon name="event" size="text-sm" className="mr-2" />
            {t('calendar.event.googleCalendar')}
          </Button>
        </a>
      ) : (
        <Button variant={googleVariant} disabled className={buttonClassName}>
          <Icon name="event" size="text-sm" className="mr-2" />
          {t('calendar.event.googleCalendar')}
        </Button>
      )}

      {icsUrl ? (
        <a
          href={icsUrl}
          download={filename}
          className={layout === 'inline' ? 'inline-flex' : 'block'}
        >
          <Button variant={icsVariant} className={buttonClassName}>
            <Icon name="download" size="text-sm" className="mr-2" />
            {t('calendar.event.appleCalendar')}
          </Button>
        </a>
      ) : (
        <Button variant={icsVariant} disabled className={buttonClassName}>
          <Icon name="download" size="text-sm" className="mr-2" />
          {t('calendar.event.appleCalendar')}
        </Button>
      )}
    </div>
  )
}

export default AddToCalendarActions
