import React from 'react';

// ============================================================
// BASE INTERFACES
// ============================================================

/**
 * Base interface for gallery items. Extend this for role-specific properties.
 * @example
 * interface PortalPhoto extends GalleryItem {
 *   eventId: string;
 *   isFavorite: boolean;
 * }
 */
export interface GalleryItem {
    /** Unique identifier for the item */
    id: string;
    /** Display title for the item */
    title: string;
    /** URL for thumbnail image */
    thumbnailUrl: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
}

// ============================================================
// COMPONENT PROPS
// ============================================================

export interface GalleryProps<T extends GalleryItem = GalleryItem> {
    // ----------------------
    // DATA (Required)
    // ----------------------
    /** Array of items to display */
    items: T[];

    // ----------------------
    // DATA (Optional)
    // ----------------------
    /** Loading state indicator */
    isLoading?: boolean;
    /** Error object if data fetch failed */
    error?: Error | null;

    // ----------------------
    // PAGINATION
    // ----------------------
    /** Total count of items (for pagination) */
    totalCount?: number;
    /** Current page number (1-indexed) */
    page?: number;
    /** Number of items per page */
    pageSize?: number;
    /** Callback when page changes */
    onPageChange?: (page: number) => void;

    // ----------------------
    // SELECTION
    // ----------------------
    /** Selection mode: none, single, or multiple */
    selectionMode?: 'none' | 'single' | 'multiple';
    /** Array of selected item IDs (controlled) */
    selectedIds?: string[];
    /** Callback when selection changes */
    onSelectionChange?: (ids: string[]) => void;

    // ----------------------
    // VIEW OPTIONS
    // ----------------------
    /** Current view mode */
    viewMode?: 'grid' | 'list';
    /** Callback when view mode changes */
    onViewModeChange?: (mode: 'grid' | 'list') => void;

    // ----------------------
    // SEARCH & FILTER
    // ----------------------
    /** Current search query */
    searchQuery?: string;
    /** Callback when search query changes */
    onSearchChange?: (query: string) => void;
    /** Available filter configurations */
    filters?: FilterConfig[];
    /** Currently active filter values */
    activeFilters?: Record<string, unknown>;
    /** Callback when filters change */
    onFilterChange?: (filters: Record<string, unknown>) => void;

    // ----------------------
    // CUSTOMIZATION SLOTS
    // ----------------------
    /** Custom item renderer (overrides default) */
    renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
    /** Custom toolbar renderer (replaces default toolbar) */
    renderToolbar?: (context: ToolbarContext<T>) => React.ReactNode;
    /** Custom empty state renderer */
    renderEmptyState?: () => React.ReactNode;
    /** Custom item actions renderer (shown on hover) */
    renderItemActions?: (item: T) => React.ReactNode;

    /** Custom actions to display in the default toolbar */
    toolbarActions?: React.ReactNode;

    // ----------------------
    // EVENTS
    // ----------------------
    /** Called when an item is clicked */
    onItemClick?: (item: T) => void;
    /** Called when an item is double-clicked */
    onItemDoubleClick?: (item: T) => void;
    /** Called when right-clicking an item */
    onItemContextMenu?: (item: T, event: React.MouseEvent) => void;

    // ----------------------
    // STYLING
    // ----------------------
    /** Additional class name for root element */
    className?: string;
    /** Class name overrides for sub-elements */
    classNames?: GalleryClassNames;

    // ----------------------
    // ACCESSIBILITY
    // ----------------------
    /** Accessible label for the gallery region */
    'aria-label'?: string;

    // ----------------------
    // PERFORMANCE
    // ----------------------
    /** Enable virtualization for large lists (500+ items) */
    virtualize?: boolean;
}

// ============================================================
// SUPPORTING INTERFACES
// ============================================================

export interface ToolbarContext<T extends GalleryItem> {
    /** Currently selected items */
    selectedItems: T[];
    /** Total count of items */
    totalCount: number;
    /** Current view mode */
    viewMode: 'grid' | 'list';
    /** Current search query */
    searchQuery: string;
}

export interface FilterConfig {
    /** Unique identifier for the filter */
    id: string;
    /** Display label */
    label: string;
    /** Filter input type */
    type: 'select' | 'date-range' | 'checkbox' | 'text';
    /** Options for select type */
    options?: { value: string; label: string }[];
}

export interface GalleryClassNames {
    /** Root container */
    root?: string;
    /** Toolbar area */
    toolbar?: string;
    /** Grid/list container */
    content?: string;
    /** Individual grid item */
    item?: string;
    /** Pagination area */
    pagination?: string;
}
