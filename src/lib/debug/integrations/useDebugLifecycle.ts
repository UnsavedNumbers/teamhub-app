/**
 * Debug Logging System - Component Lifecycle Hook
 *
 * React hook for opt-in component lifecycle logging.
 * Tracks mounts, unmounts, and re-renders for debugging.
 */

import { useEffect, useRef } from 'react';
import { debug } from '../index';

/**
 * Hook for logging component lifecycle events
 *
 * @param componentName - Identifier for the component (e.g., 'CheckoutPage')
 * @param props - Optional props to log on mount (will be sanitized)
 *
 * @example
 * ```tsx
 * function MyComponent(props) {
 *   useDebugLifecycle('MyComponent', props);
 *   // ... component logic
 * }
 * ```
 */
export function useDebugLifecycle(
  componentName: string,
  props?: Record<string, unknown>
): void {
  // Early return in production - this hook does nothing
  if (!import.meta.env.DEV) {
    return;
  }

  const renderCountRef = useRef(0);
  const hasMountedRef = useRef(false);

  // Track renders
  renderCountRef.current += 1;

  useEffect(() => {
    // Only log mount once
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;

      debug.flow(componentName, 'Mounted', {
        props,
        renderCount: renderCountRef.current,
      });
    } else {
      // Log re-renders
      debug.flow(componentName, `Re-render #${renderCountRef.current}`, {
        props,
        renderCount: renderCountRef.current,
      });
    }
  });

  // Log unmount
  useEffect(() => {
    return () => {
      debug.flow(componentName, 'Unmounted', {
        totalRenders: renderCountRef.current,
      });
    };
  }, [componentName]);
}