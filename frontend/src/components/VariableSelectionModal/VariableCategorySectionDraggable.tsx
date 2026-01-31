import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type { VariableCategory } from '../../data/variableCategories';
import type { WeatherVariable } from '../../types/openMeteo';
import { VARIABLE_CONFIGS } from '../../utils/chartConfigurations';
import { VariableCardDraggable } from './VariableCardDraggable';

interface VariableCategorySectionDraggableProps {
  category: VariableCategory;
  variables: WeatherVariable[];
  isSelected: (v: WeatherVariable) => boolean;
  onToggle: (v: WeatherVariable) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function VariableCategorySectionDraggableInner({
  category,
  variables,
  isSelected,
  onToggle,
  isExpanded,
  onToggleExpand,
}: VariableCategorySectionDraggableProps): JSX.Element {
  const selectedCount = variables.filter(v => isSelected(v)).length;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `category-${category.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  }, [onToggleExpand]);

  return (
    <div ref={setNodeRef} style={style} className={`variable-category ${isDragging ? 'variable-category-dragging' : ''}`}>
      <div className="variable-category-header-wrapper">
        {/* Drag handle for category */}
        <button
          type="button"
          className="category-drag-handle"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${category.name} category`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="4" r="1.5" />
            <circle cx="11" cy="4" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
          </svg>
        </button>

        {/* Category header (expand/collapse) */}
        <div
          className="variable-category-header"
          onClick={onToggleExpand}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
        >
          <span className={`variable-category-toggle ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
          <span className="variable-category-name">{category.name}</span>
          <span className="variable-category-count">
            {selectedCount}/{variables.length}
          </span>
        </div>
      </div>

      {isExpanded && (
        <SortableContext items={variables} strategy={rectSortingStrategy}>
          <div className="variable-category-grid">
            {variables.map(variable => {
              const config = VARIABLE_CONFIGS.get(variable);
              const selected = isSelected(variable);
              return (
                <VariableCardDraggable
                  key={variable}
                  variable={variable}
                  config={config}
                  isSelected={selected}
                  onToggle={() => onToggle(variable)}
                />
              );
            })}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export const VariableCategorySectionDraggable = memo(VariableCategorySectionDraggableInner);
