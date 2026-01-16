/**
 * Sport Image Skeleton Component
 *
 * Loading placeholder for sport images with fixed aspect ratio
 * to prevent layout shift (CLS).
 */

interface SportImageSkeletonProps {
    type?: 'hero' | 'card'
    className?: string
}

export function SportImageSkeleton({ type = 'hero', className = '' }: SportImageSkeletonProps) {
    const aspectRatio = type === 'hero' ? 'aspect-[3/2]' : 'aspect-[4/3]'

    return (
        <div
            className={`${aspectRatio} w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl ${className}`}
            aria-label="Loading sport image"
        >
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-slate-300 dark:bg-slate-700"></div>
            </div>
        </div>
    )
}
