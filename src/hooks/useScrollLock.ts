import { useEffect } from 'react'

/**
 * Global lock count to track multiple scroll locks
 * Prevents race conditions when multiple components try to lock/unlock
 */
let lockCount = 0

/**
 * Hook to lock body scroll when menu is open
 * Uses count-based locking to handle multiple menus/modals
 * 
 * @param isLocked - Whether scroll should be locked
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 * useScrollLock(isOpen)
 * ```
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockCount++
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      if (isLocked) {
        lockCount--
        // Only unlock if no other locks are active
        if (lockCount === 0) {
          document.body.style.overflow = ''
        }
      }
    }
  }, [isLocked])
}
