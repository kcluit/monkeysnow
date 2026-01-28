/**
 * Model Selection Grid Modal component.
 * Displays all models in a multi-column grid layout organized by Provider > Models.
 * All providers are expanded by default but collapsible.
 * Aggregations section at the top with color pickers.
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import {
  buildModelHierarchyTree,
  getModelsUnderNode,
  getAggregationsUnderNode,
  type ModelHierarchyNode,
} from '../../data/modelHierarchy';
import { getModelConfig } from '../../utils/chartConfigurations';
import type { UseModelHierarchyReturn } from '../../hooks/useModelHierarchy';
import type { WeatherModel, AggregationType } from '../../types/openMeteo';

interface ModelSelectionGridModalProps {
  hierarchy: UseModelHierarchyReturn;
  hideAggregationMembers?: boolean;
  onToggleHideMembers?: () => void;
  showMinMaxFill?: boolean;
  onToggleMinMaxFill?: () => void;
  showPercentileFill?: boolean;
  onTogglePercentileFill?: () => void;
}

// Color picker presets
const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#71717a', '#64748b',
];

// Get all node IDs from the hierarchy tree for default expansion
function getAllNodeIds(nodes: ModelHierarchyNode[]): Set<string> {
  const ids = new Set<string>();

  function traverse(node: ModelHierarchyNode): void {
    ids.add(node.id);
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return ids;
}

// Filter hierarchy tree based on search term
function filterHierarchy(nodes: ModelHierarchyNode[], searchTerm: string): ModelHierarchyNode[] {
  if (!searchTerm.trim()) return nodes;

  const query = searchTerm.toLowerCase();

  function filterNode(node: ModelHierarchyNode): ModelHierarchyNode | null {
    // If this is a model or aggregation, check if it matches
    if (node.type === 'model' || node.type === 'aggregation') {
      const nameMatch = node.name.toLowerCase().includes(query);
      const descMatch = node.description?.toLowerCase().includes(query) ?? false;
      return (nameMatch || descMatch) ? node : null;
    }

    // For provider nodes, filter children
    if (!node.children) return null;

    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((child): child is ModelHierarchyNode => child !== null);

    // Only include this node if it has matching children
    if (filteredChildren.length === 0) return null;

    return {
      ...node,
      children: filteredChildren,
    };
  }

  return nodes
    .map(node => filterNode(node))
    .filter((node): node is ModelHierarchyNode => node !== null);
}

// Checkbox component with tri-state support
const Checkbox = memo(function Checkbox({
  state,
  onClick,
}: {
  state: 'all' | 'some' | 'none';
  onClick: (e: React.MouseEvent) => void;
}) {
  const checkboxState = state === 'all' ? 'checked' : state === 'some' ? 'indeterminate' : 'unchecked';

  return (
    <span
      className={`resort-grid-checkbox ${checkboxState}`}
      onClick={onClick}
      role="checkbox"
      aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
    >
      {state === 'all' && <Icon icon={icons.check} />}
      {state === 'some' && <Icon icon={icons.minus} />}
    </span>
  );
});

// Model item component
const ModelItem = memo(function ModelItem({
  node,
  isSelected,
  onToggle,
}: {
  node: ModelHierarchyNode;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const color = node.modelId ? getModelConfig(node.modelId).color : '#6b7280';

  return (
    <label className="resort-grid-item" onClick={(e) => { e.preventDefault(); onToggle(); }}>
      <Checkbox state={isSelected ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); onToggle(); }} />
      <span
        className="model-color-dot"
        style={{ backgroundColor: color }}
      />
      <span className="resort-grid-item-name">{node.name}</span>
      {node.resolution && (
        <span className="model-resolution-label">({node.resolution})</span>
      )}
    </label>
  );
});

// Aggregation item component with color picker
const AggregationItem = memo(function AggregationItem({
  node,
  isSelected,
  color,
  onToggle,
  onColorChange,
}: {
  node: ModelHierarchyNode;
  isSelected: boolean;
  color: string;
  onToggle: () => void;
  onColorChange: (color: string) => void;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowColorPicker(!showColorPicker);
  }, [showColorPicker]);

  const handleColorSelect = useCallback((newColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onColorChange(newColor);
    setShowColorPicker(false);
  }, [onColorChange]);

  return (
    <div className="model-aggregation-item">
      <label className="resort-grid-item" onClick={(e) => { e.preventDefault(); onToggle(); }}>
        <Checkbox state={isSelected ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); onToggle(); }} />
        <span
          className="model-color-dot model-color-clickable"
          style={{ backgroundColor: color }}
          onClick={handleColorClick}
          title="Click to change color"
        />
        <div className="model-tree-info">
          <span className="resort-grid-item-name">{node.name}</span>
          {node.description && (
            <span className="model-tree-description">{node.description}</span>
          )}
        </div>
      </label>
      {showColorPicker && (
        <div className="model-color-picker-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="model-color-picker-grid">
            {COLOR_PRESETS.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                className={`model-color-swatch ${color === presetColor ? 'selected' : ''}`}
                style={{ backgroundColor: presetColor }}
                onClick={(e) => handleColorSelect(presetColor, e)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Provider section component (like Country in resort modal)
const ProviderSection = memo(function ProviderSection({
  node,
  expandedNodes,
  onToggleExpand,
  selectedModels,
  selectedAggregations,
  aggregationColors,
  onToggleModel,
  onToggleAggregation,
  onSelectAll,
  onDeselectAll,
  getSelectionState,
  onColorChange,
  hideAggregationMembers,
  onToggleHideMembers,
  showMinMaxFill,
  onToggleMinMaxFill,
  showPercentileFill,
  onTogglePercentileFill,
}: {
  node: ModelHierarchyNode;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedModels: WeatherModel[];
  selectedAggregations: AggregationType[];
  aggregationColors: Record<AggregationType, string>;
  onToggleModel: (modelId: WeatherModel) => void;
  onToggleAggregation: (aggType: AggregationType) => void;
  onSelectAll: (node: ModelHierarchyNode) => void;
  onDeselectAll: (node: ModelHierarchyNode) => void;
  getSelectionState: (node: ModelHierarchyNode) => 'all' | 'some' | 'none';
  onColorChange: (aggType: AggregationType, color: string) => void;
  hideAggregationMembers?: boolean;
  onToggleHideMembers?: () => void;
  showMinMaxFill?: boolean;
  onToggleMinMaxFill?: () => void;
  showPercentileFill?: boolean;
  onTogglePercentileFill?: () => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const selectionState = getSelectionState(node);
  const modelsUnder = getModelsUnderNode(node);
  const aggsUnder = getAggregationsUnderNode(node);
  const totalItems = modelsUnder.length + aggsUnder.length;
  const selectedCount = modelsUnder.filter(id => selectedModels.includes(id)).length +
                        aggsUnder.filter(id => selectedAggregations.includes(id)).length;

  const isAggregationsSection = node.id === 'aggregations';

  const handleHeaderClick = useCallback(() => {
    if (selectionState === 'all') {
      onDeselectAll(node);
    } else {
      onSelectAll(node);
    }
  }, [selectionState, node, onSelectAll, onDeselectAll]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  }, [node.id, onToggleExpand]);

  return (
    <div className={`resort-grid-continent ${isAggregationsSection ? 'model-aggregations-section' : ''}`}>
      <div className="resort-grid-continent-header" onClick={handleHeaderClick}>
        <button
          className={`resort-grid-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <Icon icon={isExpanded ? icons.caretDown : icons.caretRight} />
        </button>
        <Checkbox state={selectionState} onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }} />
        <span className="resort-grid-header-icon">
          <Icon icon={isAggregationsSection ? icons.aggregations : icons.provider} />
        </span>
        <span className="resort-grid-continent-name">{node.name}</span>
        <span className="resort-grid-count">
          {selectedCount}/{totalItems}
        </span>
        {isAggregationsSection && onToggleHideMembers && (
          <button
            className={`aggregation-hide-toggle ${hideAggregationMembers ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleHideMembers(); }}
            title={hideAggregationMembers ? 'Show individual model lines' : 'Hide individual model lines'}
          >
            <FontAwesomeIcon icon={hideAggregationMembers ? faEyeSlash : faEye} />
          </button>
        )}
      </div>
      {isExpanded && node.children && (
        <div className="resort-grid-resorts model-grid-items">
          {node.children.map(child => {
            if (child.type === 'aggregation' && child.aggregationType) {
              return (
                <AggregationItem
                  key={child.id}
                  node={child}
                  isSelected={selectedAggregations.includes(child.aggregationType)}
                  color={aggregationColors[child.aggregationType] ?? '#8b5cf6'}
                  onToggle={() => onToggleAggregation(child.aggregationType!)}
                  onColorChange={(color) => onColorChange(child.aggregationType!, color)}
                />
              );
            } else if (child.type === 'model' && child.modelId) {
              return (
                <ModelItem
                  key={child.id}
                  node={child}
                  isSelected={selectedModels.includes(child.modelId)}
                  onToggle={() => onToggleModel(child.modelId!)}
                />
              );
            }
            return null;
          })}
          {/* Band fill toggle options - only in Aggregations section */}
          {isAggregationsSection && (
            <>
              <div className="model-fill-options-divider" />
              <label className="resort-grid-item fill-option-item" onClick={(e) => { e.preventDefault(); onToggleMinMaxFill?.(); }}>
                <Checkbox state={showMinMaxFill ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); onToggleMinMaxFill?.(); }} />
                <span className="fill-option-icon">▒</span>
                <div className="model-tree-info">
                  <span className="resort-grid-item-name">Min-Max Fill</span>
                  <span className="model-tree-description">Shaded area between min and max lines</span>
                </div>
              </label>
              <label className="resort-grid-item fill-option-item" onClick={(e) => { e.preventDefault(); onTogglePercentileFill?.(); }}>
                <Checkbox state={showPercentileFill ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); onTogglePercentileFill?.(); }} />
                <span className="fill-option-icon">▒</span>
                <div className="model-tree-info">
                  <span className="resort-grid-item-name">25th-75th Fill</span>
                  <span className="model-tree-description">Shaded area between percentile lines</span>
                </div>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// Main modal component
