/**
 * Hook to cache resort lookups and selection state calculations.
 * Prevents redundant tree traversals by pre-computing all node->resorts mappings.
 */

import { useMemo } from 'react';
import type { HierarchyNode } from '../contexts/HierarchyContext';

interface UseResortCacheProps {
  hierarchyTree: HierarchyNode[];
  selectedResorts: string[];
}

interface UseResortCacheReturn {
  getResortsUnderNode: (node: HierarchyNode) => string[];
  getSelectionState: (node: HierarchyNode) => 'all' | 'some' | 'none';
  selectedResortsSet: Set<string>;
}

/**
 * Hook to cache resort lookups and selection state calculations.
 * Prevents redundant tree traversals by pre-computing all node->resorts mappings.
 */
export function useResortCache({
  hierarchyTree,
  selectedResorts,
}: UseResortCacheProps): UseResortCacheReturn {
  // Build static cache of node ID -> resort IDs (O(n) one-time cost)
  const resortCache = useMemo(() => {
    const cache = new Map<string, string[]>();

    function buildCache(node: HierarchyNode): string[] {
      // Check cache first (handles DAG if any shared nodes)
      if (cache.has(node.id)) {
        return cache.get(node.id)!;
      }

      // Resort nodes return their own ID
      if (node.type === 'resort' && node.resortId) {
        const result = [node.resortId];
        cache.set(node.id, result);
        return result;
      }

      // Non-resort nodes aggregate children
      if (!node.children) {
        cache.set(node.id, []);
        return [];
      }

      const ids: string[] = [];
      for (const child of node.children) {
        ids.push(...buildCache(child));
      }

      cache.set(node.id, ids);
      return ids;
    }

    // Build cache for entire tree
    for (const node of hierarchyTree) {
      buildCache(node);
    }

    return cache;
  }, [hierarchyTree]);

  // Convert selectedResorts to Set for O(1) lookups
  const selectedResortsSet = useMemo(
    () => new Set(selectedResorts),
    [selectedResorts]
  );

  // Cached getResortsUnderNode - O(1) lookup instead of recursive traversal
  const getResortsUnderNode = useMemo(() => {
    return (node: HierarchyNode): string[] => {
      return resortCache.get(node.id) || [];
    };
  }, [resortCache]);

  // Memoized getSelectionState - uses cached resort lookups and Set
  const getSelectionState = useMemo(() => {
    return (node: HierarchyNode): 'all' | 'some' | 'none' => {
      const resortIds = resortCache.get(node.id) || [];
      if (resortIds.length === 0) return 'none';

      let selectedCount = 0;
      for (const id of resortIds) {
        if (selectedResortsSet.has(id)) {
          selectedCount++;
        }
      }

      if (selectedCount === 0) return 'none';
      if (selectedCount === resortIds.length) return 'all';
      return 'some';
    };
  }, [resortCache, selectedResortsSet]);

  return {
    getResortsUnderNode,
    getSelectionState,
    selectedResortsSet,
  };
}
