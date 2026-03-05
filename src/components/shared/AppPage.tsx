import type { CSSProperties, ReactNode } from 'react'

type AppPageProps = {
  children: ReactNode
  className?: string
}

type PageSectionProps = {
  children: ReactNode
  className?: string
}

type ResponsiveGridProps = {
  children: ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4
  gap?: string
  style?: CSSProperties
}

export function AppPage({ children, className = '' }: AppPageProps) {
  return <div className={`overflow-safe-page overflow-safe-stack ${className}`.trim()}>{children}</div>
}

export function PageSection({ children, className = '' }: PageSectionProps) {
  return <section className={`overflow-safe-section overflow-safe-stack ${className}`.trim()}>{children}</section>
}

export function ResponsiveGrid({ children, className = '', cols = 1, gap = '1rem', style }: ResponsiveGridProps) {
  return (
    <div
      className={`overflow-safe-grid ${className}`.trim()}
      style={{
        ...style,
        ['--overflow-grid-cols' as string]: String(cols),
        ['--overflow-grid-gap' as string]: gap,
      }}
    >
      {children}
    </div>
  )
}
