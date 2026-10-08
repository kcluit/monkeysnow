/**
 * Resort Selection Grid Modal component.
 * Shows Saved locations and Resorts in columns, one per continent, then by
 * Country and Region. It opens with the continents open and everything below
 * them closed. A search shows only the matching Resorts, with every group that
 * holds one open, and clearing it puts the tree back as it was.
 */

import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, memo } from 'react';
import { useHierarchy, type HierarchyNode } from '../../contexts/HierarchyContext';
import { MAX_SELECTED_RESORTS, type UseResortHierarchyReturn } from '../../hooks/useResortHierarchy';
import { CapNotice } from './CapNotice';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { matchesSearchWords, normalizeForSearch, toSearchWords } from '../../utils/resortSearch';
import { useOverlay } from '../../hooks/useOverlay';
import { shouldAutoFocusSearch } from '../../utils/autoFocus';

interface ResortSelectionGridModalProps {
  hierarchy: UseResortHierarchyReturn;
  hideIcons?: boolean;
}

// The text search compares each resort with: its names, its Region and its country, but not its continent
function buildSearchTexts(tree: HierarchyNode[]): Map<string, string> {
  const texts = new Map<string, string>();

  function visit(node: HierarchyNode, places: string[]): void {
    if (node.type === 'resort') {
      texts.set(node.id, normalizeForSearch([node.name, ...(node.aka ?? []), ...places].join(' ')));
      return;
    }
    const childPlaces = node.type === 'country' || node.type === 'province' ? [...places, node.name] : places;
    node.children?.forEach((child) => visit(child, childPlaces));
  }

  tree.forEach((node) => visit(node, []));
  return texts;
}

// The tree cut down to the matching resorts and the groups that hold them
function filterTree(nodes: HierarchyNode[], words: string[], texts: Map<string, string>): HierarchyNode[] {
  const kept: HierarchyNode[] = [];
  for (const node of nodes) {
    if (node.type === 'resort') {
      if (matchesSearchWords(texts.get(node.id) ?? '', words)) kept.push(node);
    } else if (node.children) {
      const children = filterTree(node.children, words, texts);
      if (children.length > 0) kept.push({ ...node, children });
    }
  }
  return kept;
}

