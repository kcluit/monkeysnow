import { useEffect, useCallback } from 'react';
import { RESORT_HIERARCHY } from '../data/resortLocations';
import type { ContinentData } from '../data/resortLocations';

export type { ContinentData, CountryData, ProvinceData, ResortInfo } from '../data/resortLocations';

export type HierarchyNodeType = 'continent' | 'country' | 'province' | 'resort';

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children?: HierarchyNode[];
  resortId?: string;
  /** A resort's other names, often in the local script; matched by search but not shown. */
  aka?: string[];
}

/** Whether a node's name, or one of its other names, contains the (lowercased) query. */
export function nodeMatchesSearch(node: HierarchyNode, query: string): boolean {
  return [node.name, ...(node.aka ?? [])].some(name => name.toLowerCase().includes(query));
}

/**
 * Converts hierarchy data to a flat HierarchyNode tree for UI rendering.
 */
function buildHierarchyTree(hierarchy: ContinentData[]): HierarchyNode[] {
  return hierarchy.map((continent): HierarchyNode => ({
    id: continent.id,
    name: continent.name,
    type: 'continent',
    children: continent.countries.map((country): HierarchyNode => ({
      id: country.id,
      name: country.name,
      type: 'country',
      children: country.provinces.map((province): HierarchyNode => ({
        id: province.id,
        name: province.name,
        type: 'province',
        children: province.resorts.map((resort): HierarchyNode => ({
          id: `resort-${resort.id}`,
          name: resort.displayName,
          type: 'resort',
          resortId: resort.id,
          ...(resort.aka ? { aka: resort.aka } : {}),
        })),
      })),
    })),
  }));
}

/**
 * Builds a mapping of displayName -> resortId from hierarchy data.
 */
function buildResortAliases(hierarchy: ContinentData[]): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const continent of hierarchy) {
    for (const country of continent.countries) {
      for (const province of country.provinces) {
        for (const resort of province.resorts) {
          aliases[resort.displayName] = resort.id;
        }
      }
    }
  }
  return aliases;
}

/**
 * Gets all resort IDs from the hierarchy.
 */
function getAllResortIds(hierarchy: ContinentData[]): string[] {
  const ids: string[] = [];
  for (const continent of hierarchy) {
    for (const country of continent.countries) {
      for (const province of country.provinces) {
        for (const resort of province.resorts) {
          ids.push(resort.id);
        }
      }
    }
  }
  return ids;
}

/**
 * Builds a mapping of resortId -> displayName from hierarchy data.
 */
function buildDisplayNames(hierarchy: ContinentData[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const continent of hierarchy) {
    for (const country of continent.countries) {
      for (const province of country.provinces) {
        for (const resort of province.resorts) {
          if (!names.has(resort.id)) names.set(resort.id, resort.displayName);
        }
      }
    }
  }
  return names;
}

// The hierarchy is bundled with the app, so everything derived from it is built once.
const HIERARCHY_TREE = buildHierarchyTree(RESORT_HIERARCHY);
const RESORT_ALIASES = buildResortAliases(RESORT_HIERARCHY);
const SKI_RESORTS = getAllResortIds(RESORT_HIERARCHY);
const DISPLAY_NAMES = buildDisplayNames(RESORT_HIERARCHY);

export interface UseHierarchyDataReturn {
  hierarchy: ContinentData[] | null;
  hierarchyTree: HierarchyNode[];
  resortAliases: Record<string, string>;
  skiResorts: string[];
  getDisplayName: (resortId: string) => string;
  loading: boolean;
  error: Error | null;
}

export function useHierarchyData(): UseHierarchyDataReturn {
  // Drop the copy of the hierarchy that used to be cached from the backend
  useEffect(() => {
    try { localStorage.removeItem('hierarchyCache'); } catch { /* ignore */ }
  }, []);

  const getDisplayName = useCallback(
    (resortId: string) => DISPLAY_NAMES.get(resortId) ?? resortId.replace(/-/g, ' '),
    []
  );

  return {
    hierarchy: RESORT_HIERARCHY,
    hierarchyTree: HIERARCHY_TREE,
    resortAliases: RESORT_ALIASES,
    skiResorts: SKI_RESORTS,
    getDisplayName,
    loading: false,
    error: null,
  };
}
