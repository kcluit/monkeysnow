import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherVariable } from '../../types/openMeteo';
import { VARIABLE_CONFIGS } from '../../utils/chartConfigurations';

interface VariableDraggableItemProps {
  variable: WeatherVariable;
  isSelected: boolean;
  onToggle: () => void;
  isDragDisabled?: boolean;
}

function VariableDraggableItemInner({
  variable,
  isSelected,
  onToggle,
  isDragDisabled = false,
}: VariableDraggableItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: variable,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = VARIABLE_CONFIGS.get(variable);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`variable-item ${isDragging ? 'variable-item-dragging' : ''} ${
        isSelected ? 'variable-item-selected' : 'variable-item-unselected'
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="variable-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Checkbox */}
      <label className="variable-checkbox-wrapper">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="variable-checkbox"
        />
      </label>

      {/* Color dot */}
      <span
        className="variable-color-dot"
        style={{ backgroundColor: config?.color }}
      />

      {/* Variable info */}
      <div className="variable-info">
        <span className="variable-info-label">{config?.label || variable}</span>
        {config?.unit && (
          <span className="variable-info-unit">{config.unit}</span>
        )}
      </div>
    </div>
  );
}

export const VariableDraggableItem = memo(VariableDraggableItemInner);
