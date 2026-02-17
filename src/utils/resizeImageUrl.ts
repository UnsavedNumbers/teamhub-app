/**
 * Resize an image from a URL to a square of the given size (center crop).
 * Use a size that keeps the result hi-res for the display (e.g. 768+ for retina).
 * Returns a blob URL. Caller should revoke it when no longer needed.
 */
export function resizeImageUrl(sourceUrl: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Cap output at source size so we never upscale
        const sourceMin = Math.min(img.width, img.height)
        const outSize = Math.min(size, sourceMin)
        const canvas = document.createElement('canvas')
        canvas.width = outSize
        canvas.height = outSize
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No canvas context'))
          return
        }
        const sx = (img.width - sourceMin) / 2
        const sy = (img.height - sourceMin) / 2
        ctx.drawImage(img, sx, sy, sourceMin, sourceMin, 0, 0, outSize, outSize)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob))
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          'image/jpeg',
          0.9
        )
      } catch (e) {
        reject(e)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = sourceUrl
  })
}
