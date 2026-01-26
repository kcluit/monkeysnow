import { useState, useEffect, useMemo, useCallback } from 'react';

// Types matching backend /hierarchy response
export interface ResortInfo {
  id: string;
  displayName: string;
}

export interface ProvinceData {
  id: string;
  name: string;
  resorts: ResortInfo[];
}

export interface CountryData {
  id: string;
  name: string;
  provinces: ProvinceData[];
}

export interface ContinentData {
  id: string;
  name: string;
  countries: CountryData[];
}

export interface HierarchyResponse {
  continents: ContinentData[];
}

export type HierarchyNodeType = 'continent' | 'country' | 'province' | 'resort';

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children?: HierarchyNode[];
  resortId?: string;
}

const API_URL = 'http://localhost:1234';

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
 * Gets display name for a resort ID from the hierarchy.
 */
function getDisplayNameFromHierarchy(hierarchy: ContinentData[], resortId: string): string {
  for (const continent of hierarchy) {
    for (const country of continent.countries) {
      for (const province of country.provinces) {
        for (const resort of province.resorts) {
          if (resort.id === resortId) {
            return resort.displayName;
          }
        }
      }
    }
  }
  // Fallback: convert ID to readable name
  return resortId.replace(/-/g, ' ');
}

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
  const [hierarchy, setHierarchy] = useState<ContinentData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHierarchy = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/hierarchy`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data: HierarchyResponse = await response.json();
        setHierarchy(data.continents);
      } catch (err) {
        console.error('Failed to fetch hierarchy:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, []);

  const hierarchyTree = useMemo(
    () => (hierarchy ? buildHierarchyTree(hierarchy) : []),
    [hierarchy]
  );

  const resortAliases = useMemo(
    () => (hierarchy ? buildResortAliases(hierarchy) : {}),
    [hierarchy]
  );

  const skiResorts = useMemo(
    () => (hierarchy ? getAllResortIds(hierarchy) : []),
    [hierarchy]
  );

  const getDisplayName = useCallback(
    (resortId: string) =>
      hierarchy ? getDisplayNameFromHierarchy(hierarchy, resortId) : resortId.replace(/-/g, ' '),
    [hierarchy]
  );

  return {
    hierarchy,
    hierarchyTree,
    resortAliases,
    skiResorts,
    getDisplayName,
    loading,
    error,
  };
}
