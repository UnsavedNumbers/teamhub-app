import React from 'react';
import { ToolbarContext, GalleryItem } from './types';
import { cn } from '@/utils/cn';

interface GalleryToolbarProps<T extends GalleryItem> {
  context: ToolbarContext<T>;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onSearchChange?: (query: string) => void;
  className?: string;
  // Additional slot for custom actions
  actions?: React.ReactNode;
}

export function GalleryToolbar<T extends GalleryItem>({ 
  context, 
  onViewModeChange,
  onSearchChange,
  className,
  actions
}: GalleryToolbarProps<T>) {
  const { totalCount, selectedItems, viewMode, searchQuery } = context;

  return (
    <div className={cn('flex items-center justify-between p-4 border-b bg-white', className)}>
      <div className="flex items-center space-x-4">
        {selectedItems.length > 0 ? (
          <span className="font-medium text-gray-700">
            {selectedItems.length} selected
          </span>
        ) : (
          <span className="text-gray-500">
            {totalCount} items
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <svg 
              className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        )}

        {/* View Toggles */}
        {onViewModeChange && (
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'p-1.5 hover:bg-gray-50',
                viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'
              )}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'p-1.5 hover:bg-gray-50',
                viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500'
              )}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}

        {/* Custom Actions */}
        {actions}
      </div>
    </div>
  );
}
