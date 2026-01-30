/**
 * Hook for managing weather model hierarchy state and navigation.
 * Provides tree navigation, selection tracking, and search filtering.
 *
 * Uses deferred state: changes are buffered locally while the modal is open
 * and only applied to the parent state when the modal closes.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { WeatherModel, AggregationType } from '../types/openMeteo';
import {
  buildModelHierarchyTree,
  getModelsUnderNode,
  getAggregationsUnderNode,
  flattenModels,
  type ModelHierarchyNode,
} from '../data/modelHierarchy';

export interface UseModelHierarchyProps {
  selectedModels: WeatherModel[];
  onModelsChange: (models: WeatherModel[] | ((prev: WeatherModel[]) => WeatherModel[])) => void;
  selectedAggregations: AggregationType[];
  onAggregationsChange: (aggregations: AggregationType[] | ((prev: AggregationType[]) => AggregationType[])) => void;
  aggregationColors: Record<AggregationType, string>;
  onAggregationColorsChange: (colors: Record<AggregationType, string>) => void;
}

export interface UseModelHierarchyReturn {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Navigation
  currentPath: ModelHierarchyNode[]; // Breadcrumb path
  currentNodes: ModelHierarchyNode[]; // Current level's nodes
  navigateTo: (node: ModelHierarchyNode) => void;
  goBack: () => void;
  canGoBack: boolean;

  // Selection
  selectedModels: WeatherModel[];
  selectedAggregations: AggregationType[];
  aggregationColors: Record<AggregationType, string>;
  toggleModel: (modelId: WeatherModel) => void;
  toggleAggregation: (aggType: AggregationType) => void;
  selectAllInNode: (node: ModelHierarchyNode) => void;
  deselectAllInNode: (node: ModelHierarchyNode) => void;
  getSelectionState: (node: ModelHierarchyNode) => 'all' | 'some' | 'none';
  setAggregationColor: (aggType: AggregationType, color: string) => void;

  // Keyboard navigation
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  selectCurrent: () => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredNodes: ModelHierarchyNode[];
  isSearchMode: boolean;
}

export function useModelHierarchy({
  selectedModels,
  onModelsChange,
  selectedAggregations,
  onAggregationsChange,
  aggregationColors,
  onAggregationColorsChange,
}: UseModelHierarchyProps): UseModelHierarchyReturn {
  // Build hierarchy tree once
  const hierarchyTree = useMemo(() => buildModelHierarchyTree(), []);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Local (deferred) state - changes are buffered here while modal is open
  const [localModels, setLocalModels] = useState<WeatherModel[]>(selectedModels);
  const [localAggregations, setLocalAggregations] = useState<AggregationType[]>(selectedAggregations);
  const [localColors, setLocalColors] = useState<Record<AggregationType, string>>(aggregationColors);

  // Track if we need to apply changes on close
  const hasChangesRef = useRef(false);

  // Navigation state - stack of parent nodes
  const [navigationStack, setNavigationStack] = useState<ModelHierarchyNode[]>([]);

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Determine if in search mode
  const isSearchMode = searchTerm.trim().length > 0;

  // Get all items flattened for search
  const allItems = useMemo(() => flattenModels(hierarchyTree), [hierarchyTree]);

  // Filter based on search
  const filteredNodes = useMemo(() => {
    if (!isSearchMode) return [];

    const query = searchTerm.toLowerCase();
    return allItems.filter((node) =>
      node.name.toLowerCase().includes(query) ||
      (node.description?.toLowerCase().includes(query) ?? false)
    );
  }, [allItems, searchTerm, isSearchMode]);

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
    // Initialize local state from parent state when opening
    setLocalModels(selectedModels);
    setLocalAggregations(selectedAggregations);
    setLocalColors(aggregationColors);
    hasChangesRef.current = false;
    setIsOpen(true);
    setNavigationStack([]);
    setSearchTerm('');
    setSelectedIndex(0);
  }, [selectedModels, selectedAggregations, aggregationColors]);

  const closeModal = useCallback(() => {
    // Apply deferred changes to parent state on close
    if (hasChangesRef.current) {
      onModelsChange(localModels);
      onAggregationsChange(localAggregations);
      onAggregationColorsChange(localColors);
    }
    hasChangesRef.current = false;
    setIsOpen(false);
    setNavigationStack([]);
    setSearchTerm('');
    setSelectedIndex(0);
  }, [localModels, localAggregations, localColors, onModelsChange, onAggregationsChange, onAggregationColorsChange]);

  // Navigation
  const navigateTo = useCallback((node: ModelHierarchyNode) => {
    if (node.type === 'model' && node.modelId) {
      // Toggle model selection in local state
      hasChangesRef.current = true;
      setLocalModels((prev) =>
        prev.includes(node.modelId!)
          ? prev.filter((id) => id !== node.modelId)
          : [...prev, node.modelId!]
      );
    } else if (node.type === 'aggregation' && node.aggregationType) {
      // Toggle aggregation selection in local state
      hasChangesRef.current = true;
      setLocalAggregations((prev) =>
        prev.includes(node.aggregationType!)
          ? prev.filter((id) => id !== node.aggregationType)
          : [...prev, node.aggregationType!]
      );
    } else if (node.children && node.children.length > 0) {
      // Navigate into provider nodes
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

  // Toggle functions - operate on local state
  const toggleModel = useCallback((modelId: WeatherModel) => {
    hasChangesRef.current = true;
    setLocalModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  const toggleAggregation = useCallback((aggType: AggregationType) => {
    hasChangesRef.current = true;
    setLocalAggregations((prev) =>
      prev.includes(aggType)
        ? prev.filter((id) => id !== aggType)
        : [...prev, aggType]
    );
  }, []);

  // Bulk selection
  const selectAllInNode = useCallback((node: ModelHierarchyNode) => {
    const modelIds = getModelsUnderNode(node);
    const aggIds = getAggregationsUnderNode(node);

    if (modelIds.length > 0) {
      onModelsChange((prev) => {
        const newSet = new Set(prev);
        for (const id of modelIds) {
          newSet.add(id);
        }
        return Array.from(newSet);
      });
    }

    if (aggIds.length > 0) {
      onAggregationsChange((prev) => {
        const newSet = new Set(prev);
        for (const id of aggIds) {
          newSet.add(id);
        }
        return Array.from(newSet);
      });
    }
  }, [onModelsChange, onAggregationsChange]);

  const deselectAllInNode = useCallback((node: ModelHierarchyNode) => {
    const modelIds = getModelsUnderNode(node);
    const aggIds = getAggregationsUnderNode(node);

    if (modelIds.length > 0) {
      const modelIdSet = new Set(modelIds);
      onModelsChange((prev) => prev.filter((id) => !modelIdSet.has(id)));
    }

    if (aggIds.length > 0) {
      const aggIdSet = new Set(aggIds);
      onAggregationsChange((prev) => prev.filter((id) => !aggIdSet.has(id)));
    }
  }, [onModelsChange, onAggregationsChange]);

  // Get selection state for a node
  const getSelectionState = useCallback((node: ModelHierarchyNode): 'all' | 'some' | 'none' => {
    const modelIds = getModelsUnderNode(node);
    const aggIds = getAggregationsUnderNode(node);

    const totalItems = modelIds.length + aggIds.length;
    if (totalItems === 0) return 'none';

    const selectedModelCount = modelIds.filter((id) => selectedModels.includes(id)).length;
    const selectedAggCount = aggIds.filter((id) => selectedAggregations.includes(id)).length;
    const totalSelected = selectedModelCount + selectedAggCount;

    if (totalSelected === 0) return 'none';
    if (totalSelected === totalItems) return 'all';
    return 'some';
  }, [selectedModels, selectedAggregations]);

  // Color management
  const setAggregationColor = useCallback((aggType: AggregationType, color: string) => {
    onAggregationColorsChange({
      ...aggregationColors,
      [aggType]: color,
    });
  }, [aggregationColors, onAggregationColorsChange]);

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

    // Selection
    selectedModels,
    selectedAggregations,
    aggregationColors,
    toggleModel,
    toggleAggregation,
    selectAllInNode,
    deselectAllInNode,
    getSelectionState,
    setAggregationColor,

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
  };
}
