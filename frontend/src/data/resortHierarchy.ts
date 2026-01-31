/**
 * Utility functions for working with resort hierarchy data.
 * The hierarchy data is now fetched from the backend via the HierarchyContext.
 * These functions operate on passed-in data rather than static data.
 */

// Re-export types from the hook for convenience
export type {
  ResortInfo,
  ProvinceData,
  CountryData,
  ContinentData,
  HierarchyNode,
  HierarchyNodeType,
} from '../hooks/useHierarchyData';

import type { HierarchyNode } from '../hooks/useHierarchyData';

/**
 * Get all resort IDs under a hierarchy node.
 * This function doesn't need the full hierarchy - it only traverses the node's children.
 */
export function getResortsUnderNode(node: HierarchyNode): string[] {
  if (node.type === 'resort' && node.resortId) {
    return [node.resortId];
  }

  if (!node.children) return [];

  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(...getResortsUnderNode(child));
  }
  return ids;
}

/**
 * Find a node by ID in the hierarchy tree.
 */
export function findNodeById(nodes: HierarchyNode[], id: string): HierarchyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ============================================================================
// DEPRECATED: The functions below are kept for backward compatibility but
// should not be used. Use the HierarchyContext instead.
// ============================================================================

/**
 * @deprecated Use HierarchyContext's hierarchyTree instead.
 * This function now returns an empty array as hierarchy data comes from the backend.
 */
export function buildHierarchyTree(): HierarchyNode[] {
  console.warn('buildHierarchyTree() is deprecated. Use HierarchyContext instead.');
  return [];
}

/**
 * @deprecated Use HierarchyContext's getDisplayName() instead.
 */
export function getDisplayNameFromHierarchy(resortId: string): string {
  console.warn('getDisplayNameFromHierarchy() is deprecated. Use HierarchyContext instead.');
  return resortId.replace(/-/g, ' ');
}

/**
 * @deprecated Use HierarchyContext's resortAliases instead.
 */
export function buildResortAliases(): Record<string, string> {
  console.warn('buildResortAliases() is deprecated. Use HierarchyContext instead.');
  return {};
}

/**
 * @deprecated Use HierarchyContext's skiResorts instead.
 */
export function getAllResortIds(): string[] {
  console.warn('getAllResortIds() is deprecated. Use HierarchyContext instead.');
  return [];
}
