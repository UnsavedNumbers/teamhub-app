import toast, { type Renderable, type ToastPosition } from 'react-hot-toast'

/**
 * Toast utility functions with themed styling
 * Provides easy-to-use methods for showing notifications
 */

/**
 * Show a success toast
 */
export const showSuccess = (message: string, duration?: number, options?: { position?: ToastPosition }) => {
  return toast.success(message, {
    duration: duration || 4000,
    icon: '✓',
    ...options,
  })
}

/**
 * Show an error toast
 */
export const showError = (message: string, duration?: number) => {
  return toast.error(message, {
    duration: duration || 5000,
    icon: '✕',
  })
}

/**
 * Show a loading toast (returns a toast ID for dismissal)
 */
export const showLoading = (message: string) => {
  return toast.loading(message)
}

/**
 * Show an info toast
 */
export const showInfo = (message: string, duration?: number) => {
  return toast(message, {
    duration: duration || 4000,
    icon: 'ℹ',
  })
}

/**
 * Show a warning toast
 */
export const showWarning = (message: string, duration?: number) => {
  // react-hot-toast doesn't have a built-in warning type, so we use custom
  return toast(message, {
    duration: duration || 4000,
    icon: '⚠',
    style: {
      borderLeft: '3px solid var(--pa-warning, #4A5568)',
    },
  })
}

/**
 * Dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId)
}

/**
 * Dismiss all toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss()
}

/**
 * Show a promise-based toast (automatically shows loading, then success/error)
 */
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: any) => string)
  }
) => {
  return toast.promise(promise, messages)
}

/**
 * Show a custom toast with full control
 */
export const showCustom = (
  message: string | React.ReactNode,
  options?: {
    duration?: number
    icon?: React.ReactNode
    style?: React.CSSProperties
  }
) => {
  const { icon, ...restOptions } = options ?? {}
  return toast(message as string, {
    ...restOptions,
    icon: icon as Renderable | undefined,
  })
}

// Re-export the default toast function for advanced usage
export { toast }
