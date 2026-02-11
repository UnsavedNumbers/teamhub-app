import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';

/**
 * Hook to manage roving tabindex for keyboard navigation in accessibility grids
 * @param itemCount Total number of items
 * @param columns Number of columns in the grid (1 for list view)
 */
export function useRovingTabIndex(itemCount: number, columns: number) {
    const [focusedIndex, setFocusedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update focused index when items change to ensure it's within bounds
    useEffect(() => {
        if (focusedIndex >= itemCount && itemCount > 0) {
            setFocusedIndex(itemCount - 1);
        }
    }, [itemCount, focusedIndex]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        let newIndex = focusedIndex;

        switch (e.key) {
            case 'ArrowRight':
                newIndex = Math.min(focusedIndex + 1, itemCount - 1);
                break;
            case 'ArrowLeft':
                newIndex = Math.max(focusedIndex - 1, 0);
                break;
            case 'ArrowDown':
                newIndex = Math.min(focusedIndex + columns, itemCount - 1);
                break;
            case 'ArrowUp':
                newIndex = Math.max(focusedIndex - columns, 0);
                break;
            case 'Home':
                newIndex = 0;
                break;
            case 'End':
                newIndex = itemCount - 1;
                break;
            default:
                return; // Let other keys propagate
        }

        if (newIndex !== focusedIndex) {
            e.preventDefault();
            setFocusedIndex(newIndex);

            // Focus the element after state update
            // We rely on the parent component to attach refs or use data-index attributes
            // but simpler is to let the parent perform the focus in a useEffect
        }
    }, [focusedIndex, itemCount, columns]);

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        containerRef
    };
}
