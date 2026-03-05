export function googleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`
}

export function appleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  return `https://maps.apple.com/?q=${encodeURIComponent(query.trim())}`
}

export function wazeLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  return `https://waze.com/ul?q=${encodeURIComponent(query.trim())}`
}

export function uberLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(address.trim())}`
}

export function lyftLink(address: string | null | undefined): string | null {
  if (!address || address.trim() === '') return null
  return `https://lyft.com/ride?destination[address]=${encodeURIComponent(address.trim())}`
}

export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: Error }> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return { success: true }
      } catch (err) {
        document.body.removeChild(textArea)
        return { success: false, error: err instanceof Error ? err : new Error('Copy failed') }
      }
    }

    await navigator.clipboard.writeText(text)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Copy failed') }
  }
}
