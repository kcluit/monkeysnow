import { useEffect, useCallback, useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { VariableDraggableItem } from './VariableDraggableItem';
import { VariableCategorySectionDraggable } from './VariableCategorySectionDraggable';
import type { UseVariableSelectionReturn } from '../../hooks/useVariableSelection';

interface VariableSelectionModalProps {
  selection: UseVariableSelectionReturn;
}

export function VariableSelectionModal({
  selection,
}: VariableSelectionModalProps): JSX.Element | null {
  const {
    isOpen,
    closeModal,
    filteredVariables,
    isSelected,
    toggleVariable,
    selectAll,
    deselectAll,
    reorderVariables,
    searchTerm,
    setSearchTerm,
    orderedCategories,
    reorderCategories,
    reorderVariableAcrossCategories,
  } = selection;

  // Track which categories are expanded (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(orderedCategories.map(c => c.id))
  );

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - routes to appropriate reorder function
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dragging categories (prefixed with "category-")
      if (activeId.startsWith('category-') && overId.startsWith('category-')) {
        const activeCatId = activeId.replace('category-', '');
        const overCatId = overId.replace('category-', '');
        reorderCategories(activeCatId, overCatId);
      } else if (!activeId.startsWith('category-') && !overId.startsWith('category-')) {
        // Dragging variables
        if (isSearching) {
          reorderVariables(activeId, overId);
        } else {
          reorderVariableAcrossCategories(activeId, overId);
        }
      }
    },
    [reorderVariables, reorderCategories, reorderVariableAcrossCategories, isSearching]
  );

  // Toggle category expansion
  const toggleCategoryExpand = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all categories
  const expandAllCategories = useCallback(() => {
    setExpandedCategories(new Set(VARIABLE_CATEGORIES.map(c => c.id)));
  }, []);

  const collapseAllCategories = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  // Check if searching
  const isSearching = searchTerm.trim().length > 0;

  // Filter categories to only show those with matching variables
  const filteredCategories = useMemo(() => {
    const filteredSet = new Set(filteredVariables);
    return VARIABLE_CATEGORIES.map(category => ({
      ...category,
      variables: category.variables.filter(v => filteredSet.has(v)),
    })).filter(cat => cat.variables.length > 0);
  }, [filteredVariables]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Calculate how many selected items are shown in filtered list
  const selectedInFilteredCount = filteredVariables.filter(v => isSelected(v)).length;
  const allExpanded = expandedCategories.size === VARIABLE_CATEGORIES.length;

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette variable-selection-modal">
        {/* Header */}
        <div className="variable-selection-header">
          <h2 className="variable-selection-title">Select Variables</h2>
          <p className="variable-selection-subtitle">
            Choose which weather variables to display in charts.
          </p>
        </div>

        {/* Search input */}
        <div className="command-input-wrapper">
          <input
            type="text"
            className="command-input"
            placeholder="Search variables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        {/* Action buttons */}
        <div className="variable-selection-actions">
          <button
            type="button"
            onClick={selectAll}
            className="variable-action-button"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="variable-action-button"
          >
            Deselect All
          </button>
          {!isSearching && (
            <button
              type="button"
              onClick={allExpanded ? collapseAllCategories : expandAllCategories}
              className="variable-action-button"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}
          <span className="variable-selection-count">
            {selectedInFilteredCount} of {filteredVariables.length}
          </span>
        </div>

        {/* Variable content */}
        <div className="variable-selection-content">
          {isSearching ? (
            // Search mode: flat list with drag-and-drop
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={filteredVariables}
                strategy={verticalListSortingStrategy}
              >
                {filteredVariables.map((variable) => (
                  <VariableDraggableItem
                    key={variable}
                    variable={variable}
                    isSelected={isSelected(variable)}
                    onToggle={() => toggleVariable(variable)}
                    isDragDisabled={!isSelected(variable)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            // Normal mode: categorized grid
            <div className="variable-categories">
              {filteredCategories.map(category => (
                <VariableCategorySection
                  key={category.id}
                  category={category}
                  variables={category.variables}
                  isSelected={isSelected}
                  onToggle={toggleVariable}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggleExpand={() => toggleCategoryExpand(category.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          {isSearching && (
            <span className="command-hint">
              <kbd>↕</kbd> drag to reorder
            </span>
          )}
          <span className="command-hint">
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
