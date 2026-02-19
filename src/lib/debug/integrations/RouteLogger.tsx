/**
 * Debug Logging System - Route Logger
 *
 * React component that automatically logs route changes
 * for navigation debugging. Only active in development mode.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { debug } from '../index';

/**
 * RouteLogger component - automatically logs route changes
 *
 * This component has no visual output and should be placed
 * early in the component tree to capture all navigation.
 */
export function RouteLogger(): null {
  const location = useLocation();
  const previousLocationRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;

    if (previousLocationRef.current === null) {
      // First mount - log initial route
      debug.flow('Router', `Initial route: ${currentPath}`, {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      });
    } else if (previousLocationRef.current !== currentPath) {
      // Route changed - log navigation
      const prevPath = previousLocationRef.current;
      debug.flow('Router', `Navigated: ${prevPath} → ${currentPath}`, {
        from: prevPath,
        to: currentPath,
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      });
    }

    // Update the ref for next comparison
    previousLocationRef.current = currentPath;
  }, [location]);

  // This component renders nothing
  return null;
}

// Export a conditional version that only renders in development
export const ConditionalRouteLogger = import.meta.env.DEV ? RouteLogger : (): null => null;