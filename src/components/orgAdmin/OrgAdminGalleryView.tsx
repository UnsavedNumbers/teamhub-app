import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gallery, LazyImage } from '@/components/shared/Gallery';
import { useGallerySelection } from '@/components/shared/Gallery/hooks';
import { GalleryItem } from '@/components/shared/Gallery/types';
import { GalleryPhoto, getGalleryPhotoThumbnailUrl, Gallery as GalleryType } from '@/data/services/galleryService';
import { Button } from '@/components/platformAdmin';
import { getLink } from '@/utils/routes';
import { useI18n } from '@/i18n/useI18n';

// Adapter to match GalleryItem interface
interface AdminGalleryItem extends GalleryItem, GalleryPhoto {
}

interface OrgAdminGalleryViewProps {
  gallery: GalleryType | null;
  photos: GalleryPhoto[];
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void;
  onDelete?: (ids: string[]) => void;
  onModerate?: (ids: string[], action: 'approve' | 'reject') => void;
  onTagPhoto?: (photoId: string) => void;
  onSetCover?: (photoId: string) => void;
  renderToolbar?: (props: any) => React.ReactNode;
  className?: string;
  selectionMode?: 'multiple' | 'single' | 'none';
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

interface PhotoActionsDropdownProps {
  photo: GalleryPhoto;
  gallery: GalleryType | null;
  onAction: (action: string, photoId: string) => void;
}

function PhotoActionsDropdown({ photo, gallery, onAction }: PhotoActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const tAny = t as any;

  const status = photo.approval_status || photo.status;
  const isPending = status === 'pending';

  return (
    <div className="oa-photo-actions">
      <button
        type="button"
        className="oa-photo-actions-trigger"
        onClick={() => setOpen(!open)}
        aria-label={t('common.actions')}
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>
      {open && (
        <>
          <div
            className="oa-photo-actions-backdrop"
            onClick={() => setOpen(false)}
          />
          <div className="oa-photo-actions-menu">
            {/* View / Go to Gallery */}
            {gallery && (
              <button
                type="button"
                className="oa-photo-actions-item"
                onClick={() => {
                  onAction('viewGallery', photo.id);
                  setOpen(false);
                }}
              >
                <span className="material-symbols-outlined">photo_library</span>
                <span>{t('photos.goToGallery')}</span>
              </button>
            )}

            {/* Tag Athletes */}
            <button
              type="button"
              className="oa-photo-actions-item"
              onClick={() => {
                onAction('tag', photo.id);
                setOpen(false);
              }}
            >
              <span className="material-symbols-outlined">tag</span>
              <span>{t('photos.tagAthletes')}</span>
            </button>

            {/* Set as Cover */}
            {gallery && gallery.cover_photo_id !== photo.id && (
              <button
                type="button"
                className="oa-photo-actions-item"
                onClick={() => {
                  onAction('setCover', photo.id);
                  setOpen(false);
                }}
              >
                <span className="material-symbols-outlined">star</span>
                <span>{t('photos.setAsCover')}</span>
              </button>
            )}

            {/* Divider */}
            <div className="oa-photo-actions-divider" />

            {/* Approve (if pending) */}
            {isPending && (
              <button
                type="button"
                className="oa-photo-actions-item oa-photo-actions-item--success"
                onClick={() => {
                  onAction('approve', photo.id);
                  setOpen(false);
                }}
              >
                <span className="material-symbols-outlined">check_circle</span>
                <span>{t('common.approve')}</span>
              </button>
            )}

            {/* Reject */}
            <button
              type="button"
              className="oa-photo-actions-item oa-photo-actions-item--danger"
              onClick={() => {
                onAction('reject', photo.id);
                setOpen(false);
              }}
            >
              <span className="material-symbols-outlined">cancel</span>
              <span>{t('common.reject')}</span>
            </button>

            {/* Remove from Gallery */}
            <button
              type="button"
              className="oa-photo-actions-item oa-photo-actions-item--danger"
              onClick={() => {
                onAction('remove', photo.id);
                setOpen(false);
              }}
            >
              <span className="material-symbols-outlined">delete</span>
              <span>{t('common.remove')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function OrgAdminGalleryView({
  gallery,
  photos,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
  onPhotoClick,
  onDelete,
  onModerate,
  onTagPhoto,
  onSetCover,
  renderToolbar,
  className,
  selectionMode = 'multiple',
  selectedIds: controlledSelectedIds,
  onSelectionChange: controlledOnSelectionChange,
}: OrgAdminGalleryViewProps) {

  const { t } = useI18n();
  const navigate = useNavigate();

  // Internal selection state if not controlled
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const onSelectionChange = controlledOnSelectionChange ?? setInternalSelectedIds;

  // Adapt photos to GalleryItem
  const items: AdminGalleryItem[] = photos.map(photo => ({
    ...photo,
    title: photo.filename || 'Untitled',
    thumbnailUrl: photo.thumbnail_url || getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path),
    createdAt: new Date(photo.created_at)
  }));

  const { handleSelect } = useGallerySelection({
     items,
     selectionMode,
     selectedIds,
     onSelectionChange
  });

  const handleItemClick = (item: AdminGalleryItem) => {
    if (onPhotoClick) {
      const index = photos.findIndex(p => p.id === item.id);
      onPhotoClick(item, index);
      return;
    }

    // Navigate to detail
    if (gallery) {
      navigate(getLink('admin.photos.photo', { galleryId: gallery.id, photoId: item.id }));
    }
  };

  const handleAction = (action: string, photoId: string) => {
    switch (action) {
      case 'viewGallery':
        if (gallery) {
          navigate(getLink('admin.photos.detail', { galleryId: gallery.id }));
        }
        break;
      case 'tag':
        onTagPhoto?.(photoId);
        break;
      case 'setCover':
        onSetCover?.(photoId);
        break;
      case 'approve':
        onModerate?.([photoId], 'approve');
        break;
      case 'reject':
        onModerate?.([photoId], 'reject');
        break;
      case 'remove':
        onDelete?.([photoId]);
        break;
    }
  };

  const renderGridItem = (item: AdminGalleryItem, isSelected: boolean) => {
    const status = item.approval_status || item.status;
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';
    const isCover = gallery?.cover_photo_id === item.id;
    const taggedCount = item.tagged_athletes?.length || 0;

    return (
      <div className="oa-photo-grid-item">
        {/* Thumbnail container - smaller for compact display */}
        <div className="oa-photo-thumb">
          <LazyImage
            src={item.thumbnailUrl}
            alt={item.title}
            className="oa-photo-thumb-img"
          />

          {/* Status badge */}
          <div className="oa-photo-badges">
            {isCover && (
              <span className="oa-photo-badge oa-photo-badge--cover">
                <span className="material-symbols-outlined oa-photo-badge-icon">star</span>
              </span>
            )}
            {isPending && (
              <span className="oa-photo-badge oa-photo-badge--pending">
                {t('photos.pendingApproval.short')}
              </span>
            )}
            {isRejected && (
              <span className="oa-photo-badge oa-photo-badge--rejected">
                {t('common.rejected')}
              </span>
            )}
          </div>

          {/* Selection checkbox */}
          <div
            className={`oa-photo-select ${isSelected ? 'oa-photo-select--selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(item.id, e.ctrlKey || e.metaKey, e.shiftKey);
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              readOnly
              className="oa-photo-select-checkbox"
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="oa-photo-meta">
          {/* Filename */}
          <p className="oa-photo-filename" title={item.title}>
            {item.title}
          </p>

          {/* Tags count and date */}
          <div className="oa-photo-info">
            {taggedCount > 0 && (
              <span className="oa-photo-tag-count">
                <span className="material-symbols-outlined oa-photo-tag-icon">person</span>
                {taggedCount}
              </span>
            )}
            <span className="oa-photo-date">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions dropdown */}
        <PhotoActionsDropdown
          photo={item}
          gallery={gallery}
          onAction={handleAction}
        />
      </div>
    );
  };

  const renderListItem = (item: AdminGalleryItem, isSelected: boolean) => {
    const status = item.approval_status || item.status;
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';
    const isCover = gallery?.cover_photo_id === item.id;
    const taggedCount = item.tagged_athletes?.length || 0;

    // Build tagged athletes list
    const taggedNames = item.tagged_athletes?.map(a => `${a.first_name} ${a.last_name}`).join(', ') || '';

    return (
      <div className="oa-photo-list-item">
        {/* Selection checkbox */}
        <div
          className={`oa-photo-list-select ${isSelected ? 'oa-photo-list-select--selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(item.id, e.ctrlKey || e.metaKey, e.shiftKey);
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className="oa-photo-list-select-checkbox"
          />
        </div>

        {/* Thumbnail - small in list view */}
        <div className="oa-photo-list-thumb">
          <LazyImage
            src={item.thumbnailUrl}
            alt={item.title}
            className="oa-photo-list-thumb-img"
          />
        </div>

        {/* Photo info */}
        <div className="oa-photo-list-info">
          <div className="oa-photo-list-header">
            <p className="oa-photo-list-filename" title={item.title}>
              {item.title}
            </p>
            <div className="oa-photo-list-badges">
              {isCover && (
                <span className="oa-photo-badge oa-photo-badge--cover oa-photo-badge--sm">
                  <span className="material-symbols-outlined oa-photo-badge-icon">star</span>
                </span>
              )}
              {isPending && (
                <span className="oa-photo-badge oa-photo-badge--pending oa-photo-badge--sm">
                  {t('photos.pendingApproval.short')}
                </span>
              )}
              {isRejected && (
                <span className="oa-photo-badge oa-photo-badge--rejected oa-photo-badge--sm">
                  {t('common.rejected')}
                </span>
              )}
            </div>
          </div>

          {/* Tagged athletes */}
          {taggedCount > 0 && (
            <p className="oa-photo-list-tagged" title={taggedNames}>
              <span className="material-symbols-outlined oa-photo-list-tag-icon">person</span>
              {taggedCount} {taggedCount === 1 ? t('photos.athlete') : t('photos.athletes')}: {taggedNames}
            </p>
          )}

          {/* Caption */}
          {item.caption && (
            <p className="oa-photo-list-caption" title={item.caption}>
              {item.caption}
            </p>
          )}

          {/* Metadata row */}
          <div className="oa-photo-list-meta">
            <span className="oa-photo-list-date">
              <span className="material-symbols-outlined oa-photo-list-meta-icon">calendar_today</span>
              {new Date(item.created_at).toLocaleDateString()}
            </span>
            {item.size_bytes && (
              <span className="oa-photo-list-size">
                {(item.size_bytes / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
            {item.uploaded_by && (
              <span className="oa-photo-list-uploader">
                <span className="material-symbols-outlined oa-photo-list-meta-icon">person_outline</span>
                {item.uploaded_by}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="oa-photo-list-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleAction('viewGallery', item.id);
            }}
          >
            <span className="material-symbols-outlined">photo_library</span>
          </Button>
          {isPending && (
            <Button
              variant="ghost"
              size="small"
              className="oa-photo-list-action--success"
              onClick={(e) => {
                e.stopPropagation();
                handleAction('approve', item.id);
              }}
            >
              <span className="material-symbols-outlined">check_circle</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="small"
            className="oa-photo-list-action--danger"
            onClick={(e) => {
              e.stopPropagation();
              handleAction('reject', item.id);
            }}
          >
            <span className="material-symbols-outlined">cancel</span>
          </Button>
          <PhotoActionsDropdown
            photo={item}
            gallery={gallery}
            onAction={handleAction}
          />
        </div>
      </div>
    );
  };

  return (
    <Gallery<AdminGalleryItem>
      items={items}
      isLoading={loading}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      selectionMode={selectionMode}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}

      renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
      renderToolbar={renderToolbar}

      onItemClick={handleItemClick}

      className={className}
      classNames={{
        root: 'border-none shadow-none bg-transparent',
        grid: 'oa-photo-grid',
        item: viewMode === 'grid' ? '' : '',
        content: 'p-0',
        toolbar: 'hidden'
      }}
    />
  );
}
