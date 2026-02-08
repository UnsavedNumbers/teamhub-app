import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { Card, EmptyState, InlineNotice, PageHeader, StatCard, Table } from '../../components/platformAdmin'
import { formatFileSize, formatNumber } from '../../utils/formatters'

interface OrgUsageRow {
  id: string
  name: string
  bytesUsed: number
  photoCount: number
  galleryCount: number
  updatedAt: string | null
}

interface GalleryUsageRow {
  id: string
  name: string
  orgId: string | null
  orgName: string
  bytesUsed: number
  photoCount: number
}

interface UserUsageRow {
  id: string
  name: string
  email: string | null
  bytesUsed: number
  photoCount: number
}

const PAGE_SIZE = 100
const TOP_ROWS = 10

export default function PhotosStorage() {
  const t = useT()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgRows, setOrgRows] = useState<OrgUsageRow[]>([])
  const [galleryRows, setGalleryRows] = useState<GalleryUsageRow[]>([])
  const [userRows, setUserRows] = useState<UserUsageRow[]>([])
  const [totalBytes, setTotalBytes] = useState(0)
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [totalGalleries, setTotalGalleries] = useState(0)
  const [totalOrgs, setTotalOrgs] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadStorage = useCallback(async () => {
    setLoading(true)
    setError(null)

    const orgMap = new Map<string, { name: string; bytesUsed: number; updatedAt: string | null }>()
    const orgPhotoCounts = new Map<string, number>()
    const orgGallerySets = new Map<string, Set<string>>()
    const orgBytesFromPhotos = new Map<string, number>()
    const galleryMap = new Map<string, GalleryUsageRow>()
    const userMap = new Map<string, UserUsageRow>()
    let latestUpdatedAt: string | null = null
    let photoTotal = 0

    try {
      let orgOffset = 0
      let orgHasMore = true

      while (orgHasMore) {
        const { data: usageData, error: usageError } = await supabase
          .from('org_storage_usage')
          .select('org_id, bytes_used, updated_at, org:organizations(name)')
          .eq('bucket_id', 'public-media')
          .range(orgOffset, orgOffset + PAGE_SIZE - 1)

        if (usageError && usageError.code !== 'PGRST116') {
          if (mountedRef.current) {
            setError(t('platformAdmin.photosStorage.loadError'))
          }
          break
        }

        ;(usageData || []).forEach((row: any) => {
          orgMap.set(row.org_id, {
            name: row.org?.name || t('common.unknown'),
            bytesUsed: Number(row.bytes_used || 0),
            updatedAt: row.updated_at || null,
          })
          if (row.updated_at && (!latestUpdatedAt || row.updated_at > latestUpdatedAt)) {
            latestUpdatedAt = row.updated_at
          }
        })

        const fetched = usageData?.length || 0
        orgOffset += PAGE_SIZE
        orgHasMore = fetched === PAGE_SIZE
        if (fetched === 0) break
      }

      let offset = 0
      let hasMore = true

      while (hasMore) {
        const { data, error: photosError } = await supabase
          .from('gallery_photos')
          .select('gallery_id, uploaded_by_user_id, size_bytes, gallery:galleries(id, name, org_id), uploader:users(id, first_name, last_name, email)')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (photosError) {
          if (mountedRef.current) {
            setError(t('platformAdmin.photosStorage.loadError'))
          }
          break
        }

        const rows = data || []
        if (rows.length === 0) break

        rows.forEach((row: any) => {
          const bytes = Number(row.size_bytes || 0)
          const galleryId = row.gallery?.id || row.gallery_id
          const orgId = row.gallery?.org_id || null
          const galleryName = row.gallery?.name || t('platformAdmin.photosStorage.unknownGallery')
          const uploaderId = row.uploader?.id || row.uploaded_by_user_id
          const uploaderName = [row.uploader?.first_name, row.uploader?.last_name]
            .filter(Boolean)
            .join(' ')
            .trim()
          const resolvedName = uploaderName || row.uploader?.email || t('common.unknown')

          photoTotal += 1

          if (orgId) {
            orgPhotoCounts.set(orgId, (orgPhotoCounts.get(orgId) || 0) + 1)
            orgBytesFromPhotos.set(orgId, (orgBytesFromPhotos.get(orgId) || 0) + bytes)
            if (!orgGallerySets.has(orgId)) {
              orgGallerySets.set(orgId, new Set())
            }
            if (galleryId) {
              orgGallerySets.get(orgId)?.add(galleryId)
            }
            if (!orgMap.has(orgId)) {
              orgMap.set(orgId, { name: t('common.unknown'), bytesUsed: 0, updatedAt: null })
            }
          }

          if (galleryId) {
            const existing = galleryMap.get(galleryId)
            if (existing) {
              existing.bytesUsed += bytes
              existing.photoCount += 1
            } else {
              galleryMap.set(galleryId, {
                id: galleryId,
                name: galleryName,
                orgId,
                orgName: orgId ? orgMap.get(orgId)?.name || t('common.unknown') : t('common.unknown'),
                bytesUsed: bytes,
                photoCount: 1,
              })
            }
          }

          if (uploaderId) {
            const existingUser = userMap.get(uploaderId)
            if (existingUser) {
              existingUser.bytesUsed += bytes
              existingUser.photoCount += 1
            } else {
              userMap.set(uploaderId, {
                id: uploaderId,
                name: resolvedName,
                email: row.uploader?.email || null,
                bytesUsed: bytes,
                photoCount: 1,
              })
            }
          }
        })

        offset += PAGE_SIZE
        hasMore = rows.length === PAGE_SIZE
      }

      const orgRowsResolved: OrgUsageRow[] = Array.from(orgMap.entries()).map(([id, org]) => {
        const photoCount = orgPhotoCounts.get(id) || 0
        const galleryCount = orgGallerySets.get(id)?.size || 0
        const bytesFromPhotos = orgBytesFromPhotos.get(id) || 0
        const bytesUsed = org.bytesUsed > 0 ? org.bytesUsed : bytesFromPhotos
        return {
          id,
          name: org.name,
          bytesUsed,
          photoCount,
          galleryCount,
          updatedAt: org.updatedAt,
        }
      })

      orgRowsResolved.sort((a, b) => b.bytesUsed - a.bytesUsed)

      const galleryRowsResolved = Array.from(galleryMap.values()).map((row) => ({
        ...row,
        orgName: row.orgId ? orgMap.get(row.orgId)?.name || t('common.unknown') : t('common.unknown'),
      }))
      galleryRowsResolved.sort((a, b) => b.bytesUsed - a.bytesUsed)

      const userRowsResolved = Array.from(userMap.values()).sort((a, b) => b.bytesUsed - a.bytesUsed)

      const bytesTotal = orgRowsResolved.reduce((sum, org) => sum + org.bytesUsed, 0)

      if (!mountedRef.current) return

      setOrgRows(orgRowsResolved)
      setGalleryRows(galleryRowsResolved)
      setUserRows(userRowsResolved)
      setTotalBytes(bytesTotal)
      setTotalPhotos(photoTotal)
      setTotalGalleries(galleryMap.size)
      setTotalOrgs(orgRowsResolved.length)
      setLastUpdated(latestUpdatedAt)
    } catch (err) {
      if (!mountedRef.current) return
      setError(t('platformAdmin.photosStorage.loadError'))
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [t])

  useEffect(() => {
    loadStorage()
  }, [loadStorage])

  const orgColumns = useMemo(
    () => [
      { id: 'name', label: t('platformAdmin.photosStorage.columns.organization'), cellType: 'primary' as const },
      {
        id: 'bytesUsed',
        label: t('platformAdmin.photosStorage.columns.storageUsed'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: OrgUsageRow) => formatFileSize(row.bytesUsed),
      },
      {
        id: 'photoCount',
        label: t('platformAdmin.photosStorage.columns.photos'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: OrgUsageRow) => formatNumber(row.photoCount),
      },
      {
        id: 'galleryCount',
        label: t('platformAdmin.photosStorage.columns.galleries'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: OrgUsageRow) => formatNumber(row.galleryCount),
      },
      {
        id: 'updatedAt',
        label: t('platformAdmin.photosStorage.columns.updatedAt'),
        cellType: 'meta' as const,
        render: (row: OrgUsageRow) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : t('common.unknown')),
      },
    ],
    [t],
  )

  const galleryColumns = useMemo(
    () => [
      { id: 'name', label: t('platformAdmin.photosStorage.columns.gallery'), cellType: 'primary' as const },
      { id: 'orgName', label: t('platformAdmin.photosStorage.columns.organization'), cellType: 'meta' as const },
      {
        id: 'bytesUsed',
        label: t('platformAdmin.photosStorage.columns.storageUsed'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: GalleryUsageRow) => formatFileSize(row.bytesUsed),
      },
      {
        id: 'photoCount',
        label: t('platformAdmin.photosStorage.columns.photos'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: GalleryUsageRow) => formatNumber(row.photoCount),
      },
    ],
    [t],
  )

  const userColumns = useMemo(
    () => [
      { id: 'name', label: t('platformAdmin.photosStorage.columns.user'), cellType: 'primary' as const },
      { id: 'email', label: t('platformAdmin.photosStorage.columns.email'), cellType: 'meta' as const },
      {
        id: 'bytesUsed',
        label: t('platformAdmin.photosStorage.columns.storageUsed'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: UserUsageRow) => formatFileSize(row.bytesUsed),
      },
      {
        id: 'photoCount',
        label: t('platformAdmin.photosStorage.columns.photos'),
        cellType: 'numeric' as const,
        align: 'right' as const,
        render: (row: UserUsageRow) => formatNumber(row.photoCount),
      },
    ],
    [t],
  )

  const emptyState = (
    <EmptyState
      icon="storage"
      title={t('platformAdmin.photosStorage.emptyTitle')}
      description={t('platformAdmin.photosStorage.emptyDescription')}
      noCard
    />
  )

  return (
    <div className="pa-root">
      <div className="pa-container">
        <PageHeader
          title={t('platformAdmin.photosStorage.title')}
          subtitle={t('platformAdmin.photosStorage.subtitle')}
        />

        {error && (
          <InlineNotice
            tone="error"
            title={t('common.error.label')}
            message={error}
          />
        )}

        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-4 pa-gap-4 pa-mb-6">
          <StatCard
            label={t('platformAdmin.photosStorage.totalStorage')}
            value={formatFileSize(totalBytes)}
            icon="storage"
            loading={loading}
            meta={lastUpdated ? t('platformAdmin.photosStorage.lastUpdated', { date: new Date(lastUpdated).toLocaleDateString() }) : undefined}
          />
          <StatCard
            label={t('platformAdmin.photosStorage.totalOrganizations')}
            value={formatNumber(totalOrgs)}
            icon="apartment"
            loading={loading}
          />
          <StatCard
            label={t('platformAdmin.photosStorage.totalGalleries')}
            value={formatNumber(totalGalleries)}
            icon="photo_library"
            loading={loading}
          />
          <StatCard
            label={t('platformAdmin.photosStorage.totalPhotos')}
            value={formatNumber(totalPhotos)}
            icon="image"
            loading={loading}
          />
        </div>

        <div className="pa-space-y-6">
          <Card title={t('platformAdmin.photosStorage.orgUsageTitle')}>
            <Table
              columns={orgColumns}
              data={orgRows.slice(0, TOP_ROWS)}
              loading={loading}
              emptyState={emptyState}
              zebra
            />
          </Card>

          <Card title={t('platformAdmin.photosStorage.galleryUsageTitle')}>
            <Table
              columns={galleryColumns}
              data={galleryRows.slice(0, TOP_ROWS)}
              loading={loading}
              emptyState={emptyState}
              zebra
            />
          </Card>

          <Card title={t('platformAdmin.photosStorage.userUsageTitle')}>
            <Table
              columns={userColumns}
              data={userRows.slice(0, TOP_ROWS)}
              loading={loading}
              emptyState={emptyState}
              zebra
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
