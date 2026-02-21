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
          background: 'var(--pa-surface, #FFFFFF)',
          color: 'var(--pa-text-primary, var(--pa-n900, #0B0F14))',
          padding: '12px 16px',
          borderRadius: 'var(--pa-radius-md, 8px)',
          boxShadow: 'var(--pa-shadow-2, 0 4px 12px rgba(0, 0, 0, 0.15))',
          border: '1px solid var(--pa-border-default, #E9ECEF)',
          fontSize: '14px',
          fontFamily: 'var(--pa-font-body, Inter, system-ui, sans-serif)',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: 'var(--pa-success, #2B343D)',
            secondary: 'var(--pa-surface, #FFFFFF)',
          },
          style: {
            background: 'var(--pa-surface, #FFFFFF)',
            borderLeft: '3px solid var(--pa-success, #2B343D)',
            color: 'var(--pa-text-primary, var(--pa-n900, #0B0F14))',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--pa-danger, #0B0F14)',
            secondary: 'var(--pa-surface, #FFFFFF)',
          },
          style: {
            background: 'var(--pa-surface, #FFFFFF)',
            borderLeft: '3px solid var(--pa-danger, #0B0F14)',
            color: 'var(--pa-text-primary, var(--pa-n900, #0B0F14))',
          },
        },
        loading: {
          iconTheme: {
            primary: 'var(--pa-info, #7A8794)',
            secondary: 'var(--pa-surface, #FFFFFF)',
          },
          style: {
            background: 'var(--pa-surface, #FFFFFF)',
            borderLeft: '3px solid var(--pa-info, #7A8794)',
            color: 'var(--pa-text-primary, var(--pa-n900, #0B0F14))',
          },
        },
      }}
    />
  )
}
