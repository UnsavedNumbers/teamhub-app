/**
 * Platform Admin – Photos: Content Review
 *
 * Platform-level moderation and flagged content review.
 */

export default function PhotosContentReview() {
  return (
    <div className="pa-root">
      <div className="pa-container">
        <div style={{ marginBottom: 'var(--pa-space-6)' }}>
          <h1 className="pa-h1">Content Review</h1>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-2)' }}>
            Review flagged content and moderation queues across organizations.
          </p>
        </div>
        <div className="pa-card" style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)' }}>
            flag
          </span>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-4)' }}>
            Content review and flagged items will be listed here.
          </p>
        </div>
      </div>
    </div>
  )
}
