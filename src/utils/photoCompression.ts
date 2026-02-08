export interface CompressPhotoOptions {
  maxSizeMB?: number
  maxDimension?: number
  quality?: number
  force?: boolean
}

export interface CompressPhotoResult {
  file: File
  didCompress: boolean
}

const DEFAULT_MAX_SIZE_MB = 2
const DEFAULT_MAX_DIMENSION = 4000
const DEFAULT_QUALITY = 0.82

function replaceFileExtension(filename: string, newExt: string): string {
  const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename
  return `${base}.${newExt}`
}

async function getImageBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file)
  } catch {
    return null
  }
}

export async function compressPhotoFile(
  file: File,
  options: CompressPhotoOptions = {}
): Promise<CompressPhotoResult> {
  const {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    force = false,
  } = options

  if (typeof window === 'undefined') {
    return { file, didCompress: false }
  }

  const maxBytes = maxSizeMB * 1024 * 1024
  const bitmap = await getImageBitmap(file)
  if (!bitmap) {
    return { file, didCompress: false }
  }

  const maxSide = Math.max(bitmap.width, bitmap.height)
  const needsResize = maxSide > maxDimension
  const needsCompression = force || file.size > maxBytes || needsResize

  if (!needsCompression) {
    bitmap.close?.()
    return { file, didCompress: false }
  }

  const scale = needsResize ? maxDimension / maxSide : 1
  const targetWidth = Math.max(1, Math.round(bitmap.width * scale))
  const targetHeight = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return { file, didCompress: false }
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close?.()

  const outputType = 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, quality)
  )

  if (!blob) {
    return { file, didCompress: false }
  }

  const outputName = replaceFileExtension(file.name, 'jpg')
  const compressedFile = new File([blob], outputName, {
    type: blob.type || outputType,
    lastModified: Date.now(),
  })

  const shouldUseCompressed = force || compressedFile.size < file.size
  return {
    file: shouldUseCompressed ? compressedFile : file,
    didCompress: shouldUseCompressed,
  }
}
