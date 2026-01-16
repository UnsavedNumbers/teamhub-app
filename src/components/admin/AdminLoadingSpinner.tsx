export default function AdminLoadingSpinner() {
  return (
    <div className="pa-flex pa-justify-center pa-items-center" style={{ minHeight: '400px' }}>
      <div className="pa-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
      <span className="pa-text-overline pa-ml-3 pa-text-muted">LOADING...</span>
    </div>
  )
}
