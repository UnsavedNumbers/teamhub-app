const OVERFLOW_ATTR = 'data-overflow-offender'
const OUTLINE_STYLE_ID = 'overflow-debug-outline-style'
const TOGGLE_BUTTON_ID = 'overflow-debug-toggle'
const EPSILON = 1

type Offender = {
  element: HTMLElement
  overflowBy: number
}

function getOverflowAmount(rect: DOMRect, viewportWidth: number): number {
  const overflowRight = Math.max(0, rect.right - viewportWidth)
  const overflowLeft = Math.max(0, -rect.left)
  return Math.max(overflowRight, overflowLeft)
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  if (Number(style.opacity) === 0) return false
  if (el.offsetParent === null && style.position !== 'fixed') return false
  return true
}

function clearOffenderMarks() {
  document.querySelectorAll(`[${OVERFLOW_ATTR}]`).forEach((node) => {
    node.removeAttribute(OVERFLOW_ATTR)
  })
}

function ensureOutlineStyle() {
  if (document.getElementById(OUTLINE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = OUTLINE_STYLE_ID
  style.textContent = `
    [${OVERFLOW_ATTR}="true"] {
      outline: 2px solid #ef4444 !important;
      outline-offset: -1px !important;
    }
  `
  document.head.appendChild(style)
}

function createToggleButton() {
  let button = document.getElementById(TOGGLE_BUTTON_ID) as HTMLButtonElement | null
  if (button) return button

  button = document.createElement('button')
  button.id = TOGGLE_BUTTON_ID
  button.type = 'button'
  button.style.position = 'fixed'
  button.style.left = '12px'
  button.style.bottom = '12px'
  button.style.zIndex = '99999'
  button.style.border = '1px solid rgba(0,0,0,0.25)'
  button.style.borderRadius = '999px'
  button.style.padding = '8px 12px'
  button.style.font = '600 12px/1 Inter, system-ui, sans-serif'
  button.style.background = 'rgba(15,23,42,0.95)'
  button.style.color = '#fff'
  button.style.cursor = 'pointer'
  button.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
  button.setAttribute('aria-label', 'Toggle overflow debug outlines')
  document.body.appendChild(button)
  return button
}

export function initOverflowDebug() {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  ensureOutlineStyle()

  const button = createToggleButton()
  let outlinesEnabled = true
  let pending = false

  const scan = () => {
    pending = false

    clearOffenderMarks()

    const viewportWidth = window.innerWidth
    const nodes = document.querySelectorAll<HTMLElement>('body *')
    const offenders: Offender[] = []

    for (const el of nodes) {
      if (!isVisible(el)) continue
      const rect = el.getBoundingClientRect()
      const overflowBy = getOverflowAmount(rect, viewportWidth)
      if (overflowBy > EPSILON) {
        offenders.push({ element: el, overflowBy })
      }
    }

    offenders
      .sort((a, b) => b.overflowBy - a.overflowBy)
      .slice(0, 40)
      .forEach(({ element }) => {
        if (outlinesEnabled) {
          element.setAttribute(OVERFLOW_ATTR, 'true')
        }
      })

    const hasPageOverflow = document.documentElement.scrollWidth > viewportWidth + EPSILON
    button.textContent = hasPageOverflow
      ? `Overflow: ${offenders.length}`
      : 'Overflow: 0'

    if (hasPageOverflow && offenders.length > 0) {
      const top = offenders
        .slice(0, 5)
        .map(({ element, overflowBy }, index) => {
          const tag = element.tagName.toLowerCase()
          const id = element.id ? `#${element.id}` : ''
          const cls = (element.className || '')
            .toString()
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((name) => `.${name}`)
            .join('')
          return `${index + 1}. ${tag}${id}${cls} (+${Math.round(overflowBy)}px)`
        })
      console.groupCollapsed('[overflow-debug] Horizontal overflow detected')
      top.forEach((line) => console.log(line))
      console.groupEnd()
    }
  }

  const scheduleScan = () => {
    if (pending) return
    pending = true
    requestAnimationFrame(scan)
  }

  const mutationObserver = new MutationObserver(scheduleScan)
  mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true })

  const resizeObserver = new ResizeObserver(scheduleScan)
  resizeObserver.observe(document.documentElement)
  resizeObserver.observe(document.body)

  const onResize = () => scheduleScan()
  window.addEventListener('resize', onResize, { passive: true })

  button.addEventListener('click', () => {
    outlinesEnabled = !outlinesEnabled
    if (!outlinesEnabled) clearOffenderMarks()
    scheduleScan()
  })

  scheduleScan()

  ;(window as Window & { __overflowDebugCleanup?: () => void }).__overflowDebugCleanup = () => {
    mutationObserver.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('resize', onResize)
    button.remove()
    clearOffenderMarks()
  }
}
