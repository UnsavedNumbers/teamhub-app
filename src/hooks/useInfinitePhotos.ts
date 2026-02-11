import { useEffect, useRef } from 'react'

interface UseInfinitePhotosOptions {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number
}

export function useInfinitePhotos({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.7,
}: UseInfinitePhotosOptions) {
  const loadingRef = useRef(isLoading)
  const loadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    loadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    loadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (!hasMore) return

    const handleScroll = () => {
      if (loadingRef.current || !hasMore) return
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const scrollHeight = doc.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) return
      const ratio = scrollTop / scrollHeight
      if (ratio >= threshold) {
        loadingRef.current = true
        loadMoreRef.current()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [hasMore, threshold])
}
