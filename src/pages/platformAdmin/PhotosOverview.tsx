/**
 * Platform Admin – Photos: Gallery Overview
 *
 * Cross-org statistics on storage usage, upload volumes, and active galleries.
 */

export default function PhotosOverview() {
  return (
    <div className="pa-root">
      <div className="pa-container">
        <div style={{ marginBottom: 'var(--pa-space-6)' }}>
          <h1 className="pa-h1">Gallery Overview</h1>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-2)' }}>
            Cross-organization statistics on storage usage, upload volumes, and active galleries.
          </p>
        </div>
        <div className="pa-card" style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)' }}>
            photo_library
          </span>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-4)' }}>
            Gallery overview metrics and charts will be available here.
          </p>
        </div>
      </div>
    </div>
  )
}
