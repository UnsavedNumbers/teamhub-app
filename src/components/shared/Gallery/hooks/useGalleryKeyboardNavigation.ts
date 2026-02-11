import { useCallback, KeyboardEvent } from 'react';
import { useRovingTabIndex } from './useRovingTabIndex';
import { GalleryItem } from '../types';

interface UseGalleryKeyboardNavigationProps<T extends GalleryItem> {
    items: T[];
    columns: number;
    onSelect?: (item: T) => void;
    onSelectionChange?: (ids: string[]) => void;
}

export function useGalleryKeyboardNavigation<T extends GalleryItem>({
    items,
    columns,
    onSelect,
}: UseGalleryKeyboardNavigationProps<T>) {

    const { focusedIndex, setFocusedIndex, handleKeyDown: handleRovingKeyDown, containerRef } = useRovingTabIndex(items.length, columns);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Let roving tab index handle navigation arrows
        handleRovingKeyDown(e);

        // Handle selection on Enter/Space
        if (e.key === 'Enter' || e.key === ' ') {
            // Prevent scrolling on Space
            if (e.key === ' ') e.preventDefault();

            const item = items[focusedIndex];
            if (item && onSelect) {
                onSelect(item);
            }
        }
    }, [handleRovingKeyDown, items, focusedIndex, onSelect]);

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        containerRef
    };
}
