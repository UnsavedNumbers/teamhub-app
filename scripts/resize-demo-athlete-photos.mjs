/**
 * Generates 256px and 512px square versions of athlete photos in public/demo-assets/athlete-photos/.
 * Run after adding or replacing athlete photos so /portal/athletes and profile pages stay crisp.
 *
 * Usage: node scripts/resize-demo-athlete-photos.mjs
 * Requires: npm install -D sharp
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS_DIR = path.join(ROOT, 'public', 'demo-assets', 'athlete-photos')
const SIZES = [256, 512]
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function isSizeSuffix(name) {
  return SIZES.some((s) => name.endsWith(`-${s}`))
}

function baseName(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  const base = path.basename(fileName, ext)
  return isSizeSuffix(base) ? base.replace(/-(\d+)$/, '') : base
}

async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('This script requires sharp. Run: npm install -D sharp')
    process.exit(1)
  }

  if (!fs.existsSync(PHOTOS_DIR)) {
    console.log('Directory not found:', PHOTOS_DIR)
    console.log('Create it and add athlete photos (e.g. emma-johnson.jpg), then run this script again.')
    process.exit(0)
  }

  const files = fs.readdirSync(PHOTOS_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return EXTENSIONS.includes(ext) && !isSizeSuffix(path.basename(f, ext))
  })

  if (files.length === 0) {
    console.log('No base athlete photos found in', PHOTOS_DIR)
    console.log('Add .jpg/.png/.webp files (e.g. emma-johnson.jpg), then run this script again.')
    process.exit(0)
  }

  for (const file of files) {
    const inputPath = path.join(PHOTOS_DIR, file)
    const base = baseName(file)
    const ext = path.extname(file).toLowerCase()

    for (const size of SIZES) {
      const outPath = path.join(PHOTOS_DIR, `${base}-${size}.jpg`)
      try {
        await sharp(inputPath)
          .resize(size, size, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 88 })
          .toFile(outPath)
        console.log('  ', file, '->', `${base}-${size}.jpg`)
      } catch (err) {
        console.error('  ', file, '->', `${base}-${size}.jpg`, 'failed:', err.message)
      }
    }
  }

  console.log('Done. Portal athlete list and profile pages will use these sized assets.')
}

main()
