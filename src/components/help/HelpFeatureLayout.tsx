import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n/useI18n'
import { useHelpTheme } from '../../hooks/useHelpTheme'
import { getLink } from '../../utils/routes'

export interface HelpSidebarItem {
  id: string
  label: string
  to?: string
  href?: string
  onClick?: () => void
  active?: boolean
}

export interface HelpSidebarSection {
  id: string
  title: string
  items: HelpSidebarItem[]
  defaultOpen?: boolean
}

interface HelpFeatureLayoutProps {
  pageTitle: string
  pageDescription?: string
  sidebarSections: HelpSidebarSection[]
  children: ReactNode
  headerActions?: ReactNode
  headerRoleSwitcher?: ReactNode
  /** Rendered above the main title (e.g. breadcrumbs) */
  beforeTitle?: ReactNode
}

export function HelpFeatureLayout({
  pageTitle,
  pageDescription,
  children,
  headerActions,
  headerRoleSwitcher,
  beforeTitle,
}: HelpFeatureLayoutProps) {
  const t = useT()
  const { theme, isDark, toggleTheme } = useHelpTheme()

  return (
    <div className="help-uber-shell" data-theme={theme}>
      <header className="help-uber-header" style={{ position: 'relative' }}>
        <div className="help-uber-header-left">
          <Link to={getLink('portal.help')} className="help-uber-brand">
            {t('portal.settings.helpCenter.footerKnowledgeBase')}
          </Link>
        </div>

        {headerRoleSwitcher && (
          <div className="help-uber-header-center">
            {headerRoleSwitcher}
          </div>
        )}

        <div className="help-uber-header-right">
          {headerActions}
          <button
            type="button"
            className="help-uber-theme-toggle"
            onClick={toggleTheme}
            aria-label={t('common.change')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <div className="help-uber-layout">
        <main className="help-uber-main">
          <header className="help-uber-main-header">
            {beforeTitle}
            <h1 className="help-uber-main-title">{pageTitle}</h1>
            {pageDescription ? <p className="help-uber-main-description">{pageDescription}</p> : null}
          </header>
          {children}
        </main>
      </div>

    </div>
  )
}
