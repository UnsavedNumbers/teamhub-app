import { useEffect, useRef } from 'react'
import { useLoadingState } from '../../contexts/LoadingStateContext'
import FullScreenLoader from '../common/FullScreenLoader'

export default function AdminLoadingSpinner() {
  const { setLoading } = useLoadingState()
  const hasSetLoadingRef = useRef(false)

  // Set loading state when component mounts, cleanup on unmount
  useEffect(() => {
    if (!hasSetLoadingRef.current) {
      setLoading(true)
      hasSetLoadingRef.current = true
    }
    return () => {
      if (hasSetLoadingRef.current) {
        setLoading(false)
        hasSetLoadingRef.current = false
      }
    }
  }, [setLoading])

  return <FullScreenLoader />
}
