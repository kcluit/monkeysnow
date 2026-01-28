/**
 * Resort Selection Grid Modal component.
 * Displays all resorts in a multi-column grid layout organized by
 * Continent > Country > Province > Resorts.
 * All levels are expanded by default but collapsible.
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useHierarchy, type HierarchyNode } from '../../contexts/HierarchyContext';
import type { UseResortHierarchyReturn } from '../../hooks/useResortHierarchy';

interface ResortSelectionGridModalProps {
  hierarchy: UseResortHierarchyReturn;
  hideEmoji?: boolean;
}

// Get all node IDs from the hierarchy tree for default expansion
function getAllNodeIds(nodes: HierarchyNode[]): Set<string> {
  const ids = new Set<string>();

  function traverse(node: HierarchyNode): void {
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
function filterHierarchy(nodes: HierarchyNode[], searchTerm: string): HierarchyNode[] {
  if (!searchTerm.trim()) return nodes;

  const query = searchTerm.toLowerCase();

  function filterNode(node: HierarchyNode): HierarchyNode | null {
    // If this is a resort, check if it matches
    if (node.type === 'resort') {
      return node.name.toLowerCase().includes(query) ? node : null;
    }

    // For non-resort nodes, filter children
    if (!node.children) return null;

    const filteredChildren = node.children
      .map(child => filterNode(child))
      .filter((child): child is HierarchyNode => child !== null);

    // Only include this node if it has matching children
    if (filteredChildren.length === 0) return null;

    return {
      ...node,
      children: filteredChildren,
    };
  }

  return nodes
    .map(node => filterNode(node))
    .filter((node): node is HierarchyNode => node !== null);
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
      {state === 'all' && '✓'}
      {state === 'some' && '−'}
    </span>
  );
});

// Resort item component
const ResortItem = memo(function ResortItem({
  node,
  isSelected,
  onToggle,
  hideEmoji,
}: {
  node: HierarchyNode;
  isSelected: boolean;
  onToggle: () => void;
  hideEmoji?: boolean;
}) {
  return (
    <label className="resort-grid-item" onClick={(e) => { e.preventDefault(); onToggle(); }}>
      <Checkbox state={isSelected ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); onToggle(); }} />
      {!hideEmoji && <span className="resort-grid-item-icon">⛷️</span>}
      <span className="resort-grid-item-name">{node.name}</span>
    </label>
  );
});

// Province group component
const ProvinceGroup = memo(function ProvinceGroup({
  node,
  expandedNodes,
  onToggleExpand,
  selectedResorts,
  onToggleResort,
  onSelectAll,
  onDeselectAll,
  getSelectionState,
  getResortsUnderNode,
  hideEmoji,
}: {
  node: HierarchyNode;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedResorts: string[];
  onToggleResort: (resortId: string) => void;
  onSelectAll: (node: HierarchyNode) => void;
  onDeselectAll: (node: HierarchyNode) => void;
  getSelectionState: (node: HierarchyNode) => 'all' | 'some' | 'none';
  getResortsUnderNode: (node: HierarchyNode) => string[];
  hideEmoji?: boolean;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const selectionState = getSelectionState(node);
  const resortsUnder = getResortsUnderNode(node);
  const selectedCount = resortsUnder.filter(id => selectedResorts.includes(id)).length;

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
    <div className="resort-grid-province">
      <div className="resort-grid-province-header" onClick={handleHeaderClick}>
        <button
          className={`resort-grid-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          ▶
        </button>
        <Checkbox state={selectionState} onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }} />
        {!hideEmoji && <span className="resort-grid-header-icon">📍</span>}
        <span className="resort-grid-province-name">{node.name}</span>
        <span className="resort-grid-count">
          {selectedCount}/{resortsUnder.length}
        </span>
      </div>
      {isExpanded && node.children && (
        <div className="resort-grid-resorts">
          {node.children.map(resort => (
            <ResortItem
              key={resort.id}
              node={resort}
              isSelected={resort.resortId ? selectedResorts.includes(resort.resortId) : false}
              onToggle={() => resort.resortId && onToggleResort(resort.resortId)}
              hideEmoji={hideEmoji}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Country section component
const CountrySection = memo(function CountrySection({
  node,
  expandedNodes,
  onToggleExpand,
  selectedResorts,
  onToggleResort,
  onSelectAll,
  onDeselectAll,
  getSelectionState,
  getResortsUnderNode,
  hideEmoji,
}: {
  node: HierarchyNode;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedResorts: string[];
  onToggleResort: (resortId: string) => void;
  onSelectAll: (node: HierarchyNode) => void;
  onDeselectAll: (node: HierarchyNode) => void;
  getSelectionState: (node: HierarchyNode) => 'all' | 'some' | 'none';
  getResortsUnderNode: (node: HierarchyNode) => string[];
  hideEmoji?: boolean;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const selectionState = getSelectionState(node);
  const resortsUnder = getResortsUnderNode(node);
  const selectedCount = resortsUnder.filter(id => selectedResorts.includes(id)).length;

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
    <div className="resort-grid-country">
      <div className="resort-grid-country-header" onClick={handleHeaderClick}>
        <button
          className={`resort-grid-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          ▶
        </button>
        <Checkbox state={selectionState} onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }} />
        {!hideEmoji && <span className="resort-grid-header-icon">🏳️</span>}
        <span className="resort-grid-country-name">{node.name}</span>
        <span className="resort-grid-count">
          {selectedCount}/{resortsUnder.length}
        </span>
      </div>
      {isExpanded && node.children && (
        <div className="resort-grid-provinces">
          {node.children.map(province => (
            <ProvinceGroup
              key={province.id}
              node={province}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              selectedResorts={selectedResorts}
              onToggleResort={onToggleResort}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              getSelectionState={getSelectionState}
              getResortsUnderNode={getResortsUnderNode}
              hideEmoji={hideEmoji}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Continent column component
const ContinentColumn = memo(function ContinentColumn({
  node,
  expandedNodes,
  onToggleExpand,
  selectedResorts,
  onToggleResort,
  onSelectAll,
  onDeselectAll,
  getSelectionState,
  getResortsUnderNode,
  hideEmoji,
}: {
  node: HierarchyNode;
  expandedNodes: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedResorts: string[];
  onToggleResort: (resortId: string) => void;
  onSelectAll: (node: HierarchyNode) => void;
  onDeselectAll: (node: HierarchyNode) => void;
  getSelectionState: (node: HierarchyNode) => 'all' | 'some' | 'none';
  getResortsUnderNode: (node: HierarchyNode) => string[];
  hideEmoji?: boolean;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const selectionState = getSelectionState(node);
  const resortsUnder = getResortsUnderNode(node);
  const selectedCount = resortsUnder.filter(id => selectedResorts.includes(id)).length;

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
    <div className="resort-grid-continent">
      <div className="resort-grid-continent-header" onClick={handleHeaderClick}>
        <button
          className={`resort-grid-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          ▶
        </button>
        <Checkbox state={selectionState} onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }} />
        {!hideEmoji && <span className="resort-grid-header-icon">🌍</span>}
        <span className="resort-grid-continent-name">{node.name}</span>
        <span className="resort-grid-count">
          {selectedCount}/{resortsUnder.length}
        </span>
      </div>
      {isExpanded && node.children && (
        <div className="resort-grid-countries">
          {node.children.map(country => (
            <CountrySection
              key={country.id}
              node={country}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              selectedResorts={selectedResorts}
              onToggleResort={onToggleResort}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              getSelectionState={getSelectionState}
              getResortsUnderNode={getResortsUnderNode}
              hideEmoji={hideEmoji}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Main modal component
export const ResortSelectionGridModal = memo(function ResortSelectionGridModal({
  hierarchy,
  hideEmoji,
}: ResortSelectionGridModalProps): JSX.Element | null {
  const {
    isOpen,
    closeModal,
    selectedResorts,
    toggleResort,
    selectAllInNode,
    deselectAllInNode,
    getSelectionState,
    searchTerm,
    setSearchTerm,
  } = hierarchy;

  const inputRef = useRef<HTMLInputElement>(null);

  // Get hierarchy tree from context (fetched from backend)
  const { hierarchyTree } = useHierarchy();

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

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette resort-grid-modal">
        {/* Header with search */}
        <div className="resort-grid-header">
          <div className="command-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="command-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resorts..."
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
              {searchTerm ? 'No resorts found' : 'No resorts available'}
            </div>
          ) : (
            <div className="resort-grid-columns">
              {filteredHierarchy.map(continent => (
                <ContinentColumn
                  key={continent.id}
                  node={continent}
                  expandedNodes={expandedNodes}
                  onToggleExpand={handleToggleExpand}
                  selectedResorts={selectedResorts}
                  onToggleResort={toggleResort}
                  onSelectAll={selectAllInNode}
                  onDeselectAll={deselectAllInNode}
                  getSelectionState={getSelectionState}
                  hideEmoji={hideEmoji}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <span className="command-hint">
            <kbd>esc</kbd> close
          </span>
          <span className="resort-selection-count">
            {selectedResorts.length} selected
          </span>
        </div>
      </div>
    </div>
  );
});
