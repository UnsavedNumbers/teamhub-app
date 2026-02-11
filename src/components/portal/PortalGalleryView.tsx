import { useState } from 'react';
import { Gallery, LazyImage } from '@/components/shared/Gallery';
import { useGallerySelection } from '@/components/shared/Gallery/hooks';
import { GalleryItem } from '@/components/shared/Gallery/types';
import { GalleryPhoto, getGalleryPhotoThumbnailUrl, Gallery as GalleryType } from '@/data/services/galleryService';
import { PhotoBookmarkButton } from '@/components/gallery/PhotoBookmarkButton';
import { useI18n } from '@/i18n/useI18n';

interface PortalGalleryItem extends GalleryItem, GalleryPhoto {
}

interface PortalGalleryViewProps {
  gallery: GalleryType | null;
  photos: GalleryPhoto[];
  loading?: boolean;
  bookmarkedIds: Set<string>;
  onBookmarkChange: (photoId: string, isBookmarked: boolean) => void;
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void;
  className?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function PortalGalleryView({
  gallery,
  photos,
  loading = false,
  bookmarkedIds,
  onBookmarkChange,
  onPhotoClick,
  className,
  selectedIds: controlledSelectedIds,
  onSelectionChange: controlledOnSelectionChange,
}: PortalGalleryViewProps) {
  void gallery
  const { t } = useI18n();

  // Internal selection state
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const onSelectionChange = controlledOnSelectionChange ?? setInternalSelectedIds;

  // Adapt photos
  const items: PortalGalleryItem[] = photos.map(photo => ({
    ...photo,
    title: photo.caption || t('photos.photo'), // fallback title
    thumbnailUrl: getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path),
    createdAt: new Date(photo.created_at)
  }));

  const { handleSelect } = useGallerySelection({
    items,
    selectionMode: 'multiple',
    selectedIds,
    onSelectionChange
  });

  const renderItem = (item: PortalGalleryItem, isSelected: boolean) => {
    return (
      <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50 hover:shadow-xl transition-all duration-300">
        <LazyImage
          src={item.thumbnailUrl} 
          alt={item.title}
          className="w-full h-full"
        />
        
        {/* Bookmark Overlay Top Left */}
        <div 
          className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <PhotoBookmarkButton 
            photoId={item.id}
            isBookmarked={bookmarkedIds.has(item.id)}
            onChanged={(isBookmarked) => onBookmarkChange(item.id, isBookmarked)}
          />
        </div>

        {/* Selection Checkbox Overlay Top Right */}
        <div 
          className={`absolute top-4 right-4 z-20 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(item.id, e.ctrlKey || e.metaKey, e.shiftKey);
          }}
        >
             <div className={`size-6 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-blue-600' : 'bg-white/20 backdrop-blur-md'}`}>
               {isSelected && <span className="text-white text-xs font-bold">✓</span>}
             </div>
        </div>

        {/* Caption Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white font-medium text-sm truncate">{item.title}</p>
        </div>
      </div>
    );
  };

  const handleItemClick = (item: PortalGalleryItem) => {
    if (onPhotoClick) {
      const index = photos.findIndex(p => p.id === item.id);
      onPhotoClick(item, index);
    }
  };

  return (
    <Gallery<PortalGalleryItem>
      items={items}
      isLoading={loading}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      selectionMode="multiple"
      viewMode="grid"
      
      renderItem={renderItem}
      onItemClick={handleItemClick}
      
      className={className}
      classNames={{
        item: 'rounded-2xl overflow-hidden',
        root: 'border-none shadow-none bg-transparent',
        toolbar: 'hidden', // Hide default toolbar, assumed handled purely by page
        content: 'p-0 bg-transparent'
      }}
    />
  );
}
