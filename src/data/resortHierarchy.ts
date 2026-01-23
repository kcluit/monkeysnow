/**
 * Hierarchical resort data structure for global expansion readiness.
 * Structure: Continent > Country > Province/State > Resorts
 */

export interface ResortInfo {
  id: string;           // API ID (e.g., "Cypress-Mountain")
  displayName: string;  // Display name (e.g., "Cypress Mountain")
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

export type HierarchyNodeType = 'continent' | 'country' | 'province' | 'resort';

export interface HierarchyNode {
  id: string;
  name: string;
  type: HierarchyNodeType;
  children?: HierarchyNode[];
  resortId?: string; // Only for resort nodes
}

/**
 * Master resort hierarchy data.
 * Currently includes BC, Alberta, and Washington.
 * Structure is ready for global expansion.
 */
export const resortHierarchy: ContinentData[] = [
  {
    id: 'north-america',
    name: 'North America',
    countries: [
      {
        id: 'canada',
        name: 'Canada',
        provinces: [
          {
            id: 'british-columbia',
            name: 'British Columbia',
            resorts: [
              { id: 'Apex', displayName: 'Apex Mountain' },
              { id: 'Mt-Baldy-Ski-Area', displayName: 'Mt Baldy' },
              { id: 'Big-White', displayName: 'Big White' },
              { id: 'Cypress-Mountain', displayName: 'Cypress Mountain' },
              { id: 'Fairmont-Hot-Springs', displayName: 'Fairmont Hot Springs' },
              { id: 'Fernie', displayName: 'Fernie Alpine' },
              { id: 'Grouse-Mountain', displayName: 'Grouse Mountain' },
              { id: 'Harper-Mountain', displayName: 'Harper Mountain' },
              { id: 'Ski-Smithers', displayName: 'Hudson Bay Mountain' },
              { id: 'Kicking-Horse', displayName: 'Kicking Horse' },
              { id: 'Kimberley', displayName: 'Kimberley Alpine' },
              { id: 'Manning-Park-Resort', displayName: 'Manning Park' },
              { id: 'MountCain', displayName: 'Mount Cain' },
              { id: 'Mount-Timothy-Ski-Area', displayName: 'Mount Timothy' },
              { id: 'Mount-Washington', displayName: 'Mount Washington' },
              { id: 'Mount-Seymour', displayName: 'Mount Seymour' },
              { id: 'Murray-Ridge', displayName: 'Murray Ridge' },
              { id: 'Panorama', displayName: 'Panorama Mountain' },
              { id: 'PowderKing', displayName: 'Powder King' },
              { id: 'Red-Mountain', displayName: 'Red Mountain' },
              { id: 'Revelstoke', displayName: 'Revelstoke Mountain' },
              { id: 'HemlockResort', displayName: 'Sasquatch Mountain' },
              { id: 'ShamesMountain', displayName: 'Shames Mountain' },
              { id: 'Silver-Star', displayName: 'SilverStar Mountain' },
              { id: 'Summit-Lake-Ski-and-Snowboard-Area', displayName: 'Summit Lake Ski Area' },
              { id: 'Sun-Peaks', displayName: 'Sun Peaks' },
              { id: 'Troll-Resort', displayName: 'Troll Resort' },
              { id: 'Whistler-Blackcomb', displayName: 'Whistler Blackcomb' },
              { id: 'Whitewater', displayName: 'Whitewater' },
            ],
          },
          {
            id: 'alberta',
            name: 'Alberta',
            resorts: [
              { id: 'Lake-Louise', displayName: 'Lake Louise' },
              { id: 'Sunshine', displayName: 'Sunshine Village' },
              { id: 'Banff-Norquay', displayName: 'Mt Norquay' },
              { id: 'Marmot-Basin', displayName: 'Marmot Basin' },
              { id: 'Nakiska', displayName: 'Nakiska' },
              { id: 'Castle-Mountain-Resort', displayName: 'Castle Mountain' },
              { id: 'Pass-Powderkeg', displayName: 'Pass Powderkeg' },
            ],
          },
        ],
      },
      {
        id: 'united-states',
        name: 'United States',
        provinces: [
          {
            id: 'washington',
            name: 'Washington',
            resorts: [
              { id: 'Mount-Baker', displayName: 'Mt Baker' },
              { id: 'Crystal-Mountain', displayName: 'Crystal Mountain WA' },
              { id: 'Stevens-Pass', displayName: 'Stevens Pass' },
            ],
          },
        ],
      },
    ],
  },
  // Future: Add more continents
  // {
  //   id: 'europe',
  //   name: 'Europe',
  //   countries: [...]
  // },
];

/**
 * Convert hierarchy to flat HierarchyNode tree for UI rendering.
 */
export function buildHierarchyTree(): HierarchyNode[] {
  return resortHierarchy.map((continent): HierarchyNode => ({
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
 * Get all resort IDs from the hierarchy.
 */
export function getAllResortIds(): string[] {
  const ids: string[] = [];
  for (const continent of resortHierarchy) {
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
 * Get all resort IDs in a specific province.
 */
export function getResortsByProvince(provinceId: string): string[] {
  for (const continent of resortHierarchy) {
    for (const country of continent.countries) {
      for (const province of country.provinces) {
        if (province.id === provinceId) {
          return province.resorts.map(r => r.id);
        }
      }
    }
  }
  return [];
}

/**
 * Get all resort IDs in a specific country.
 */
export function getResortsByCountry(countryId: string): string[] {
  for (const continent of resortHierarchy) {
    for (const country of continent.countries) {
      if (country.id === countryId) {
        const ids: string[] = [];
        for (const province of country.provinces) {
          for (const resort of province.resorts) {
            ids.push(resort.id);
          }
        }
        return ids;
      }
    }
  }
  return [];
}

/**
 * Get all resort IDs in a specific continent.
 */
export function getResortsByContinent(continentId: string): string[] {
  for (const continent of resortHierarchy) {
    if (continent.id === continentId) {
      const ids: string[] = [];
      for (const country of continent.countries) {
        for (const province of country.provinces) {
          for (const resort of province.resorts) {
            ids.push(resort.id);
          }
        }
      }
      return ids;
    }
  }
  return [];
}

/**
 * Get all resort IDs under a hierarchy node.
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

/**
 * Get display name for a resort ID.
 */
export function getDisplayNameFromHierarchy(resortId: string): string {
  for (const continent of resortHierarchy) {
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
  return resortId.replace(/-/g, ' ');
}

/**
 * Build resort aliases from hierarchy (for backward compatibility with constants.ts).
 * Returns a mapping of displayName -> apiId.
 */
export function buildResortAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const continent of resortHierarchy) {
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