export const ModelSelectionGridModal = memo(function ModelSelectionGridModal({
  hierarchy,
  hideAggregationMembers,
  onToggleHideMembers,
  showMinMaxFill,
  onToggleMinMaxFill,
  showPercentileFill,
  onTogglePercentileFill,
}: ModelSelectionGridModalProps): JSX.Element | null {
  const {
    isOpen,
    closeModal,
    selectedModels,
    selectedAggregations,
    aggregationColors,
    toggleModel,
    toggleAggregation,
    selectAllInNode,
    deselectAllInNode,
    getSelectionState,
    setAggregationColor,
    searchTerm,
    setSearchTerm,
  } = hierarchy;

  const inputRef = useRef<HTMLInputElement>(null);

  // Build hierarchy tree once
  const hierarchyTree = useMemo(() => buildModelHierarchyTree(), []);

  // Memoize all node IDs for performance
  const allNodeIds = useMemo(() => getAllNodeIds(hierarchyTree), [hierarchyTree]);

  // Initialize expanded nodes with all node IDs (default expanded)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(allNodeIds));

  // Reset expansion state when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpandedNodes(new Set(allNodeIds));
    }
  }, [isOpen, allNodeIds]);

  // Filter hierarchy based on search
  const filteredHierarchy = useMemo(
    () => filterHierarchy(hierarchyTree, searchTerm),
    [hierarchyTree, searchTerm]
  );

  // Toggle node expansion
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    setExpandedNodes(new Set(allNodeIds));
  }, [allNodeIds]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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

  // Handle keyboard events - use capture phase to intercept before hook's handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent hook's handler from also firing
        closeModal();
      }
    };

    // Use capture phase to handle before the hook's bubbling handler
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, closeModal]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  // Check if all nodes are expanded
  const allExpanded = expandedNodes.size === allNodeIds.size;

  // Get total selection count
  const getTotalCount = (): string => {
    const modelCount = selectedModels.length;
    const aggCount = selectedAggregations.length;
    if (aggCount > 0) {
      return `${modelCount} models + ${aggCount} aggregation${aggCount > 1 ? 's' : ''}`;
    }
    return `${modelCount} model${modelCount !== 1 ? 's' : ''}`;
  };

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette resort-grid-modal model-grid-modal">
        {/* Header with search */}
        <div className="resort-grid-header">
          <div className="command-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="command-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search models..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="resort-grid-actions">
            <button
              className="resort-grid-action-btn"
              onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Grid content */}
        <div className="resort-grid-content">
          {filteredHierarchy.length === 0 ? (
            <div className="resort-grid-empty">
              {searchTerm ? 'No models found' : 'No models available'}
            </div>
          ) : (
            <div className="resort-grid-columns model-grid-columns">
              {filteredHierarchy.map(provider => (
                <ProviderSection
                  key={provider.id}
                  node={provider}
                  expandedNodes={expandedNodes}
                  onToggleExpand={handleToggleExpand}
                  selectedModels={selectedModels}
                  selectedAggregations={selectedAggregations}
                  aggregationColors={aggregationColors}
                  onToggleModel={toggleModel}
                  onToggleAggregation={toggleAggregation}
                  onSelectAll={selectAllInNode}
                  onDeselectAll={deselectAllInNode}
                  getSelectionState={getSelectionState}
                  onColorChange={setAggregationColor}
                  hideAggregationMembers={hideAggregationMembers}
                  onToggleHideMembers={onToggleHideMembers}
                  showMinMaxFill={showMinMaxFill}
                  onToggleMinMaxFill={onToggleMinMaxFill}
                  showPercentileFill={showPercentileFill}
                  onTogglePercentileFill={onTogglePercentileFill}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer model-grid-footer">
          <div className="model-grid-footer-note">
            Note: The default Best Match provides the best forecast for any given location worldwide. Seamless combines all models from a given provider into a seamless prediction. Click <FontAwesomeIcon icon={faEye} /> to hide aggregation members.
          </div>
          <div className="model-grid-footer-actions">
            <span className="command-hint">
              <kbd>esc</kbd> close
            </span>
            <span className="resort-selection-count">
              {getTotalCount()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
