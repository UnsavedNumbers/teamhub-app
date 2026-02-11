import React, { useRef, useEffect } from 'react';
import { GalleryItem, GalleryProps } from './types';
import { useGalleryKeyboardNavigation } from './hooks/useGalleryKeyboardNavigation';
import { LazyImage } from './LazyImage';
import { cn } from '@/utils/cn';

interface GalleryListProps<T extends GalleryItem> extends Pick<GalleryProps<T>, 
  'items' | 'selectedIds' | 'onItemClick' | 'onItemDoubleClick' | 'onItemContextMenu' | 'renderItem' | 'renderItemActions' | 'classNames'
> {}

export function GalleryList<T extends GalleryItem>({
  items,
  selectedIds = [],
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  renderItem,
  renderItemActions,
  classNames,
}: GalleryListProps<T>) {
  
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { focusedIndex, handleKeyDown } = useGalleryKeyboardNavigation({
    items,
    columns: 1, // List view behaves like 1 column grid
    onSelect: (item) => onItemClick?.(item)
  });

  useEffect(() => {
    const el = itemRefs.current[focusedIndex];
    if (el) {
      el.focus();
    }
  }, [focusedIndex]);

  // Event Handlers (Duplicate logic from Grid, could be extracted but keeping separate for now due to DOM reuse)
  const handleListClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) onItemClick?.(item);
  };

  const handleListDoubleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) onItemDoubleClick?.(item);
  };

  const handleListContextMenu = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    e.preventDefault();
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) onItemContextMenu?.(item, e);
  };

  return (
    <div 
      role="list" 
      className={cn('flex flex-col space-y-2', classNames?.content)}
      onKeyDown={handleKeyDown}
      onClick={handleListClick}
      onDoubleClick={handleListDoubleClick}
      onContextMenu={handleListContextMenu}
    >
      {items.map((item, index) => {
        const isSelected = selectedIds.includes(item.id);
        const isFocused = index === focusedIndex;

        return (
          <div
            key={item.id}
            ref={el => itemRefs.current[index] = el}
            data-gallery-item-id={item.id}
            role="listitem"
            tabIndex={isFocused ? 0 : -1}
            className={cn(
              'group flex items-center p-3 rounded-lg border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-500',
              isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50',
              classNames?.item
            )}
          >
            {renderItem ? (
              renderItem(item, isSelected)
            ) : (
              // Default List Item Renderer
              <>
                <div className="w-16 h-16 flex-shrink-0 mr-4">
                  <LazyImage
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </>
            )}

            {/* Actions always visible in list view or on hover? Usually hover or right align */}
            <div className="flex items-center ml-4 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
               {renderItemActions && renderItemActions(item)}
            </div>
            
            {isSelected && (
              <div className="ml-4 text-blue-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const MemoizedGalleryList = React.memo(GalleryList) as typeof GalleryList;