// Each group's resorts in the tree shown, so while searching its count and checkbox cover only its matches
function collectGroupResorts(tree: HierarchyNode[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  function visit(node: HierarchyNode): string[] {
    if (node.type === 'resort') return node.resortId ? [node.resortId] : [];
    const resortIds = (node.children ?? []).flatMap(visit);
    groups.set(node.id, resortIds);
    return resortIds;
  }

  tree.forEach(visit);
  return groups;
}

// The one resort a search found, if it found exactly one: Enter adds or removes it
function findOnlyResort(tree: HierarchyNode[]): HierarchyNode | null {
  const found: HierarchyNode[] = [];

  function visit(node: HierarchyNode): void {
    if (found.length > 1) return;
    if (node.type === 'resort') found.push(node);
    node.children?.forEach(visit);
  }

  tree.forEach(visit);
  return found.length === 1 ? found[0] : null;
}

function isTopLevel(node: HierarchyNode): boolean {
  return node.type === 'custom' || node.type === 'continent';
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
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

// Resort item component
const ResortItem = memo(function ResortItem({
  node,
  isSelected,
  isHighlighted,
  onToggle,
  hideIcons,
  icon = icons.resort,
}: {
  node: HierarchyNode;
  isSelected: boolean;
  isHighlighted: boolean;
  onToggle: (resortId: string) => void;
  hideIcons?: boolean;
  icon?: typeof icons.resort;
}) {
  const toggle = (): void => {
    if (node.resortId) onToggle(node.resortId);
  };

  return (
    <label
      className={`resort-grid-item ${isHighlighted ? 'highlighted' : ''}`}
      onClick={(e) => { e.preventDefault(); toggle(); }}
    >
      <Checkbox state={isSelected ? 'all' : 'none'} onClick={(e) => { e.stopPropagation(); toggle(); }} />
      {!hideIcons && <span className="resort-grid-item-icon"><Icon icon={icon} /></span>}
      <span className="resort-grid-item-name">{node.name}</span>
    </label>
  );
});

interface GroupNodeProps {
  node: HierarchyNode;
  isGroupOpen: (node: HierarchyNode) => boolean;
  onToggleOpen: (groupId: string) => void;
  groupResorts: Map<string, string[]>;
  selected: Set<string>;
  onToggleGroup: (resortIds: string[]) => void;
  onToggleResort: (resortId: string) => void;
  highlightedId: string | null;
  hideIcons?: boolean;
}

// One group at any level: Saved locations, a continent, a country or a Region
const GroupNode = memo(function GroupNode(props: GroupNodeProps) {
  const { node, isGroupOpen, onToggleOpen, groupResorts, selected, onToggleGroup, onToggleResort, highlightedId, hideIcons } = props;
  const level = isTopLevel(node) ? 'continent' : node.type === 'country' ? 'country' : 'province';
  const icon = node.type === 'custom' ? icons.custom : icons[level];
  const isOpen = isGroupOpen(node);
  const children = node.children ?? [];

  const resortIds = groupResorts.get(node.id) ?? [];
  const selectedCount = resortIds.filter((id) => selected.has(id)).length;
  const selectionState = selectedCount === 0 ? 'none' : selectedCount === resortIds.length ? 'all' : 'some';

  const handleToggleOpen = useCallback(() => {
    onToggleOpen(node.id);
  }, [node.id, onToggleOpen]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleGroup(resortIds);
  }, [resortIds, onToggleGroup]);

  return (
    <div className={`resort-grid-${level}`}>
      {/* The whole heading opens and closes the group; only its checkbox selects it */}
      <div className={`resort-grid-${level}-header resort-grid-group-header`} onClick={handleToggleOpen}>
        {/* Its click reaches the heading, which does the opening and closing */}
        <button
          type="button"
          className={`resort-grid-toggle ${isOpen ? 'expanded' : ''}`}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`}
        >
          <Icon icon={isOpen ? icons.caretDown : icons.caretRight} />
        </button>
        <Checkbox state={selectionState} onClick={handleCheckboxClick} />
        {!hideIcons && <span className="resort-grid-header-icon"><Icon icon={icon} /></span>}
        <span className={`resort-grid-${level}-name`}>{node.name}</span>
        <span className="resort-grid-count">
          {selectedCount}/{resortIds.length}
        </span>
      </div>
      {isOpen && node.type === 'custom' && children.length === 0 && (
        <div className="resort-grid-custom-hint">
          Click any resort's map in its forecast view to save a location here.
        </div>
      )}
      {isOpen && children.length > 0 && (
        children[0].type === 'resort' ? (
          <div className="resort-grid-resorts">
            {children.map((resort) => (
              <ResortItem
                key={resort.id}
                node={resort}
                isSelected={resort.resortId ? selected.has(resort.resortId) : false}
                isHighlighted={resort.id === highlightedId}
                onToggle={onToggleResort}
                hideIcons={hideIcons}
                icon={node.type === 'custom' ? icons.custom : icons.resort}
              />
            ))}
          </div>
        ) : (
          <div className={level === 'continent' ? 'resort-grid-countries' : 'resort-grid-provinces'}>
            {children.map((child) => (
              <GroupNode key={child.id} {...props} node={child} />
            ))}
          </div>
        )
      )}
    </div>
  );
});

// Main modal component
export const ResortSelectionGridModal = memo(function ResortSelectionGridModal({
  hierarchy,
  hideIcons,
}: ResortSelectionGridModalProps): JSX.Element | null {
  const {
    isOpen,
    closeModal,
    selectedResorts,
    toggleResort,
    toggleGroup,
    clearAllResorts,
    searchTerm,
    setSearchTerm,
    capNotice,
  } = hierarchy;

  const inputRef = useRef<HTMLInputElement>(null);

  // Get hierarchy tree from context
  const { hierarchyTree } = useHierarchy();

  const searchTexts = useMemo(() => buildSearchTexts(hierarchyTree), [hierarchyTree]);
  // A short search can match a thousand resorts, so the list catches up after each keystroke instead of holding it up
  const shownSearchTerm = useDeferredValue(searchTerm);
  const searchWords = useMemo(() => toSearchWords(shownSearchTerm), [shownSearchTerm]);
  const isSearching = searchWords.length > 0;

  const shownTree = useMemo(
    () => (isSearching ? filterTree(hierarchyTree, searchWords, searchTexts) : hierarchyTree),
    [hierarchyTree, isSearching, searchWords, searchTexts]
  );
  const groupResorts = useMemo(() => collectGroupResorts(shownTree), [shownTree]);
  const onlyResort = useMemo(() => (isSearching ? findOnlyResort(shownTree) : null), [isSearching, shownTree]);
  const selected = useMemo(() => new Set(selectedResorts), [selectedResorts]);

  // Groups opened or closed away from how the picker opens (top level open, the rest closed)
  const [toggledIds, setToggledIds] = useState<Set<string>>(() => new Set());
  // Groups closed during the current search; every other group holding a match is open
  const [closedInSearch, setClosedInSearch] = useState<Set<string>>(() => new Set());

  // Every time it opens, it opens the same way
  useEffect(() => {
    if (isOpen) {
      setToggledIds(new Set());
      setClosedInSearch(new Set());
    }
  }, [isOpen]);

  // Clearing the search goes back to the tree as it was before
  useEffect(() => {
    if (!isSearching) setClosedInSearch(new Set());
  }, [isSearching]);

  const isGroupOpen = useCallback(
    (node: HierarchyNode) => (isSearching ? !closedInSearch.has(node.id) : isTopLevel(node) !== toggledIds.has(node.id)),
    [isSearching, closedInSearch, toggledIds]
  );

  const handleToggleOpen = useCallback((groupId: string) => {
    if (isSearching) {
      setClosedInSearch((prev) => toggleInSet(prev, groupId));
    } else {
      setToggledIds((prev) => toggleInSet(prev, groupId));
    }
  }, [isSearching]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Not while the list is still catching up with what was typed, when its one match may no longer be the one
    if (e.key === 'Enter' && onlyResort?.resortId && shownSearchTerm === searchTerm) {
      e.preventDefault();
      toggleResort(onlyResort.resortId);
    }
  };

  // Auto-focus input on open, unless that would open a phone's keyboard
  useEffect(() => {
    if (isOpen && inputRef.current && shouldAutoFocusSearch()) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Lock page scroll while open, and close on Esc
  useOverlay(isOpen, closeModal);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

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
              onKeyDown={handleSearchKeyDown}
              placeholder="Search resorts, regions or countries..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            className="resort-grid-close-btn"
            onClick={closeModal}
            aria-label="Close"
          >
            <Icon icon={icons.close} />
          </button>
        </div>

        {/* Grid content */}
        <div className="resort-grid-content">
          {shownTree.length === 0 ? (
            <div className="resort-grid-empty">
              {isSearching ? 'No resorts found' : 'No resorts available'}
            </div>
          ) : (
            <div className="resort-grid-columns">
              {shownTree.map((group) => (
                <GroupNode
                  key={group.id}
                  node={group}
                  isGroupOpen={isGroupOpen}
                  onToggleOpen={handleToggleOpen}
                  groupResorts={groupResorts}
                  selected={selected}
                  onToggleGroup={toggleGroup}
                  onToggleResort={toggleResort}
                  highlightedId={onlyResort?.id ?? null}
                  hideIcons={hideIcons}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          {onlyResort?.resortId && (
            <span className="command-hint">
              <kbd>↵</kbd> {selected.has(onlyResort.resortId) ? 'remove' : 'add'}
            </span>
          )}
          <span className="command-hint">
            <kbd>esc</kbd> close
          </span>
          <CapNotice notice={capNotice} />
          {selectedResorts.length > 0 && (
            <button
              className="resort-grid-clear-btn"
              onClick={clearAllResorts}
              aria-label="Clear selection"
            >
              Clear
            </button>
          )}
          <span className="resort-selection-count">
            {selectedResorts.length} / {MAX_SELECTED_RESORTS} selected
          </span>
        </div>
      </div>
    </div>
  );
});
