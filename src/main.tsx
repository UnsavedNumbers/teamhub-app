import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PostHogProvider } from '@posthog/react'
import { QUERY_CONFIG } from './constants/api'
import './index.css'
import './styles/toast.css'
import App from './App.tsx'

// Initialize debug logging system (localhost only)
if (import.meta.env.DEV) {
  import('./lib/debug')
}

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.STALE_TIME_MS,
      refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
      retry: QUERY_CONFIG.RETRY_COUNT,
    },
  },
})

// PostHog: only enable in production when API key and host are configured
const posthogEnabled =
  import.meta.env.PROD &&
  Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_KEY) &&
  Boolean(import.meta.env.VITE_PUBLIC_POSTHOG_HOST)
const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

const posthogOptions = posthogEnabled && posthogApiKey && posthogHost
  ? {
      api_host: posthogHost,
      // Enable automatic pageview tracking
      capture_pageview: true,
      capture_pageleave: true,
      // Enable session recording (optional, can be disabled if not needed)
      disable_session_recording: false,
      // Enable autocapture for clicks and form submissions
      autocapture: true,
    } as const
  : undefined

// Root component with optional PostHogProvider
function Root() {
  const app = (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  )

  if (posthogEnabled && posthogApiKey && posthogHost && posthogOptions) {
    return (
      <PostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        {app}
      </PostHogProvider>
    )
  }

  return app
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
