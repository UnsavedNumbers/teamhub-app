export default function LoadingSpinner({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClass =
    size === 'small'
      ? 'h-4 w-4'
      : size === 'large'
      ? 'h-10 w-10'
      : 'h-6 w-6'

  return (
    <div className={`animate-spin rounded-full border-2 border-indigo-500 border-t-transparent ${sizeClass}`} />
  )
}
