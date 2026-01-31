import { Toaster as HotToaster } from 'react-hot-toast'

/**
 * Themed Toaster component that matches the website's design system
 * Supports both regular app theme and platform admin theme
 */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
          color: 'var(--toast-text, var(--pa-n900, #0B0F14))',
          padding: 'var(--toast-padding, 12px 16px)',
          borderRadius: 'var(--toast-radius, 8px)',
          boxShadow: 'var(--toast-shadow, 0 4px 12px rgba(0, 0, 0, 0.15))',
          border: 'var(--toast-border, 1px solid var(--pa-n100, #E9ECEF))',
          fontSize: '14px',
          fontFamily: 'var(--pa-font-body, Inter, system-ui, sans-serif)',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: 'var(--toast-success-color, var(--pa-success, #2B343D))',
            secondary: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
          },
          style: {
            background: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
            borderLeft: '3px solid var(--toast-success-color, var(--pa-success, #2B343D))',
            color: 'var(--toast-text, var(--pa-n900, #0B0F14))',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--toast-error-color, var(--pa-danger, #0B0F14))',
            secondary: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
          },
          style: {
            background: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
            borderLeft: '3px solid var(--toast-error-color, var(--pa-danger, #0B0F14))',
            color: 'var(--toast-text, var(--pa-n900, #0B0F14))',
          },
        },
        loading: {
          iconTheme: {
            primary: 'var(--toast-info-color, var(--pa-info, #7A8794))',
            secondary: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
          },
          style: {
            background: 'var(--toast-bg, var(--pa-surface, #FFFFFF))',
            borderLeft: '3px solid var(--toast-info-color, var(--pa-info, #7A8794))',
            color: 'var(--toast-text, var(--pa-n900, #0B0F14))',
          },
        },
      }}
    />
  )
}
