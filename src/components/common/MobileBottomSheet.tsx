import BottomSheet from './mobile/BottomSheet'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

/**
 * MobileBottomSheet - Slide-up bottom sheet for mobile dropdowns
 * 
 * Features:
 * - Slide-up animation from bottom using CSS transforms
 * - Backdrop overlay with tap-to-close
 * - Scroll lock when open
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - State machine to prevent flicker from rapid clicks
 * - Refs to prevent stale closures
 * - Unmount safety checks
 * - Safe area handling for notched devices
 */
export default function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  title 
}: MobileBottomSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      {children}
    </BottomSheet>
  )
}
