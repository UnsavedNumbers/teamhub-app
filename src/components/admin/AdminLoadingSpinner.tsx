/**
 * Loading spinner for admin panel
 * Uses Material Dashboard Bootstrap styling
 */
export default function AdminLoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}
