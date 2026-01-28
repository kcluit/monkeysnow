/**
 * Resort Selection Modal component.
 * Displays hierarchical resort selection with search and keyboard navigation.
 * Matches the CommandPalette visual style.
 */

import { useEffect, useRef, memo } from 'react';
import { ResortTreeNode } from './ResortTreeNode';
import type { UseResortHierarchyReturn } from '../../hooks/useResortHierarchy';
import type { HierarchyNode } from '../../data/resortHierarchy';

interface ResortSelectionModalProps {
  hierarchy: UseResortHierarchyReturn;
  hideIcons?: boolean;
}

export const ResortSelectionModal = memo(function ResortSelectionModal({
  hierarchy,
  hideIcons,
}: ResortSelectionModalProps): JSX.Element | null {
  const {
    isOpen,
    closeModal,
    currentPath,
    currentNodes,
    navigateTo,
    goBack,
    canGoBack,
    selectedResorts,
    selectAllInNode,
    deselectAllInNode,
    getSelectionState,
    selectedIndex,
    setSelectedIndex,
    searchTerm,
    setSearchTerm,
    isSearchMode,
  } = hierarchy;

  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selectedIndex]);

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

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleToggleAll = (node: HierarchyNode, select: boolean) => {
    if (select) {
      selectAllInNode(node);
    } else {
      deselectAllInNode(node);
    }
  };

  // Get breadcrumb text
  const getBreadcrumb = (): string => {
    if (isSearchMode) {
      return `Search: "${searchTerm}"`;
    }
    if (currentPath.length === 0) {
      return 'Select Resorts';
    }
    return currentPath.map((node) => node.name).join(' > ');
  };

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette resort-selection-modal">
        {/* Header with search and breadcrumb */}
        <div className="command-input-wrapper">
          {canGoBack && (
            <button
              type="button"
              className="command-back-btn"
              onClick={goBack}
              aria-label="Go back"
            >
              &lt;
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={canGoBack ? 'Search resorts...' : 'Search all resorts...'}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Breadcrumb */}
        <div className="resort-breadcrumb">
          {getBreadcrumb()}
        </div>

        {/* Tree content */}
        <div className="command-list resort-tree-list">
          {currentNodes.length === 0 ? (
            <div className="command-list-empty">
              {isSearchMode ? 'No resorts found' : 'No items'}
            </div>
          ) : (
            currentNodes.map((node, index) => (
              <div
                key={node.id}
                ref={index === selectedIndex ? selectedRef : null}
              >
                <ResortTreeNode
                  node={node}
                  index={index}
                  isSelected={index === selectedIndex}
                  selectionState={getSelectionState(node)}
                  selectedResorts={selectedResorts}
                  onNavigate={navigateTo}
                  onHover={setSelectedIndex}
                  onToggleAll={handleToggleAll}
                  hideEmoji={hideEmoji}
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <span className="command-hint">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="command-hint">
            <kbd>↵</kbd> {currentNodes[selectedIndex]?.type === 'resort' ? 'toggle' : 'open'}
          </span>
          <span className="command-hint">
            <kbd>esc</kbd> {canGoBack ? 'back' : 'close'}
          </span>
          <span className="resort-selection-count">
            {selectedResorts.length} selected
          </span>
        </div>
      </div>
    </div>
  );
});
