/**
 * Tool Link Navigation Utilities
 * 
 * Handles navigation and element highlighting for tool links.
 */

import type { ToolLinkElement } from './toolLinkRegistry'

/**
 * Navigate to tool link element and show popup
 */
export async function navigateToToolLink(
  element: ToolLinkElement,
  _context?: string,
  params?: Record<string, string>,
  navigateFn?: (path: string) => void
): Promise<void> {
  // Replace route params
  let route = element.route
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      route = route.replace(`:${key}`, value)
    })
  }

  // Navigate
  if (navigateFn) {
    navigateFn(route)
  } else {
    window.location.href = route
    return
  }

  // Wait for page load, then highlight element
  setTimeout(() => {
    highlightElement(element.selector)
  }, 500)
}

/**
 * Highlight target element
 */
export function highlightElement(selector?: string): void {
  if (!selector) return

  const element = document.querySelector(selector) as HTMLElement
  if (!element) {
    console.warn(`Tool link target element not found: ${selector}`)
    return
  }

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Add highlight class
  element.classList.add('tool-link-highlight')

  // Remove highlight after animation
  setTimeout(() => {
    element.classList.remove('tool-link-highlight')
  }, 3000)
}

/**
 * Show tool link popup near element
 */
export function showToolLinkPopup(
  element: ToolLinkElement,
  context?: string,
  targetSelector?: string
): {
  targetElement: HTMLElement | null
  message: string
} {
  const targetElement = targetSelector
    ? (document.querySelector(targetSelector) as HTMLElement)
    : null

  const message =
    context && element.contextPrompts?.[context]
      ? element.contextPrompts[context]
      : element.defaultPrompt

  return {
    targetElement,
    message,
  }
}
