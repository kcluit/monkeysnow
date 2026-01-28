/**
 * Individual tree node component for resort hierarchy.
 * Displays checkboxes, expand/collapse, and selection state.
 */

import { memo, useCallback } from 'react';
import type { HierarchyNode } from '../../contexts/HierarchyContext';
import { getResortsUnderNode } from '../../data/resortHierarchy';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ResortTreeNodeProps {
  node: HierarchyNode;
  index: number;
  isSelected: boolean;
  selectionState: 'all' | 'some' | 'none';
  selectedResorts: string[];
  onNavigate: (node: HierarchyNode) => void;
  onHover: (index: number) => void;
  onToggleAll: (node: HierarchyNode, select: boolean) => void;
  hideIcons?: boolean;
}

export const ResortTreeNode = memo(function ResortTreeNode({
  node,
  index,
  isSelected,
  selectionState,
  selectedResorts,
  onNavigate,
  onHover,
  onToggleAll,
  hideIcons,
}: ResortTreeNodeProps): JSX.Element {
  const isResort = node.type === 'resort';
  const hasChildren = !isResort && node.children && node.children.length > 0;

  // Compute resorts under this node once and reuse
  const resortsUnderNode = getResortsUnderNode(node);
  const resortCount = resortsUnderNode.length;

  // For resorts, check if this specific resort is selected
  const isResortSelected = isResort && node.resortId && selectedResorts.includes(node.resortId);

  const handleClick = useCallback(() => {
    onNavigate(node);
  }, [onNavigate, node]);

  const handleMouseEnter = useCallback(() => {
    onHover(index);
  }, [onHover, index]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isResort) {
      onNavigate(node); // Toggle single resort
    } else {
      // Toggle all resorts in this category
      const shouldSelect = selectionState !== 'all';
      onToggleAll(node, shouldSelect);
    }
  }, [isResort, node, selectionState, onNavigate, onToggleAll]);

  // Get icon based on node type
  const getIcon = (): string => {
    if (hideEmoji) return '';
    switch (node.type) {
      case 'continent': return '🌍';
      case 'country': return '🏳️';
      case 'province': return '📍';
      case 'resort': return '⛷️';
      default: return '';
    }
  };

  // Get checkbox state
  const getCheckboxState = (): 'checked' | 'indeterminate' | 'unchecked' => {
    if (isResort) {
      return isResortSelected ? 'checked' : 'unchecked';
    }
    switch (selectionState) {
      case 'all': return 'checked';
      case 'some': return 'indeterminate';
      default: return 'unchecked';
    }
  };

  const checkboxState = getCheckboxState();

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
          {checkboxState === 'checked' && '✓'}
          {checkboxState === 'indeterminate' && '−'}
        </span>

        {/* Icon */}
        {!hideEmoji && <span className="resort-tree-icon">{getIcon()}</span>}

        {/* Name */}
        <span className="resort-tree-name">{node.name}</span>

        {/* Resort count for non-resort nodes */}
        {!isResort && resortCount > 0 && (
          <span className="resort-tree-count">
            {selectionState !== 'none'
              ? `${selectedResorts.filter(id => resortsUnderNode.includes(id)).length}/${resortCount}`
              : resortCount
            }
          </span>
        )}
      </div>

      {/* Arrow for non-resort nodes */}
      {hasChildren && (
        <span className="resort-tree-arrow">&gt;</span>
      )}
    </button>
  );
});
