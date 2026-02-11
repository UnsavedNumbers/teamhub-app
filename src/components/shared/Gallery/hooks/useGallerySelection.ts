import { useState, useCallback } from 'react';

type SelectionMode = 'none' | 'single' | 'multiple';

interface UseGallerySelectionProps {
    items: { id: string }[];
    selectionMode: SelectionMode;
    selectedIds?: string[]; // Controlled state
    onSelectionChange?: (ids: string[]) => void;
}

export function useGallerySelection({
    items,
    selectionMode,
    selectedIds: controlledSelectedIds,
    onSelectionChange
}: UseGallerySelectionProps) {
    // Internal state for uncontrolled usage
    const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

    // Use controlled state if provided, otherwise internal state
    const selectedIds = controlledSelectedIds ?? internalSelectedIds;

    // Helper to update selection
    const updateSelection = useCallback((newSelectedIds: string[]) => {
        if (!controlledSelectedIds) {
            setInternalSelectedIds(newSelectedIds);
        }
        onSelectionChange?.(newSelectedIds);
    }, [controlledSelectedIds, onSelectionChange]);

    const handleSelect = useCallback((itemId: string, multiSelectKey = false, rangeSelectKey = false) => {
        if (selectionMode === 'none') return;

        if (selectionMode === 'single') {
            // Toggle selection if clicking the same item, otherwise select new item
            const newSelection = selectedIds.includes(itemId) ? [] : [itemId];
            updateSelection(newSelection);
            return;
        }

        // Multiple selection logic
        if (rangeSelectKey && selectedIds.length > 0) {
            // Range selection (Shift+Click)
            const lastSelectedId = selectedIds[selectedIds.length - 1];
            const lastIdx = items.findIndex(i => i.id === lastSelectedId);
            const currentIdx = items.findIndex(i => i.id === itemId);

            if (lastIdx !== -1 && currentIdx !== -1) {
                const start = Math.min(lastIdx, currentIdx);
                const end = Math.max(lastIdx, currentIdx);

                // Get all IDs in range
                const rangeIds = items.slice(start, end + 1).map(i => i.id);

                // Combine with existing selection
                const newSelection = Array.from(new Set([...selectedIds, ...rangeIds]));
                updateSelection(newSelection);
                return;
            }
        }

        if (multiSelectKey) {
            // Multi selection (Ctrl/Cmd+Click)
            if (selectedIds.includes(itemId)) {
                updateSelection(selectedIds.filter(id => id !== itemId));
            } else {
                updateSelection([...selectedIds, itemId]);
            }
        } else {
            // Normal click clears other selections and selects this one
            // If already selected and no modifier, deselect it (toggle)
            // Or behavior could be "select only this one". 
            // Standard behavior in file explorers is "select only this one".
            updateSelection([itemId]);
        }
    }, [items, selectionMode, selectedIds, updateSelection]);

    const isSelected = useCallback((id: string) => {
        return selectedIds.includes(id);
    }, [selectedIds]);

    const clearSelection = useCallback(() => {
        updateSelection([]);
    }, [updateSelection]);

    const selectAll = useCallback(() => {
        if (selectionMode !== 'multiple') return;
        updateSelection(items.map(i => i.id));
    }, [selectionMode, items, updateSelection]);

    return {
        selectedIds,
        handleSelect,
        isSelected,
        clearSelection,
        selectAll
    };
}
