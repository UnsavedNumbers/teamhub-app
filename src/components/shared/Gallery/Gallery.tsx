import React, { useState } from 'react';
import { GalleryProps, GalleryItem, ToolbarContext } from './types';
import { GalleryLoadingState } from './GalleryLoadingState';
import { GalleryErrorState } from './GalleryErrorState';
import { GalleryEmptyState } from './GalleryEmptyState';
import { GalleryToolbar } from './GalleryToolbar';
import { MemoizedGalleryGrid } from './GalleryGrid';
import { MemoizedGalleryList } from './GalleryList';
import { cn } from '@/utils/cn';

// Define the component
export function Gallery<T extends GalleryItem>(props: GalleryProps<T>) {
  const {
    items,
    isLoading,
    error,
    viewMode: controlledViewMode = 'grid',
    onViewModeChange,
    searchQuery: controlledSearchQuery = '',
    onSearchChange,
    renderToolbar,
    renderEmptyState,
    items: _items, // access items again for clarity
    totalCount,
    selectedIds = [],
    className,
    classNames,
    ...restProps
  } = props;

  // Internal state for uncontrolled props
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  const viewMode = onViewModeChange ? controlledViewMode : internalViewMode;
  const searchQuery = onSearchChange ? controlledSearchQuery : internalSearchQuery;

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const handleSearchChange = (query: string) => {
    if (onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearchQuery(query);
    }
  };

  const toolbarContext: ToolbarContext<T> = {
    selectedItems: items.filter(i => selectedIds.includes(i.id)), // This might be slow if items is large? But items is usually one page.
    totalCount: totalCount ?? items.length,
    viewMode,
    searchQuery
  };

  const renderContent = () => {
    if (error) {
      return (
        <GalleryErrorState 
          error={error} 
          className={classNames?.content}
        />
      );
    }

    if (isLoading) {
      return (
        <GalleryLoadingState 
          className={classNames?.content}
          itemCount={props.pageSize}
        />
      );
    }

    if (items.length === 0) {
      return renderEmptyState ? renderEmptyState() : (
        <GalleryEmptyState className={classNames?.content} />
      );
    }

    if (viewMode === 'list') {
      return (
        <MemoizedGalleryList
          items={items}
          selectedIds={selectedIds}
          classNames={classNames}
          {...restProps}
        />
      );
    }

    return (
      <MemoizedGalleryGrid
        items={items}
        selectedIds={selectedIds}
        classNames={classNames}
        {...restProps}
      />
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200', className, classNames?.root)}>
      {/* Toolbar */}
      <div className={cn(classNames?.toolbar)}>
        {renderToolbar ? (
          renderToolbar(toolbarContext)
        ) : (
          <GalleryToolbar
            context={toolbarContext}
            onViewModeChange={handleViewModeChange}
            onSearchChange={handleSearchChange}
            actions={props.toolbarActions}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {renderContent()}
      </div>

      {/* Pagination Container (Optional - simple placeholder for now or passed via children/after) */}
      {/* 
         The plan didn't strictly specify a Pagination component in the core set,
         but the types include pagination props. 
         Usually specific pagination is rendered below the gallery by the parent, 
         or we can add a footer slot. 
         For now, we'll leave it to the consumer or add a basic one later if requested.
      */}
    </div>
  );
}
