import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  InlineNotice,
  Input,
  Modal,
  Checkbox,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { useDebounce } from '@/hooks/useDebounce'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import { USE_FAKE_DATA } from '@/data/config'
import { getGalleriesForUser, type Gallery, deleteGallery } from '@/data/services/galleryService'
import { getSeasons } from '@/data/services/seasonsService'
import { getSports } from '@/data/services/sportsService'
import { getAthletesByGallery } from '@/data/services/athletesService'
import { getMockGalleriesForOrg } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes/helpers'
import { showError, showSuccess } from '@/utils/toast'
import './PhotosBrowseView.css'

interface TreeNode {
  id: string
  type: 'sport' | 'season' | 'team' | 'program'
  name: string
  icon: string
  expanded: boolean
  selected: boolean
  entityId?: string // season_id, team_id, etc
  children?: TreeNode[]
}

interface GalleryContributor {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string | null
}

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export function PhotosBrowseView() {
  useDebugLifecycle('PhotosBrowseView')
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([])
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [_loadingGalleries, setLoadingGalleries] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [demoAction, setDemoAction] = useState<string>('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [galleryToDelete, setGalleryToDelete] = useState<Gallery | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [contributorsCache, setContributorsCache] = useState<Record<string, GalleryContributor[]>>({})

  // Build tree structure based on organization data
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!isReady || !context?.orgId) {
        setLoading(false)
        return
      }

      if (USE_FAKE_DATA) {
        const mockGalleries = getMockGalleriesForOrg(context.orgId)
        setGalleries(mockGalleries as Gallery[])
        
        // Create mock tree nodes from mock data
        const nodes: TreeNode[] = [
          {
            id: 'varsity-football',
            type: 'sport',
            name: 'Varsity Football',
            icon: 'sports_football',
            expanded: false,
            selected: false,
          },
          {
            id: 'elite-basketball',
            type: 'sport',
            name: 'Elite Basketball',
            icon: 'sports_basketball',
            expanded: false,
            selected: false,
          },
          {
            id: 'premier-soccer',
            type: 'sport',
            name: 'Premier Soccer',
            icon: 'sports_soccer',
            expanded: false,
            selected: false,
          },
        ]
        setTreeNodes(nodes)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Load sports and seasons in parallel
        const [sportsResult, seasonsResult, galleriesResult] = await Promise.all([
          getSports(context),
          getSeasons(context, {}),
          getGalleriesForUser(context)
        ])
        
        if (!mounted) return

        if (sportsResult.error) {
          throw new Error(sportsResult.error.message || t('photos.errors.loadGalleries'))
        }
        if (seasonsResult.error) {
          throw new Error(seasonsResult.error.message || t('photos.errors.loadGalleries'))
        }
        if (galleriesResult.error) {
          throw new Error(galleriesResult.error.message || t('photos.errors.loadGalleries'))
        }

        const sports = sportsResult.data || []
        const seasons = seasonsResult.data || []
        
        // Build tree: sports at top level, seasons as children when applicable
        const nodes: TreeNode[] = sports.map((sport) => {
          // Find seasons that belong to this sport (if seasons have sport_id)
          const sportSeasons = seasons.filter(s => s.team_id && s.team_id.startsWith(sport.id.substring(0, 8)))
          
          return {
            id: `sport-${sport.id}`,
            type: 'sport' as const,
            name: sport.name,
            icon: sport.icon || 'sports',
            expanded: false,
            selected: false,
            entityId: sport.id,
            children: sportSeasons.length > 0 ? sportSeasons.map(season => ({
              id: `season-${season.id}`,
              type: 'season' as const,
              name: season.name,
              icon: 'event',
              expanded: false,
              selected: false,
              entityId: season.id,
            })) : undefined,
          }
        })

        // Add seasons without sport association
        const orphanSeasons = seasons.filter(s => !s.team_id)
        if (orphanSeasons.length > 0) {
          orphanSeasons.forEach(season => {
            nodes.push({
              id: `season-${season.id}`,
              type: 'season' as const,
              name: season.name,
              icon: 'event',
              expanded: false,
              selected: false,
              entityId: season.id,
            })
          })
        }
        
        setTreeNodes(nodes)
        const loadedGalleries = galleriesResult.data || []
        setGalleries(loadedGalleries)
      } catch (err) {
        if (!mounted) return
        const errorMessage = (err as Error)?.message || t('photos.errors.loadGalleries')
        setError(errorMessage)
        showError(errorMessage)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [context, isReady, t])

  const handleToggleNode = useCallback((nodeId: string) => {
    setTreeNodes(prev => {
      const toggleNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, expanded: !node.expanded }
          }
          if (node.children) {
            return { ...node, children: toggleNode(node.children) }
          }
          return node
        })
      }
      return toggleNode(prev)
    })
  }, [])

  const handleSelectNode = useCallback((node: TreeNode) => {
    setSelectedNodeId(node.id)
    setTreeNodes(prev => {
      const selectNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(n => ({
          ...n,
          selected: n.id === node.id,
          children: n.children ? selectNode(n.children) : undefined,
        }))
      }
      return selectNode(prev)
    })
  }, [])

  const filteredGalleries = useMemo(() => {
    let result = galleries

    // Apply hide empty filter
    if (hideEmpty) {
      result = result.filter(g => (g.photo_count || 0) > 0)
    }

    // Filter by selected tree node
    if (selectedNodeId) {
      const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node
          if (node.children) {
            const found = findNode(node.children, id)
            if (found) return found
          }
        }
        return null
      }
      
      const selectedNode = findNode(treeNodes, selectedNodeId)
      if (selectedNode && selectedNode.entityId) {
        // Filter by entity_id matching the season/sport
        if (selectedNode.type === 'season') {
          result = result.filter(g => g.entity_id === selectedNode.entityId)
        } else if (selectedNode.type === 'sport') {
          // For sports, we'd need to filter by teams/programs of that sport
          // For now, show all galleries as we don't have sport_id on galleries directly
        }
      }
    }

    // Filter by search query (debounced)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      result = result.filter(g => 
        (g.name || '').toLowerCase().includes(query) ||
        (g.title || '').toLowerCase().includes(query) ||
        (g.description || '').toLowerCase().includes(query)
      )
    }

    // Sort: galleries with photos first, then by most recent
    result = result.sort((a, b) => {
      const aHasPhotos = (a.photo_count || 0) > 0
      const bHasPhotos = (b.photo_count || 0) > 0
      
      if (aHasPhotos && !bHasPhotos) return -1
      if (!aHasPhotos && bHasPhotos) return 1
      
      // Both have photos or both are empty, sort by created_at (most recent first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result.slice(0, 6) // Show top 6 for card grid
  }, [galleries, debouncedSearchQuery, selectedNodeId, treeNodes, hideEmpty])

  const tableGalleries = useMemo(() => {
    let result = galleries

    // Apply hide empty filter
    if (hideEmpty) {
      result = result.filter(g => (g.photo_count || 0) > 0)
    }

    // Apply same filtering as card grid
    if (selectedNodeId) {
      const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node
          if (node.children) {
            const found = findNode(node.children, id)
            if (found) return found
          }
        }
        return null
      }
      
      const selectedNode = findNode(treeNodes, selectedNodeId)
      if (selectedNode && selectedNode.entityId) {
        if (selectedNode.type === 'season') {
          result = result.filter(g => g.entity_id === selectedNode.entityId)
        }
      }
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      result = result.filter(g => 
        (g.name || '').toLowerCase().includes(query) ||
        (g.title || '').toLowerCase().includes(query) ||
        (g.description || '').toLowerCase().includes(query)
      )
    }

    return result.slice(0, 10) // Show top 10 for table
  }, [galleries, debouncedSearchQuery, selectedNodeId, treeNodes, hideEmpty])

  const handleBrowseGallery = (id: string) => {
    if (!id) {
      showError(t('photos.errors.loadGallery'))
      return
    }
    
    // In demo mode, navigate to gallery page which has fake data support
    navigate(getLink('admin.photos.detail', { id }))
  }

  const handleViewAllGalleries = () => {
    if (USE_FAKE_DATA) {
      setDemoAction(t('photos.browse.viewAll'))
      setShowDemoModal(true)
      return
    }
    // Navigate to search/filter view or expand table
    navigate(getLink('admin.photos.search'))
  }

  const handleDeleteGallery = async (gallery: Gallery) => {
    if (USE_FAKE_DATA) {
      setDemoAction(t('photos.deleteGallery'))
      setShowDemoModal(true)
      return
    }
    
    setGalleryToDelete(gallery)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!galleryToDelete) return
    
    setDeleting(true)
    try {
      const { error } = await deleteGallery(context, galleryToDelete.id)
      
      if (error) {
        throw error
      }
      
      showSuccess(t('photos.success.galleryDeleted'))
      setDeleteModalOpen(false)
      setGalleryToDelete(null)
      
      // Refresh galleries
      setLoadingGalleries(true)
      const { data, error: loadError } = await getGalleriesForUser(context)
      if (!loadError && data) {
        setGalleries(data)
      }
    } catch (err) {
      const errorMessage = (err as Error)?.message || t('photos.errors.deleteGallery')
      showError(errorMessage)
    } finally {
      setDeleting(false)
      setLoadingGalleries(false)
    }
  }

  const handleEditGallery = (id: string) => {
    if (USE_FAKE_DATA) {
      setDemoAction(t('photos.editGallery'))
      setShowDemoModal(true)
      return
    }
    navigate(getLink('admin.photos.edit', { id }))
  }

  const getInitials = (contributor: GalleryContributor) => {
    const first = contributor.first_name?.charAt(0) || ''
    const last = contributor.last_name?.charAt(0) || ''
    return (first + last).toUpperCase() || '?'
  }

  const getContributorAvatars = (gallery: Gallery): GalleryContributor[] => {
    // Return cached contributors if available
    if (contributorsCache[gallery.id]) {
      return contributorsCache[gallery.id].slice(0, 3)
    }
    
    // For demo mode, return empty (will show placeholder)
    if (USE_FAKE_DATA) {
      return []
    }
    
    // In production, contributors would be loaded via useEffect
    // For now, return empty array
    return []
  }

  // Load contributors for visible galleries
  useEffect(() => {
    if (USE_FAKE_DATA || filteredGalleries.length === 0) return
    
    let mounted = true
    const loadContributors = async () => {
      const galleryIds = filteredGalleries.map(g => g.id)
      
      // Use functional update to access current cache without it being a dependency
      setContributorsCache(prevCache => {
        const idsToLoad = galleryIds.filter(id => !prevCache[id])
        
        if (idsToLoad.length === 0) return prevCache
        
        // Start async loading (will update cache when done)
        ;(async () => {
          const newEntries: Record<string, GalleryContributor[]> = {}
          
          for (const galleryId of idsToLoad) {
            try {
              const { data } = await getAthletesByGallery(context, galleryId)
              if (mounted && data) {
                newEntries[galleryId] = data.slice(0, 3)
              }
            } catch {
              // Silently handle errors - just don't add to cache
              newEntries[galleryId] = []
            }
          }
          
          if (mounted && Object.keys(newEntries).length > 0) {
            setContributorsCache(prev => ({ ...prev, ...newEntries }))
          }
        })()
        
        return prevCache // Return unchanged for now, async will update
      })
    }
    
    loadContributors()
    return () => { mounted = false }
  }, [filteredGalleries, context])

  if (loading) {
    return (
      <div className="photos-browse-new">
        <div className="browse-loading">
          <Card className="oa-h-64 oa-animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="photos-browse-new">
      {error && (
        <InlineNotice 
          tone="error" 
          title={t('photos.errors.loadGalleries')} 
          message={error} 
        />
      )}

      {/* Main Content Area */}
      <div className="browse-main-container">
        {/* Sidebar */}
        <aside className="browse-sidebar-new">
          <div className="sidebar-search-box">
            <span className="material-symbols-outlined sidebar-search-icon">search</span>
            <Input
              type="text"
              placeholder={t('photos.browse.searchTree')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          <div className="sidebar-filter-controls">
            <Checkbox
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
              label={t('photos.browse.navigation.hideEmpty')}
            />
          </div>

          <div className="sidebar-tree-container">
            {/* Global Library Label */}
            <div className="tree-section-label">
              <span className="material-symbols-outlined">folder_open</span>
              <span className="label-text">{t('photos.browse.globalLibrary')}</span>
            </div>

            {/* Tree Nodes */}
            <div className="tree-nodes">
              {treeNodes.map(node => (
                <div key={node.id} className="tree-node-group">
                  <button
                    className={`tree-node-item ${node.selected ? 'selected' : ''}`}
                    onClick={() => {
                      handleToggleNode(node.id)
                      handleSelectNode(node)
                    }}
                  >
                    <div className="tree-node-content">
                      <span className="material-symbols-outlined tree-node-sport-icon">{node.icon}</span>
                      <span className="tree-node-name">{node.name}</span>
                    </div>
                    <span className="material-symbols-outlined tree-node-expand-icon">
                      {node.expanded ? 'expand_more' : 'chevron_right'}
                    </span>
                  </button>

                  {node.expanded && node.children && (
                    <div className="tree-node-children">
                      {node.children.map(child => (
                        <button
                          key={child.id}
                          className={`tree-child-item ${child.selected ? 'selected' : ''}`}
                          onClick={() => handleSelectNode(child)}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recent Archives */}
            <div className="tree-section-label recent-archives">
              <span className="label-text">{t('photos.browse.recentArchives')}</span>
            </div>
            <div className="archive-item">
              <span className="material-symbols-outlined">history</span>
              <span className="archive-name">Fall Championship '23</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="browse-content-area">
          {/* Gallery Cards Grid - Show only first 3 */}
          <div className="gallery-cards-grid">
            {filteredGalleries.slice(0, 3).map((gallery) => (
              <Card key={gallery.id} className="gallery-card-modern">
                <div className="card-image-container">
                  {gallery.cover_url ? (
                    <img 
                      src={gallery.cover_url} 
                      alt={gallery.name || gallery.title || 'Gallery'} 
                      className="card-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('card-image-overlay')
                      }}
                    />
                  ) : (
                    <div className="card-image-placeholder">
                      <span className="material-symbols-outlined">photo_library</span>
                    </div>
                  )}
                  <div className="card-image-overlay" />
                  {gallery.photo_count && gallery.photo_count > 50 && (
                    <div className="card-featured-badge">
                      <span className="material-symbols-outlined">stars</span>
                      <span>{t('photos.browse.featuredLabel')}</span>
                    </div>
                  )}
                </div>

                <div className="card-content-area">
                  <div className="card-header-section">
                    <div className="card-title-row">
                      <h3 className="card-title">{gallery.name || gallery.title || 'Untitled'}</h3>
                    </div>
                    <p className="card-meta">
                      {gallery.photo_count || 0} {t('photos.photos')} • {new Date(gallery.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="card-footer-section">
                    <div className="card-contributors">
                      {getContributorAvatars(gallery).map((contributor) => (
                        <div 
                          key={contributor.id} 
                          className="contributor-avatar" 
                          title={`${contributor.first_name} ${contributor.last_name}`}
                        >
                          {contributor.avatar_url ? (
                            <img src={contributor.avatar_url} alt={`${contributor.first_name} ${contributor.last_name}`} />
                          ) : (
                            <span className="avatar-initials">{getInitials(contributor)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      className="card-browse-button"
                      onClick={() => handleBrowseGallery(gallery.id)}
                    >
                      {t('photos.browse.browseDeck')}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Table Section */}
          <Card className="gallery-table-card">
            <div className="table-card-header">
              <h4 className="table-title">{t('photos.browse.allRegisteredDecks')}</h4>
              <Button 
                variant="ghost" 
                size="compact"
                onClick={handleViewAllGalleries}
              >
                {t('photos.browse.viewAll')}
              </Button>
            </div>

            <table className="gallery-table-modern">
              <thead>
                <tr>
                  <th>{t('photos.browse.type')}</th>
                  <th>{t('photos.browse.albumName')}</th>
                  <th>{t('photos.browse.mediaCount')}</th>
                  <th>{t('photos.browse.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tableGalleries.map((gallery) => (
                  <tr 
                    key={gallery.id} 
                    className="table-row-hover"
                    onClick={() => handleBrowseGallery(gallery.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="table-type-cell">
                      {gallery.cover_url && (
                        <div 
                          className="table-type-cover"
                          style={{ backgroundImage: `url(${gallery.cover_url})` }}
                        />
                      )}
                      <div className="table-type-overlay" />
                      <span className="table-type-text">{gallery.gallery_type || 'org'}</span>
                    </td>
                    <td>
                      <div className="table-name-cell">
                        <div className="table-name">{gallery.name || gallery.title || 'Untitled'}</div>
                        <div className="table-date">{new Date(gallery.created_at).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td>
                      <div className="table-count">{gallery.photo_count || 0} Photos</div>
                    </td>
                    <td>
                      <span className={`table-status-badge ${gallery.visibility === 'public' ? 'public' : 'draft'}`}>
                        {gallery.visibility === 'public' ? t('photos.browse.publicStatus') : t('photos.browse.draftStatus')}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="oa-flex oa-gap-2">
                        <button 
                          className="table-more-button"
                          onClick={() => handleBrowseGallery(gallery.id)}
                          title={t('photos.viewGallery')}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button 
                          className="table-more-button"
                          onClick={() => handleEditGallery(gallery.id)}
                          title={t('photos.editGallery')}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        {!gallery.is_system_generated && (
                          <button 
                            className="table-more-button"
                            onClick={() => handleDeleteGallery(gallery)}
                            title={t('photos.deleteGallery')}
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {/* Demo Mode Modal */}
      <Modal
        open={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        title={t('photos.demoMode.title')}
      >
        <p className="oa-text-sm oa-text-muted oa-mb-4">
          {demoAction && t('photos.demoMode.message')}
        </p>
        <div className="oa-flex oa-justify-end">
          <Button variant="primary" onClick={() => setShowDemoModal(false)}>
            {t('common.ok')}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        title={t('photos.deleteGallery')}
      >
        <p className="oa-text-sm oa-mb-4">
          {t('photos.bulk.confirmDeleteEmpty', { count: 1 })}
          {galleryToDelete && (
            <strong className="oa-block oa-mt-2">{galleryToDelete.name || galleryToDelete.title}</strong>
          )}
        </p>
        <div className="oa-flex oa-justify-end oa-gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleting}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
            loading={deleting}
            disabled={deleting}
          >
            {t('photos.deleteGallery')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
