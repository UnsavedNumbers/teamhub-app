/**
 * Demo Session Tracking Utilities
 * 
 * Provides type-safe tracking functions for demo-specific events.
 * All events are automatically tagged with demo_session: true.
 */

import { usePostHog } from '@posthog/react'
import { getPostHogInstance } from './posthog'
import type { DemoAllowedRole } from '@/types/demoManagement'

/**
 * Properties that should be included with all demo events
 */
export interface DemoEventProperties {
  demo_session: true
  demo_code: string
  demo_role: DemoAllowedRole
  demo_org_id: string
  organization_id?: string | null
  user_type: 'demo'
}

/**
 * React hook for demo tracking (use in components)
 */
export function useDemoTracking() {
  const posthog = usePostHog()

  return {
    trackDemoFeatureClick: (featureId: string, featureName: string, properties?: Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture('demo_feature_clicked', {
          feature_id: featureId,
          feature_name: featureName,
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op: failures must never break the app */
      }
    },

    trackDemoPageView: (pageId: string, pageName: string, properties?: Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture('$pageview', {
          page_id: pageId,
          page_name: pageName,
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op */
      }
    },

    trackDemoAction: (action: string, properties?: Record<string, unknown> & Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture(`demo_${action}`, {
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op */
      }
    },

    trackGuideOpened: (pageId: string, properties?: Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture('demo_guide_opened', {
          page_id: pageId,
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op */
      }
    },

    trackGuideDismissed: (pageId: string, properties?: Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture('demo_guide_dismissed', {
          page_id: pageId,
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op */
      }
    },

    trackGuideActionClicked: (pageId: string, action: string, properties?: Partial<DemoEventProperties>) => {
      if (!posthog) return
      try {
        posthog.capture('demo_guide_action_clicked', {
          page_id: pageId,
          action,
          demo_session: true,
          ...properties,
        })
      } catch {
        /* no-op */
      }
    },
  }
}

/**
 * Non-React utility functions for tracking (use in services/utils)
 */
export function trackDemoFeatureClick(
  featureId: string,
  featureName: string,
  properties?: Partial<DemoEventProperties>
): void {
  try {
    const posthog = getPostHogInstance()
    if (!posthog) return
    posthog.capture('demo_feature_clicked', {
      feature_id: featureId,
      feature_name: featureName,
      demo_session: true,
      ...properties,
    })
  } catch {
    /* no-op */
  }
}

export function trackDemoPageView(
  pageId: string,
  pageName: string,
  properties?: Partial<DemoEventProperties>
): void {
  try {
    const posthog = getPostHogInstance()
    if (!posthog) return
    posthog.capture('$pageview', {
      page_id: pageId,
      page_name: pageName,
      demo_session: true,
      ...properties,
    })
  } catch {
    /* no-op */
  }
}

export function trackDemoAction(
  action: string,
  properties?: Record<string, unknown> & Partial<DemoEventProperties>
): void {
  try {
    const posthog = getPostHogInstance()
    if (!posthog) return
    posthog.capture(`demo_${action}`, {
      demo_session: true,
      ...properties,
    })
  } catch {
    /* no-op */
  }
}
