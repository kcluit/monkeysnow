import { useCallback, useMemo } from 'react';
import { RESORT_HIERARCHY, continentName } from '../data/resortLocations';
import type { ContinentData, ResortInfo } from '../data/resortLocations';
import { countryName, regionName } from '../locales';
import { useLanguage } from './useLanguage';
import { useSavedLocations } from './useSavedLocations';
import type { SavedLocation } from '../utils/savedLocations';
import { countryNamesInEveryLanguage, regionNamesInEveryLanguage } from '../utils/resortSearch';
import type { Translate } from '../types/i18n';

export type { ContinentData, CountryData, ProvinceData, ResortInfo } from '../data/resortLocations';

/**
 * 'custom' is the group of Saved locations, listed before the continents; its children are 'resort' nodes.
 * A 'country' holds 'province' nodes (its Regions), or 'resort' nodes when it isn't split into Regions.
 */
export type HierarchyNodeType = 'custom' | 'continent' | 'country' | 'province' | 'resort';

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children?: HierarchyNode[];
  resortId?: string;
  /**
   * A resort's other names, often in the local script, or a country's or Region's name in
   * every language; matched by search but not shown.
   */
  aka?: string[];
}

function toResortNode(resort: ResortInfo): HierarchyNode {
  return {
    id: `resort-${resort.id}`,
    name: resort.displayName,
    type: 'resort',
    resortId: resort.id,
    ...(resort.aka ? { aka: resort.aka } : {}),
  };
}

/**
 * Converts hierarchy data to a flat HierarchyNode tree for UI rendering, in the language
 * shown: continents, countries and the Regions it names are named in it, and countries
 * and Regions sorted in its order.
 */
function buildHierarchyTree(hierarchy: ContinentData[], t: Translate, locale: string): HierarchyNode[] {
  const collator = new Intl.Collator(locale);
  const byName = (a: HierarchyNode, b: HierarchyNode) => collator.compare(a.name, b.name);
  return hierarchy.map((continent): HierarchyNode => ({
    id: continent.id,
    name: continentName(continent.name),
    type: 'continent',
    children: continent.countries
      .map((country): HierarchyNode => ({
        id: country.id,
        name: countryName(country.code, country.name),
        type: 'country',
        aka: countryNamesInEveryLanguage(country.code, country.name),
        children: country.hasRegions
          ? country.provinces
              .map((province): HierarchyNode => province.isOther
                ? { id: province.id, name: t('picker.otherRegion'), type: 'province', children: province.resorts.map(toResortNode) }
                : {
                    id: province.id,
                    name: regionName(country.code, province.name),
                    type: 'province',
                    aka: regionNamesInEveryLanguage(country.code, province.name),
                    children: province.resorts.map(toResortNode),
                  })
              .sort(byName)
          : country.provinces.flatMap((province) => province.resorts.map(toResortNode)),
      }))
      .sort(byName),
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

/** The picker's Saved locations group: Saved locations by name, straight under it with no Country or Region. */
function buildCustomNode(savedLocations: SavedLocation[], t: Translate): HierarchyNode {
  return {
    id: 'custom',
    name: t('picker.savedLocations'),
    type: 'custom',
    children: [...savedLocations]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((location): HierarchyNode => ({
        id: `resort-${location.id}`,
        name: location.name,
        type: 'resort',
        resortId: location.id,
      })),
  };
}

// The hierarchy is bundled with the app, so everything derived from it is built once,
// except the tree's names, which are built again in each language shown.
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
  const savedLocations = useSavedLocations();
  const { t, language } = useLanguage();

  const continentsTree = useMemo(
    () => buildHierarchyTree(RESORT_HIERARCHY, t, language.locale),
    [t, language.locale]
  );
  const hierarchyTree = useMemo(
    () => [buildCustomNode(savedLocations, t), ...continentsTree],
    [savedLocations, t, continentsTree]
  );

  const getDisplayName = useCallback(
    (resortId: string) =>
      DISPLAY_NAMES.get(resortId)
      ?? savedLocations.find((location) => location.id === resortId)?.name
      ?? resortId.replace(/-/g, ' '),
    [savedLocations]
  );

  return {
    hierarchy: RESORT_HIERARCHY,
    hierarchyTree,
    resortAliases: RESORT_ALIASES,
    skiResorts: SKI_RESORTS,
    getDisplayName,
    loading: false,
    error: null,
  };
}
