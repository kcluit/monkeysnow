import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherVariable } from '../../types/openMeteo';
import type { VariableConfig } from '../../utils/chartConfigurations';

interface VariableCardDraggableProps {
  variable: WeatherVariable;
  config: VariableConfig | undefined;
  isSelected: boolean;
  onToggle: () => void;
}

function VariableCardDraggableInner({
  variable,
  config,
  isSelected,
  onToggle,
}: VariableCardDraggableProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: variable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`variable-card-draggable ${isDragging ? 'dragging' : ''}`}
    >
      <label className={`variable-card ${isSelected ? 'variable-card-selected' : ''}`}>
        {/* Drag handle - only visible when selected */}
        {isSelected && (
          <span
            className="variable-card-drag-handle"
            {...attributes}
            {...listeners}
            onClick={(e) => e.preventDefault()}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.5" />
              <circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="11" cy="12" r="1.5" />
            </svg>
          </span>
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="variable-card-checkbox"
        />
        <span
          className="variable-card-color"
          style={{ backgroundColor: config?.color }}
        />
        <span className="variable-card-label">
          {config?.label || variable}
        </span>
        {config?.unit && (
          <span className="variable-card-unit">{config.unit}</span>
        )}
      </label>
    </div>
  );
}

export const VariableCardDraggable = memo(VariableCardDraggableInner);
