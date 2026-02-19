/**
 * Help Center Skeleton Components
 * 
 * Reusable skeleton loading components for help center pages.
 */

import '../../styles/helpCenter.css'

// ============================================================================
// Base Skeleton Component
// ============================================================================

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  className?: string
  style?: React.CSSProperties
}

function Skeleton({ width, height, borderRadius = '0.5rem', className = '', style = {} }: SkeletonProps) {
  return (
    <div
      className={`help-skeleton ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
        borderRadius,
        background: 'linear-gradient(90deg, var(--help-panel) 25%, var(--help-hover) 50%, var(--help-panel) 75%)',
        backgroundSize: '200% 100%',
        animation: 'help-skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  )
}

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Skeleton for role cards grid (HelpHomepage)
 */
export function HelpHomepageSkeleton() {
  return (
    <section className="help-uber-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      {[...Array(4)].map((_, idx) => (
        <div
          key={idx}
          className="help-role-card"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', justifyContent: 'center', minHeight: '180px' }}
        >
          <Skeleton width="64px" height="64px" borderRadius="50%" style={{ marginBottom: '1rem' }} />
          <Skeleton width="80%" height="24px" style={{ marginTop: '0.5rem' }} />
        </div>
      ))}
    </section>
  )
}

/**
 * Skeleton for category landing page
 */
export function CategoryLandingPageSkeleton() {
  return (
    <>
      {/* Breadcrumb skeleton */}
      <nav className="help-uber-breadcrumb" aria-label="Breadcrumb">
        <Skeleton width="60px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="100px" height="16px" />
      </nav>

      {/* Search bar skeleton (if role page) */}
      <section className="help-uber-panel" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
        <Skeleton width="100%" height="48px" borderRadius="0.75rem" />
      </section>

      {/* Featured article skeleton */}
      <article className="help-uber-card" style={{ marginBottom: '1rem' }}>
        <div className="help-uber-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'center' }}>
          <Skeleton width="100%" height="180px" borderRadius="0.75rem" />
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <Skeleton width="80px" height="16px" />
              <Skeleton width="60px" height="16px" />
            </div>
            <Skeleton width="90%" height="28px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="95%" height="16px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="85%" height="16px" style={{ marginBottom: '1rem' }} />
            <Skeleton width="140px" height="40px" borderRadius="0.5rem" />
          </div>
        </div>
      </article>

      {/* Topics list skeleton */}
      <section style={{ marginBottom: '1rem' }}>
        <Skeleton width="150px" height="24px" style={{ marginBottom: '1rem' }} />
        <div className="help-topics-list">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="help-topic-list-item" style={{ pointerEvents: 'none' }}>
              <Skeleton width="24px" height="24px" borderRadius="4px" />
              <Skeleton width="200px" height="20px" />
              <Skeleton width="60px" height="16px" />
              <Skeleton width="16px" height="16px" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/**
 * Skeleton for article page
 */
export function ArticlePageSkeleton() {
  return (
    <>
      {/* Breadcrumb skeleton */}
      <nav className="help-uber-breadcrumb" aria-label="Breadcrumb">
        <Skeleton width="60px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="100px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="120px" height="16px" />
      </nav>

      {/* Reading time skeleton */}
      <section style={{ marginBottom: '1rem' }}>
        <Skeleton width="120px" height="16px" />
      </section>

      {/* Article content skeleton */}
      <article>
        <Skeleton width="100%" height="32px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="95%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="90%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="24px" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="85%" height="16px" style={{ marginBottom: '1rem' }} />
      </article>

      {/* Feedback section skeleton */}
      <section className="help-uber-panel" style={{ marginTop: '1rem' }}>
        <Skeleton width="150px" height="20px" style={{ marginBottom: '0.7rem' }} />
        <div className="help-uber-actions" style={{ marginTop: '0.7rem' }}>
          <Skeleton width="80px" height="36px" borderRadius="0.5rem" />
          <Skeleton width="80px" height="36px" borderRadius="0.5rem" />
        </div>
      </section>
    </>
  )
}

/**
 * Skeleton for topic page (article list)
 */
export function TopicPageSkeleton() {
  return (
    <>
      {/* Breadcrumb skeleton */}
      <nav className="help-uber-breadcrumb" aria-label="Breadcrumb">
        <Skeleton width="60px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="100px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="120px" height="16px" />
      </nav>

      {/* Topic header skeleton */}
      <section style={{ marginBottom: '1.5rem' }}>
        <Skeleton width="60%" height="32px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="100%" height="16px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="90%" height="16px" style={{ marginTop: '0.5rem' }} />
      </section>

      {/* Sort options skeleton */}
      <div className="help-article-list-sort" style={{ marginBottom: '1rem' }}>
        <Skeleton width="50px" height="20px" style={{ display: 'inline-block', marginRight: '0.5rem' }} />
        <Skeleton width="120px" height="36px" borderRadius="0.5rem" style={{ display: 'inline-block' }} />
      </div>

      {/* Article list skeleton */}
      <div className="help-article-list">
        {[...Array(5)].map((_, idx) => (
          <div key={idx} className="help-article-list-item" style={{ pointerEvents: 'none' }}>
            <Skeleton width="80%" height="20px" style={{ marginBottom: '0.5rem' }} />
            <Skeleton width="100%" height="16px" style={{ marginBottom: '0.25rem' }} />
            <Skeleton width="90%" height="16px" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="help-article-list-pagination" style={{ marginTop: '1.5rem' }}>
        <Skeleton width="80px" height="36px" borderRadius="0.5rem" />
        <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
        <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
        <Skeleton width="36px" height="36px" borderRadius="0.5rem" />
        <Skeleton width="80px" height="36px" borderRadius="0.5rem" />
      </div>
    </>
  )
}

/**
 * Skeleton for contact page
 */
export function ContactPageSkeleton() {
  return (
    <>
      {/* Breadcrumb skeleton */}
      <nav className="help-uber-breadcrumb" aria-label="Breadcrumb">
        <Skeleton width="60px" height="16px" />
        <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        <Skeleton width="100px" height="16px" />
      </nav>

      {/* Contact form skeleton */}
      <section className="help-uber-card">
        <Skeleton width="200px" height="24px" style={{ marginBottom: '1.5rem' }} />
        <Skeleton width="100%" height="48px" borderRadius="0.5rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="48px" borderRadius="0.5rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="48px" borderRadius="0.5rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="120px" borderRadius="0.5rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="140px" height="44px" borderRadius="0.5rem" />
      </section>
    </>
  )
}

// ============================================================================
// CSS Animation (injected via style tag)
// ============================================================================

const skeletonStyles = `
@keyframes help-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.help-skeleton {
  display: inline-block;
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'help-skeleton-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = skeletonStyles
    document.head.appendChild(style)
  }
}
