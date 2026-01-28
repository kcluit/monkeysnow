/**
 * Individual tree node component for model hierarchy.
 * Displays checkboxes, color indicators, and selection state.
 */

import { memo, useCallback, useState } from 'react';
import type { WeatherModel, AggregationType } from '../../types/openMeteo';
import type { ModelHierarchyNode } from '../../data/modelHierarchy';
import { getModelsUnderNode, getAggregationsUnderNode } from '../../data/modelHierarchy';
import { getModelConfig } from '../../utils/chartConfigurations';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';

interface ModelTreeNodeProps {
  node: ModelHierarchyNode;
  index: number;
  isSelected: boolean;
  selectionState: 'all' | 'some' | 'none';
  selectedModels: WeatherModel[];
  selectedAggregations: AggregationType[];
  aggregationColors: Record<AggregationType, string>;
  onNavigate: (node: ModelHierarchyNode) => void;
  onHover: (index: number) => void;
  onToggleAll: (node: ModelHierarchyNode, select: boolean) => void;
  onColorChange?: (aggType: AggregationType, color: string) => void;
}

// Color picker presets
const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#71717a', '#64748b',
];

export const ModelTreeNode = memo(function ModelTreeNode({
  node,
  index,
  isSelected,
  selectionState,
  selectedModels,
  selectedAggregations,
  aggregationColors,
  onNavigate,
  onHover,
  onToggleAll,
  onColorChange,
}: ModelTreeNodeProps): JSX.Element {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isModel = node.type === 'model';
  const isAggregation = node.type === 'aggregation';
  const isProvider = node.type === 'provider';
  const hasChildren = isProvider && node.children && node.children.length > 0;

  // Compute items under this node
  const modelsUnderNode = getModelsUnderNode(node);
  const aggsUnderNode = getAggregationsUnderNode(node);
  const itemCount = modelsUnderNode.length + aggsUnderNode.length;

  // Check if this specific item is selected
  const isItemSelected = isModel
    ? node.modelId && selectedModels.includes(node.modelId)
    : isAggregation
      ? node.aggregationType && selectedAggregations.includes(node.aggregationType)
      : false;

  // Get color for model or aggregation
  const getColor = (): string => {
    if (isModel && node.modelId) {
      return getModelConfig(node.modelId).color;
    }
    if (isAggregation && node.aggregationType) {
      return aggregationColors[node.aggregationType] ?? '#8b5cf6';
    }
    return '#6b7280';
  };

  const handleClick = useCallback(() => {
    onNavigate(node);
  }, [onNavigate, node]);

  const handleMouseEnter = useCallback(() => {
    onHover(index);
  }, [onHover, index]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isModel || isAggregation) {
      onNavigate(node); // Toggle single item
    } else {
      // Toggle all items in this category
      const shouldSelect = selectionState !== 'all';
      onToggleAll(node, shouldSelect);
    }
  }, [isModel, isAggregation, node, selectionState, onNavigate, onToggleAll]);

  const handleColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAggregation) {
      setShowColorPicker(!showColorPicker);
    }
  }, [isAggregation, showColorPicker]);

  const handleColorSelect = useCallback((color: string) => {
    if (node.aggregationType && onColorChange) {
      onColorChange(node.aggregationType, color);
    }
    setShowColorPicker(false);
  }, [node.aggregationType, onColorChange]);

  // Get checkbox state
  const getCheckboxState = (): 'checked' | 'indeterminate' | 'unchecked' => {
    if (isModel || isAggregation) {
      return isItemSelected ? 'checked' : 'unchecked';
    }
    switch (selectionState) {
      case 'all': return 'checked';
      case 'some': return 'indeterminate';
      default: return 'unchecked';
    }
  };

  // Get selected count for providers
  const getSelectedCount = (): number => {
    const selectedModelCount = modelsUnderNode.filter((id) => selectedModels.includes(id)).length;
    const selectedAggCount = aggsUnderNode.filter((id) => selectedAggregations.includes(id)).length;
    return selectedModelCount + selectedAggCount;
  };

  const checkboxState = getCheckboxState();
  const color = getColor();

  return (
    <button
      type="button"
      className={`resort-tree-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div className="resort-tree-item-left">
        {/* Checkbox */}
        <span
          className={`resort-checkbox ${checkboxState}`}
          onClick={handleCheckboxClick}
          role="checkbox"
          aria-checked={checkboxState === 'checked' ? true : checkboxState === 'indeterminate' ? 'mixed' : false}
        >
          {checkboxState === 'checked' && <Icon icon={icons.check} />}
          {checkboxState === 'indeterminate' && <Icon icon={icons.minus} />}
        </span>

        {/* Color dot for models and aggregations */}
        {(isModel || isAggregation) && (
          <span
            className="model-color-dot"
            style={{ backgroundColor: color, cursor: isAggregation ? 'pointer' : 'default' }}
            onClick={handleColorClick}
            title={isAggregation ? 'Click to change color' : undefined}
          />
        )}

        {/* Icon for providers */}
        {isProvider && (
          <span className="resort-tree-icon">
            <Icon icon={node.id === 'aggregations' ? icons.aggregations : icons.provider} />
          </span>
        )}

        {/* Name and description */}
        <div className="model-tree-info">
          <span className="resort-tree-name">{node.name}</span>
          {node.description && (
            <span className="model-tree-description">{node.description}</span>
          )}
        </div>

        {/* Item count for providers */}
        {isProvider && itemCount > 0 && (
          <span className="resort-tree-count">
            {selectionState !== 'none'
              ? `${getSelectedCount()}/${itemCount}`
              : itemCount
            }
          </span>
        )}
      </div>

      {/* Arrow for providers */}
      {hasChildren && (
        <span className="resort-tree-arrow">&gt;</span>
      )}

      {/* Color picker popup for aggregations */}
      {showColorPicker && isAggregation && (
        <div
          className="model-color-picker"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="model-color-picker-grid">
            {COLOR_PRESETS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                className={`model-color-swatch ${color === presetColor ? 'active' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={() => handleColorSelect(presetColor)}
              />
            ))}
          </div>
        </div>
      )}
    </button>
  );
});
