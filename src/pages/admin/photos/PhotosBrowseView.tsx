import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  InlineNotice,
  Table,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { getGalleriesForUser, type Gallery } from '@/data/services/galleryService'
import { getSeasons } from '@/data/services/seasonsService'
import { getEvents } from '@/data/services/eventsService'
import { getTeams } from '@/data/services/teamsService'
import { getAthletes } from '@/data/services/familyService'
import { getMockGalleriesForOrg } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes'
import { usePagination } from '@/hooks/usePagination'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import './PhotosBrowseView.css'

interface TreeNode {
  id: string
  type: 'season' | 'event' | 'team' | 'athlete'
  name: string
  photoCount: number
  hasPhotos: boolean
  children?: TreeNode[]
  expanded?: boolean
  loading?: boolean
}

export function PhotosBrowseView() {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()

  const [seasons, setSeasons] = useState<any[]>([])
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([])
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set())
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

  const { page, rowsPerPage, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!context?.orgId) {
        setLoading(false)
        return
      }

      if (USE_FAKE_DATA) {
        const mockGalleries = getMockGalleriesForOrg(context.orgId)
        setGalleries(mockGalleries)
        setSeasons([])
        setTreeNodes([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Load seasons
      const { data: seasonsData, error: seasonsError } = await getSeasons(context, {})
      if (!mounted) return

      if (seasonsError) {
        setError(seasonsError.message)
      } else {
        setSeasons(seasonsData || [])
        // Build initial tree nodes (seasons only, children loaded on expand)
        const nodes: TreeNode[] = (seasonsData || []).map((season: any) => ({
          id: season.id,
          type: 'season',
          name: season.name,
          photoCount: 0,
          hasPhotos: false,
          expanded: false,
        }))
        setTreeNodes(nodes)
      }

      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [context])

  const loadNodeChildren = useCallback(async (node: TreeNode) => {
    if (!context?.orgId || loadingNodes.has(node.id)) return

    setLoadingNodes(prev => new Set(prev).add(node.id))

    try {
      if (node.type === 'season') {
        // Load events, teams, and athletes for this season
        const [eventsResult, teamsResult, athletesResult] = await Promise.all([
          getEvents(context, { seasonId: node.id }),
          getTeams(context, { seasonId: node.id }),
          getAthletes(context),
        ])

        const children: TreeNode[] = []

        // Add events
        if (eventsResult.data) {
          for (const event of eventsResult.data) {
            const { data: eventGalleries } = await getGalleriesForUser(context, {
              gallery_type: 'event',
              entity_id: event.id,
            })
            const photoCount = eventGalleries?.reduce((sum, g) => sum + (g.photo_count || 0), 0) || 0
            children.push({
              id: event.id,
              type: 'event',
              name: event.title || event.name || 'Untitled Event',
              photoCount,
              hasPhotos: photoCount > 0,
            })
          }
        }

        // Add teams
        if (teamsResult.data) {
          for (const team of teamsResult.data) {
            const { data: teamGalleries } = await getGalleriesForUser(context, {
              gallery_type: 'team',
              entity_id: team.id,
            })
            const photoCount = teamGalleries?.reduce((sum, g) => sum + (g.photo_count || 0), 0) || 0
            children.push({
              id: team.id,
              type: 'team',
              name: team.name || 'Untitled Team',
              photoCount,
              hasPhotos: photoCount > 0,
            })
          }
        }

        // Add athletes (simplified - org athletes)
        if (athletesResult.data) {
          for (const athlete of athletesResult.data.slice(0, 50)) { // Limit to 50 for performance
            const { data: athleteGalleries } = await getGalleriesForUser(context, {
              gallery_type: 'athlete',
              entity_id: athlete.id,
            })
            const photoCount = athleteGalleries?.reduce((sum, g) => sum + (g.photo_count || 0), 0) || 0
            children.push({
              id: athlete.id,
              type: 'athlete',
              name: `${athlete.first_name} ${athlete.last_name}`,
              photoCount,
              hasPhotos: photoCount > 0,
            })
          }
        }

        // Update tree nodes
        setTreeNodes(prev => prev.map(n => 
          n.id === node.id 
            ? { ...n, children, expanded: true }
            : n
        ))
      }
    } catch (err) {
      console.error('[PhotosBrowseView] Error loading node children:', err)
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
    }
  }, [context, loadingNodes])

  const handleNodeClick = useCallback(async (node: TreeNode) => {
    if (node.type === 'season' && !node.expanded) {
      await loadNodeChildren(node)
    }
    setSelectedNode(node)
  }, [loadNodeChildren])

  useEffect(() => {
    if (!selectedNode || !context?.orgId) {
      setGalleries([])
      setTotalCount(0)
      return
    }

    let mounted = true
    const loadGalleries = async () => {
      const { data, error } = await getGalleriesForUser(context, {
        gallery_type: selectedNode.type === 'event' ? 'event' :
                     selectedNode.type === 'team' ? 'team' :
                     selectedNode.type === 'athlete' ? 'athlete' :
                     selectedNode.type === 'season' ? 'season' : undefined,
        entity_id: selectedNode.type !== 'season' ? selectedNode.id : undefined,
      })

      if (!mounted) return

      if (error) {
        setError(error.message)
      } else {
        let filtered = data || []
        if (hideEmpty) {
          filtered = filtered.filter(g => (g.photo_count || 0) > 0)
        }
        setGalleries(filtered)
        setTotalCount(filtered.length)
      }
    }
    loadGalleries()
    return () => {
      mounted = false
    }
  }, [selectedNode, context, hideEmpty, setTotalCount])

  const paginatedGalleries = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return galleries.slice(start, start + rowsPerPage)
  }, [galleries, page, rowsPerPage])

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isSelected = selectedNode?.id === node.id && selectedNode?.type === node.type
    const isLoading = loadingNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const showNode = !hideEmpty || node.hasPhotos || hasChildren || node.type === 'season'

    if (!showNode) return null

    return (
      <div key={`${node.type}-${node.id}`}>
        <div
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleNodeClick(node)}
        >
          <span className="tree-node-icon">
            {node.type === 'season' && '📅'}
            {node.type === 'event' && '📅'}
            {node.type === 'team' && '👥'}
            {node.type === 'athlete' && '🏃'}
          </span>
          <span className="tree-node-name">{node.name}</span>
          <span className={`tree-node-indicator ${node.hasPhotos ? 'has-photos' : 'empty'}`}>
            {node.hasPhotos ? '🔴' : '🔘'}
          </span>
          {node.photoCount > 0 && (
            <span className="tree-node-count">{node.photoCount}</span>
          )}
          {isLoading && <span className="tree-node-loading">...</span>}
        </div>
        {node.expanded && node.children && (
          <div className="tree-node-children">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="browse-loading">
        <Card className="pa-card pa-h-64 pa-animate-pulse" />
      </div>
    )
  }

  return (
    <div className="photos-browse">
      {error && (
        <InlineNotice 
          tone="error" 
          title={t('photos.errors.loadGalleries')} 
          message={error} 
        />
      )}

      <div className="browse-container">
        {/* Left Sidebar - Tree */}
        <div className="browse-sidebar">
          <div className="browse-sidebar-header">
            <h3>{t('photos.browse.title')}</h3>
            <label className="hide-empty-toggle">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
              />
              {t('photos.settings.hideEmptyByDefault')}
            </label>
          </div>
          <div className="tree-container">
            {treeNodes.length === 0 ? (
              <p className="pa-text-sm pa-text-muted pa-p-4">
                {t('photos.browse.selectSeason')}
              </p>
            ) : (
              treeNodes.map(node => renderTreeNode(node))
            )}
          </div>
        </div>

        {/* Main Content - Table */}
        <div className="browse-content">
          {!selectedNode ? (
            <Card className="pa-card pa-p-8 pa-text-center">
              <p className="pa-text-muted">{t('photos.browse.selectEntity')}</p>
            </Card>
          ) : paginatedGalleries.length === 0 ? (
            <Card className="pa-card pa-p-8 pa-text-center">
              <p className="pa-text-muted">{t('photos.browse.noGalleries')}</p>
            </Card>
          ) : (
            <>
              <Table
                data={paginatedGalleries.map(g => ({
                  id: g.id,
                  name: g.name,
                  photoCount: g.photo_count || 0,
                  lastModified: new Date(g.updated_at || g.created_at).toLocaleDateString(),
                  type: t(`photos.galleryType.${g.gallery_type}`),
                }))}
                columns={[
                  { key: 'name', label: t('common.name') },
                  { key: 'photoCount', label: t('photos.stats.totalPhotos') },
                  { key: 'lastModified', label: t('common.modified') },
                  { key: 'type', label: t('common.type') },
                ]}
                onRowClick={(row) => navigate(getLink('admin.photos.detail', { id: row.id }))}
                pagination={{
                  currentPage: page,
                  totalRows: galleries.length,
                  totalPages: Math.ceil(galleries.length / rowsPerPage),
                  rowsPerPage,
                  onPageChange: setPage,
                  onRowsPerPageChange: setRowsPerPage,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
