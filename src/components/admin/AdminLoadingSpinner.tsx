import { useEffect, useRef } from 'react'
import { useLoadingState } from '../../contexts/LoadingStateContext'
import FullScreenLoader from '../common/FullScreenLoader'

export default function AdminLoadingSpinner() {
  const { setLoading } = useLoadingState()
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Set loading state when component mounts
  useEffect(() => {
    if (!isMountedRef.current) return
    setLoading(true)
    return () => {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [setLoading])

  return <FullScreenLoader />
}
