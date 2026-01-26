import { useEffect, useCallback } from 'react';
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
    selectedVariables,
    isSelected,
    toggleVariable,
    selectAll,
    deselectAll,
    reorderVariables,
    searchTerm,
    setSearchTerm,
  } = selection;

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

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderVariables(active.id as string, over.id as string);
      }
    },
    [reorderVariables]
  );

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

  // Only allow dragging selected variables
  const draggableIds = selectedVariables;

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette variable-selection-modal">
        {/* Header */}
        <div className="variable-selection-header">
          <h2 className="variable-selection-title">Select & Reorder Variables</h2>
          <p className="variable-selection-subtitle">
            Drag to reorder charts. Check/uncheck to show/hide.
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
          <span className="variable-selection-count">
            {selectedVariables.length} of {filteredVariables.length} selected
          </span>
        </div>

        {/* Variable list with drag-and-drop */}
        <div className="variable-selection-content">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={draggableIds}
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
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <span className="command-hint">
            <kbd>↕</kbd> drag to reorder
          </span>
          <span className="command-hint">
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
