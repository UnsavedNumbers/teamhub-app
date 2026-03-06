import { cn } from '@/utils/cn'
import { useMobile } from '@/hooks/useMobile'

export interface GroupedListSection<T> {
  id: string
  header?: string
  items: T[]
}

interface GroupedListProps<T> {
  sections: GroupedListSection<T>[]
  renderItem: (item: T, sectionId: string, index: number) => React.ReactNode
  className?: string
  stickyHeaders?: boolean
}

export default function GroupedList<T>({
  sections,
  renderItem,
  className,
  stickyHeaders = false,
}: GroupedListProps<T>) {
  const isMobile = useMobile()

  if (!isMobile) {
    return (
      <div className={cn(className)}>
        {sections.map((section) => (
          <section key={section.id}>
            {section.header ? (
              <header className="mb-3 text-[13px] font-medium tracking-normal text-gray-700 dark:text-gray-300 leading-[1.2]">
                {section.header}
              </header>
            ) : null}
            <div className="space-y-4">
              {section.items.map((item, index) => (
                <div key={`${section.id}-${index}`}>
                  {renderItem(item, section.id, index)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('ios-grouped-list', className)}>
      {sections.map((section) => (
        <section key={section.id} className="ios-grouped-list__section">
          {section.header ? (
            <header
              className={cn(
                'ios-grouped-list__header',
                stickyHeaders && 'ios-grouped-list__header--sticky',
              )}
            >
              {section.header}
            </header>
          ) : null}
          <div className="ios-grouped-list__rows">
            {section.items.map((item, index) => (
              <div key={`${section.id}-${index}`} className="ios-grouped-list__row">
                {renderItem(item, section.id, index)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
