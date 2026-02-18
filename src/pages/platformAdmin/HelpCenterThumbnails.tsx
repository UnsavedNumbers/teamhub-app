/**
 * Help Center Category Thumbnails Page
 * 
 * Platform admin interface for uploading category thumbnails.
 */

import { useState, useEffect, useRef } from 'react'
import { PageHeader } from '../../components/platformAdmin'
import { Card, Button } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { supabase } from '../../lib/supabase'
import { getAllCachedWordPressData } from '../../data/services/helpCenterSyncService'
import type { WordPressCategory } from '../../data/services/wordpressApiService'
import { debug } from '../../lib/debug'

const BUCKET_NAME = 'help-center-thumbnails'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const REQUIRED_SIZE = 400 // 400x400px

export default function HelpCenterThumbnails() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  // Data state
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({}) // category slug -> URL

  // File input refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load categories from cache
      const categoriesResult = await getAllCachedWordPressData<WordPressCategory>('category')
      if (categoriesResult.error) {
        showError('Failed to load categories: ' + categoriesResult.error.message)
        return
      }

      // Filter to only child categories (parent !== 0)
      const childCategories = (categoriesResult.data || []).filter(cat => cat.parent !== 0)
      setCategories(childCategories)

      // Load existing thumbnails
      await loadThumbnails(childCategories)
    } catch (err) {
      showError('Failed to load data')
      debug.error('HelpCenterThumbnails', 'Exception loading data', { error: err })
    } finally {
      setLoading(false)
    }
  }

  async function loadThumbnails(categories: WordPressCategory[]) {
    const thumbnailUrls: Record<string, string> = {}

    for (const category of categories) {
      try {
        const { data } = await supabase.storage
          .from(BUCKET_NAME)
          .list('category-thumbnails', {
            search: category.slug,
          })

        if (data && data.length > 0) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(`category-thumbnails/${category.slug}.${data[0].name.split('.').pop()}`)

          if (urlData?.publicUrl) {
            thumbnailUrls[category.slug] = urlData.publicUrl
          }
        }
      } catch (err) {
        debug.error('HelpCenterThumbnails', 'Failed to load thumbnail', { category: category.slug, error: err })
      }
    }

    setThumbnails(thumbnailUrls)
  }

  async function handleFileSelect(categorySlug: string, file: File) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showError('Invalid file type. Please upload JPG, PNG, or WebP image.')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`)
      return
    }

    // Validate dimensions (optional - warn if not square)
    const img = new Image()
    img.onload = () => {
      if (img.width !== img.height) {
        console.warn(`Image is not square (${img.width}x${img.height}). Recommended: ${REQUIRED_SIZE}x${REQUIRED_SIZE}px`)
      }
      uploadThumbnail(categorySlug, file)
    }
    img.onerror = () => {
      showError('Invalid image file')
    }
    img.src = URL.createObjectURL(file)
  }

  async function uploadThumbnail(categorySlug: string, file: File) {
    setUploading(prev => ({ ...prev, [categorySlug]: true }))

    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${categorySlug}.${fileExt}`
      const filePath = `category-thumbnails/${fileName}`

      // Delete old file if exists
      try {
        await supabase.storage.from(BUCKET_NAME).remove([filePath])
      } catch {
        // Ignore if file doesn't exist
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        showError(`Failed to upload thumbnail: ${uploadError.message}`)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      if (urlData?.publicUrl) {
        setThumbnails(prev => ({
          ...prev,
          [categorySlug]: urlData.publicUrl,
        }))
        showSuccess('Thumbnail uploaded successfully')
      }
    } catch (err) {
      showError('Failed to upload thumbnail')
      debug.error('HelpCenterThumbnails', 'Exception uploading thumbnail', { error: err })
    } finally {
      setUploading(prev => ({ ...prev, [categorySlug]: false }))
    }
  }

  async function handleDelete(categorySlug: string) {
    if (!confirm('Are you sure you want to delete this thumbnail?')) {
      return
    }

    try {
      // Find the file
      const { data } = await supabase.storage
        .from(BUCKET_NAME)
        .list('category-thumbnails', {
          search: categorySlug,
        })

      if (data && data.length > 0) {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([`category-thumbnails/${data[0].name}`])

        if (error) {
          showError('Failed to delete thumbnail: ' + error.message)
          return
        }

        setThumbnails(prev => {
          const updated = { ...prev }
          delete updated[categorySlug]
          return updated
        })

        showSuccess('Thumbnail deleted successfully')
      }
    } catch (err) {
      showError('Failed to delete thumbnail')
      debug.error('HelpCenterThumbnails', 'Exception deleting thumbnail', { error: err })
    }
  }

  if (loading) {
    return (
      <div className="pa-root">
        <PageHeader title="Category Thumbnails" />
        <Card>
          <p>Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Category Thumbnails"
        subtitle="Upload square thumbnails for help center categories"
      />

      <div className="pa-content">
        <Card>
          <div className="pa-mb-4">
            <p className="pa-text-muted">
              Upload square thumbnail images (400x400px recommended) for each category.
              These thumbnails are displayed on the help center homepage.
            </p>
            <p className="pa-text-sm pa-text-muted pa-mt-2">
              Supported formats: JPG, PNG, WebP | Max size: 2MB
            </p>
          </div>

          <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 lg:pa-grid-cols-3 pa-gap-4">
            {categories.map(category => {
              const thumbnailUrl = thumbnails[category.slug]
              const isUploading = uploading[category.slug]

              return (
                <div key={category.id} className="pa-border pa-rounded pa-p-4">
                  <h3 className="pa-h3 pa-mb-3">{category.name}</h3>

                  <div className="pa-mb-3">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={category.name}
                        className="pa-w-full pa-aspect-square pa-object-cover pa-rounded"
                      />
                    ) : (
                      <div className="pa-w-full pa-aspect-square pa-bg-gray-100 pa-rounded pa-flex pa-items-center pa-justify-center pa-text-muted">
                        No thumbnail
                      </div>
                    )}
                  </div>

                  <div className="pa-space-y-2">
                    <input
                      ref={(el) => {
                        fileInputRefs.current[category.slug] = el
                      }}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="pa-hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleFileSelect(category.slug, file)
                        }
                      }}
                    />

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => fileInputRefs.current[category.slug]?.click()}
                      disabled={isUploading}
                      className="pa-w-full"
                    >
                      {isUploading ? 'Uploading...' : thumbnailUrl ? 'Replace' : 'Upload'}
                    </Button>

                    {thumbnailUrl && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleDelete(category.slug)}
                        className="pa-w-full"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {categories.length === 0 && (
            <p className="pa-text-muted pa-text-center pa-py-8">
              No categories available. Please sync WordPress data first.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
