import React, { useRef, useEffect } from 'react';
import { GalleryItem, GalleryProps } from './types';
import { useGalleryKeyboardNavigation } from './hooks/useGalleryKeyboardNavigation';
import { LazyImage } from './LazyImage';
import { cn } from '@/utils/cn';

interface GalleryGridProps<T extends GalleryItem> extends Pick<GalleryProps<T>, 
  'items' | 'selectedIds' | 'onItemClick' | 'onItemDoubleClick' | 'onItemContextMenu' | 'renderItem' | 'renderItemActions' | 'classNames'
> {
  columns?: number;
}

export function GalleryGrid<T extends GalleryItem>({
  items,
  selectedIds = [],
  onItemClick,
  onItemDoubleClick,
  onItemContextMenu,
  renderItem,
  renderItemActions,
  classNames,
  columns = 4, // Default columns
}: GalleryGridProps<T>) {
  
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Navigation
  // We use the keyboard navigation hook to handle arrow keys and Enter/Space
  // Note: onItemClick is usually for selection, so we map Enter/Space to it
  const { focusedIndex, handleKeyDown } = useGalleryKeyboardNavigation({
    items,
    columns,
    onSelect: (item) => onItemClick?.(item)
  });

  // Focus management
  useEffect(() => {
    const el = itemRefs.current[focusedIndex];
    if (el) {
      el.focus();
    }
  }, [focusedIndex]);

  // Event Delegation Handlers
  const handleGridClick = (e: React.MouseEvent) => {
    // We can rely on individual item click handlers if we attach them, 
    // OR use delegation as planned. The plan suggested delegation.
    // However, for React, attaching onClick to the item is often idiomatic and fine for < 1000 items.
    // The plan said "Process: Event Delegation at Grid Level".
    
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) {
      onItemClick?.(item);
    }
  };

  const handleGridDoubleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) {
      onItemDoubleClick?.(item);
    }
  };

  const handleGridContextMenu = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-gallery-item-id]');
    if (!target) return;
    
    e.preventDefault(); // Prevent default context menu
    const id = target.getAttribute('data-gallery-item-id');
    const item = items.find(i => i.id === id);
    if (item) {
      onItemContextMenu?.(item, e);
    }
  };

  // Determine grid columns class based on prop
  // This is a naive implementation; normally we'd want responsive classes passed in
  // or a style object. The plan used 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
  const gridClass = `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-${Math.min(columns, 4)} lg:grid-cols-${columns} gap-4`;

  return (
    <div 
      role="grid"
      className={cn(gridClass, 'outline-none', classNames?.content)}
      onKeyDown={handleKeyDown}
      onClick={handleGridClick}
      onDoubleClick={handleGridDoubleClick}
      onContextMenu={handleGridContextMenu}
      tabIndex={-1} // Container is not focusable, items are
    >
      {items.map((item, index) => {
        const isSelected = selectedIds.includes(item.id);
        const isFocused = index === focusedIndex;

        return (
          <div
            key={item.id}
            ref={el => itemRefs.current[index] = el}
            data-gallery-item-id={item.id}
            role="gridcell"
            tabIndex={isFocused ? 0 : -1}
            className={cn(
              'relative group rounded-lg overflow-hidden border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-500',
              isSelected ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
              classNames?.item
            )}
          >
            {renderItem ? (
              renderItem(item, isSelected)
            ) : (
              // Default Item Renderer
              <div className="aspect-square bg-gray-100 relative">
                <LazyImage
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay gradient for text readability */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                </div>

                {/* Selection Checkbox (Visual only, Logic handled by grid click) */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Hover Actions */}
            {renderItemActions && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {renderItemActions(item)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Optimization: Memoize the component
export const MemoizedGalleryGrid = React.memo(GalleryGrid) as typeof GalleryGrid;
