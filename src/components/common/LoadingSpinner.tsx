type SpinnerSize = 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg'

export default function LoadingSpinner({ size = 'medium' }: { size?: SpinnerSize }) {
  const normalizedSize: 'small' | 'medium' | 'large' =
    size === 'sm' ? 'small' : size === 'md' ? 'medium' : size === 'lg' ? 'large' : size
  const sizeClass =
    normalizedSize === 'small'
      ? 'h-4 w-4'
      : normalizedSize === 'large'
      ? 'h-10 w-10'
      : 'h-6 w-6'

  return (
    <div className={`animate-spin rounded-full border-2 border-indigo-500 border-t-transparent ${sizeClass}`} />
  )
}
