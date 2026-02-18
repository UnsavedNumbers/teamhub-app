/**
 * Tool Link Parsing Utilities
 * 
 * Parses tool links from WordPress HTML content.
 */

export interface ToolLink {
  elementId: string
  context?: string
  originalElement: Element
  params?: Record<string, string>
}

/**
 * Parse tool links from HTML content
 */
export function parseToolLinks(htmlContent: string): ToolLink[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const links = doc.querySelectorAll('a[data-tool-link]')

  return Array.from(links).map(link => {
    const elementId = link.getAttribute('data-tool-link')
    const context = link.getAttribute('data-tool-context')
    const paramsAttr = link.getAttribute('data-tool-params')

    let params: Record<string, string> | undefined
    if (paramsAttr) {
      try {
        params = JSON.parse(paramsAttr)
      } catch {
        // Ignore invalid JSON
      }
    }

    return {
      elementId: elementId!,
      context: context || undefined,
      originalElement: link,
      params,
    }
  })
}

/**
 * Replace tool links in HTML with React-compatible elements
 */
export function replaceToolLinksInHtml(
  htmlContent: string,
  _onToolLinkClick: (elementId: string, context?: string, params?: Record<string, string>) => void
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const links = doc.querySelectorAll('a[data-tool-link]')

  links.forEach(link => {
    const elementId = link.getAttribute('data-tool-link')
    const context = link.getAttribute('data-tool-context')
    const paramsAttr = link.getAttribute('data-tool-params')

    if (!elementId) return

    let params: Record<string, string> | undefined
    if (paramsAttr) {
      try {
        params = JSON.parse(paramsAttr)
      } catch {
        // Ignore invalid JSON
      }
    }

    // Add click handler attribute (will be handled by React)
    link.setAttribute('data-tool-link-handler', 'true')
    link.setAttribute('data-tool-link-id', elementId)
    if (context) {
      link.setAttribute('data-tool-link-context', context)
    }
    if (params) {
      link.setAttribute('data-tool-link-params', JSON.stringify(params))
    }

    // Add visual styling
    link.classList.add('tool-link')
  })

  return doc.body.innerHTML
}
