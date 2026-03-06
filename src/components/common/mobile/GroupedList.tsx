import { cn } from '@/utils/cn'

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
