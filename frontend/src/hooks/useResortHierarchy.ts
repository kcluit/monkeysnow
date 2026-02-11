/**
 * Hook for managing resort hierarchy state and navigation.
 * Provides tree navigation, selection tracking, and search filtering.
 *
 * This hook now gets hierarchy data from the HierarchyContext (fetched from backend).
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useHierarchy, type HierarchyNode } from '../contexts/HierarchyContext';
import { useResortCache } from './useResortCache';

export interface UseResortHierarchyProps {
  selectedResorts: string[];
  onResortsChange: (resorts: string[] | ((prev: string[]) => string[])) => void;
}

export interface UseResortHierarchyReturn {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Navigation
  currentPath: HierarchyNode[]; // Breadcrumb path
  currentNodes: HierarchyNode[]; // Current level's nodes
  navigateTo: (node: HierarchyNode) => void;
  goBack: () => void;
  canGoBack: boolean;

  // Selection
  selectedResorts: string[];
  toggleResort: (resortId: string) => void;
  selectAllInNode: (node: HierarchyNode) => void;
  deselectAllInNode: (node: HierarchyNode) => void;
  clearAllResorts: () => void;
  getSelectionState: (node: HierarchyNode) => 'all' | 'some' | 'none';
  getResortsUnderNode: (node: HierarchyNode) => string[];

  // Keyboard navigation
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  selectCurrent: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredNodes: HierarchyNode[];
  isSearchMode: boolean;

  // Loading state
  isLoading: boolean;
}

/**
 * Flatten hierarchy for search results.
 */
function flattenResorts(nodes: HierarchyNode[]): HierarchyNode[] {
  const results: HierarchyNode[] = [];

  function traverse(node: HierarchyNode): void {
    if (node.type === 'resort') {
      results.push(node);
    }
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return results;
}

export function useResortHierarchy({
  selectedResorts,
  onResortsChange,
}: UseResortHierarchyProps): UseResortHierarchyReturn {
  // Get hierarchy from context (fetched from backend)
  const { hierarchyTree, loading: isLoading } = useHierarchy();

  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Draft selection state - only committed on modal close to avoid lag
  const [draftSelectedResorts, setDraftSelectedResorts] = useState<string[]>(selectedResorts);
  const draftRef = useRef(draftSelectedResorts);
  draftRef.current = draftSelectedResorts;

  // Use draft state when modal is open, committed state when closed
  const activeSelectedResorts = isOpen ? draftSelectedResorts : selectedResorts;

  // Initialize resort cache for performance (O(1) lookups instead of tree traversals)
  const {
    getResortsUnderNode: cachedGetResortsUnderNode,
    getSelectionState: cachedGetSelectionState,
  } = useResortCache({ hierarchyTree, selectedResorts: activeSelectedResorts });

  // Navigation state - stack of parent nodes
  const [navigationStack, setNavigationStack] = useState<HierarchyNode[]>([]);

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Determine if in search mode
  const isSearchMode = searchTerm.trim().length > 0;

  // Get all resorts flattened for search
  const allResorts = useMemo(() => flattenResorts(hierarchyTree), [hierarchyTree]);

  // Filter resorts based on search
  const filteredNodes = useMemo(() => {
    if (!isSearchMode) return [];

    const query = searchTerm.toLowerCase();
    return allResorts.filter((node) =>
      node.name.toLowerCase().includes(query)
    );
  }, [allResorts, searchTerm, isSearchMode]);

  // Current nodes to display
  const currentNodes = useMemo(() => {
    if (isSearchMode) return filteredNodes;

    if (navigationStack.length === 0) {
      return hierarchyTree;
    }

    const currentParent = navigationStack[navigationStack.length - 1];
    return currentParent.children || [];
  }, [hierarchyTree, navigationStack, isSearchMode, filteredNodes]);

  // Reset selected index when nodes change
  useEffect(() => {
    setSelectedIndex(0);
  }, [currentNodes]);

  // Open/close modal
  const openModal = useCallback(() => {
    setDraftSelectedResorts(selectedResorts);
    setIsOpen(true);
    setNavigationStack([]);
    setSearchTerm('');
    setSelectedIndex(0);
  }, [selectedResorts]);

  const closeModal = useCallback(() => {
    // Commit draft selection to parent state on close
    onResortsChange(draftRef.current);
    setIsOpen(false);
    setNavigationStack([]);
    setSearchTerm('');
    setSelectedIndex(0);
  }, [onResortsChange]);

  // Navigation
  const navigateTo = useCallback((node: HierarchyNode) => {
    if (node.type === 'resort') {
      // Toggle selection for resorts (draft state only)
      if (node.resortId) {
        setDraftSelectedResorts((prev) =>
          prev.includes(node.resortId!)
            ? prev.filter((id) => id !== node.resortId)
            : [...prev, node.resortId!]
        );
      }
    } else if (node.children && node.children.length > 0) {
      // Navigate into non-resort nodes
      setNavigationStack((prev) => [...prev, node]);
      setSearchTerm('');
      setSelectedIndex(0);
    }
  }, []);

  const goBack = useCallback(() => {
    if (isSearchMode) {
      setSearchTerm('');
      setSelectedIndex(0);
    } else if (navigationStack.length > 0) {
      setNavigationStack((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
    } else {
      closeModal();
    }
  }, [navigationStack.length, isSearchMode, closeModal]);

  const canGoBack = navigationStack.length > 0 || isSearchMode;

  // Selection helpers - operate on draft state only
  const toggleResort = useCallback((resortId: string) => {
    setDraftSelectedResorts((prev) =>
      prev.includes(resortId)
        ? prev.filter((id) => id !== resortId)
        : [...prev, resortId]
    );
  }, []);

  const selectAllInNode = useCallback((node: HierarchyNode) => {
    const resortIds = cachedGetResortsUnderNode(node);
    setDraftSelectedResorts((prev) => {
      const newSet = new Set(prev);
      for (const id of resortIds) {
        newSet.add(id);
      }
      return Array.from(newSet);
    });
  }, [cachedGetResortsUnderNode]);

  const deselectAllInNode = useCallback((node: HierarchyNode) => {
    const resortIds = cachedGetResortsUnderNode(node);
    const resortIdSet = new Set(resortIds);
    setDraftSelectedResorts((prev) => prev.filter((id) => !resortIdSet.has(id)));
  }, [cachedGetResortsUnderNode]);

  const clearAllResorts = useCallback(() => {
    setDraftSelectedResorts([]);
  }, []);

  // Use cached version for O(1) lookups
  const getSelectionState = cachedGetSelectionState;

  // Keyboard navigation
  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) =>
      prev <= 0 ? currentNodes.length - 1 : prev - 1
    );
  }, [currentNodes.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) =>
      prev >= currentNodes.length - 1 ? 0 : prev + 1
    );
  }, [currentNodes.length]);

  const selectCurrent = useCallback(() => {
    const node = currentNodes[selectedIndex];
    if (node) {
      navigateTo(node);
    }
  }, [currentNodes, selectedIndex, navigateTo]);

  // Keyboard event handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          goBack();
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDown();
          break;
        case 'Enter':
          e.preventDefault();
          selectCurrent();
          break;
        case 'Backspace':
          if (searchTerm === '' && canGoBack) {
            e.preventDefault();
            goBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goBack, navigateUp, navigateDown, selectCurrent, searchTerm, canGoBack]);

  return {
    // Modal state
    isOpen,
    openModal,
    closeModal,

    // Navigation
    currentPath: navigationStack,
    currentNodes,
    navigateTo,
    goBack,
    canGoBack,

    // Selection (draft state when modal is open, committed state when closed)
    selectedResorts: activeSelectedResorts,
    toggleResort,
    selectAllInNode,
    deselectAllInNode,
    clearAllResorts,
    getSelectionState,
    getResortsUnderNode: cachedGetResortsUnderNode,

    // Keyboard navigation
    selectedIndex,
    setSelectedIndex,
    navigateUp,
    navigateDown,
    selectCurrent,

    // Search
    searchTerm,
    setSearchTerm,
    filteredNodes,
    isSearchMode,

    // Loading state
    isLoading,
  };
}
