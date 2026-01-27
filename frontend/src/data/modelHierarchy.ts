/**
 * Weather model hierarchy data structure.
 * Organizes weather models by provider for hierarchical selection.
 */

import type { WeatherModel, AggregationType } from '../types/openMeteo';

export interface ModelInfo {
  id: WeatherModel;
  name: string;
  description?: string;
}

export interface AggregationInfo {
  id: AggregationType;
  name: string;
  description: string;
  defaultColor: string;
}

export interface ProviderData {
  id: string;
  name: string;
  models: ModelInfo[];
}

export type ModelNodeType = 'provider' | 'model' | 'aggregation';

export interface ModelHierarchyNode {
  id: string;
  name: string;
  type: ModelNodeType;
  description?: string;
  children?: ModelHierarchyNode[];
  modelId?: WeatherModel;
  aggregationType?: AggregationType;
}

/**
 * Aggregation options (Median, Mean, Min, Max, Percentiles)
 */
export const aggregationOptions: AggregationInfo[] = [
  {
    id: 'median',
    name: 'Median',
    description: 'Middle value across selected models',
    defaultColor: '#a855f7', // Purple
  },
  {
    id: 'mean',
    name: 'Mean',
    description: 'Average across selected models',
    defaultColor: '#ec4899', // Pink
  },
  {
    id: 'min',
    name: 'Min',
    description: 'Minimum value across selected models',
    defaultColor: '#14b8a6', // Teal
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Maximum value across selected models',
    defaultColor: '#f97316', // Orange
  },
  {
    id: 'p25',
    name: '25th Percentile',
    description: '25th percentile across selected models',
    defaultColor: '#3b82f6', // Blue
  },
  {
    id: 'p75',
    name: '75th Percentile',
    description: '75th percentile across selected models',
    defaultColor: '#10b981', // Emerald
  },
];

/**
 * Weather models organized by provider.
 */
export const modelProviders: ProviderData[] = [
  {
    id: 'best',
    name: 'Auto-Select',
    models: [
      { id: 'best_match', name: 'Best Match', description: 'Auto-selected best model for location' },
    ],
  },
  {
    id: 'seamless',
    name: 'Seamless',
    models: [
      { id: 'icon_seamless', name: 'ICON Seamless', description: 'DWD combined global + EU' },
      { id: 'gfs_seamless', name: 'GFS Seamless', description: 'NOAA combined GFS + HRRR' },
      { id: 'gem_seamless', name: 'GEM Seamless', description: 'Canadian combined models' },
      { id: 'meteofrance_seamless', name: 'Météo-France Seamless', description: 'Combined models' },
      { id: 'metno_seamless', name: 'MET Norway Seamless', description: 'Combined models' },
      { id: 'knmi_seamless', name: 'KNMI Seamless', description: 'Dutch combined models' },
      { id: 'jma_seamless', name: 'JMA Seamless', description: 'Japan combined models' },
      { id: 'ukmo_seamless', name: 'UKMO Seamless', description: 'UK Met Office combined models' },
      { id: 'dmi_seamless', name: 'DMI Seamless', description: 'Danish combined models' },
      { id: 'meteoswiss_icon_seamless', name: 'MeteoSwiss Seamless', description: 'Swiss combined models' },
      { id: 'kma_seamless', name: 'KMA Seamless', description: 'Korean combined models' },
    ],
  },
  {
    id: 'ecmwf',
    name: 'ECMWF (European)',
    models: [
      { id: 'ecmwf_ifs', name: 'IFS', description: 'Global model, 9km resolution' },
      { id: 'ecmwf_ifs025', name: 'IFS 0.25°', description: 'High-resolution, 25km' },
      { id: 'ecmwf_aifs025_single', name: 'AIFS', description: 'AI-based forecast' },
    ],
  },
  {
    id: 'icon',
    name: 'ICON (DWD Germany)',
    models: [
      { id: 'icon_global', name: 'Global', description: '13km global' },
      { id: 'icon_eu', name: 'EU', description: '7km Europe' },
      { id: 'icon_d2', name: 'D2', description: '2km Germany' },
    ],
  },
  {
    id: 'usa',
    name: 'USA (NOAA)',
    models: [
      { id: 'gfs_global', name: 'GFS Global', description: '25km global' },
      { id: 'gfs_hrrr', name: 'HRRR', description: '3km continental US' },
      { id: 'gfs_graphcast025', name: 'GraphCast', description: 'AI-based, 25km' },
      { id: 'ncep_nbm_conus', name: 'NCEP NBM', description: 'National Blend of Models' },
      { id: 'ncep_nam_conus', name: 'NCEP NAM', description: 'North American Mesoscale' },
    ],
  },
  {
    id: 'gem',
    name: 'GEM (Canada)',
    models: [
      { id: 'gem_global', name: 'Global', description: '15km global' },
      { id: 'gem_regional', name: 'Regional', description: '10km North America' },
      { id: 'gem_hrdps_continental', name: 'HRDPS Continental', description: '2.5km Canada' },
      { id: 'gem_hrdps_west', name: 'HRDPS West', description: '2.5km Western Canada' },
    ],
  },
  {
    id: 'meteofrance',
    name: 'Météo-France',
    models: [
      { id: 'meteofrance_arpege_world', name: 'ARPEGE World', description: '25km global' },
      { id: 'meteofrance_arpege_europe', name: 'ARPEGE Europe', description: '10km Europe' },
      { id: 'meteofrance_arome_france', name: 'AROME France', description: '2.5km France' },
      { id: 'meteofrance_arome_france_hd', name: 'AROME France HD', description: '1.5km France' },
    ],
  },
  {
    id: 'metno',
    name: 'MET Norway',
    models: [
      { id: 'metno_nordic', name: 'Nordic', description: '1km Scandinavia' },
    ],
  },
  {
    id: 'knmi',
    name: 'KNMI (Netherlands)',
    models: [
      { id: 'knmi_harmonie_arome_europe', name: 'HARMONIE Europe', description: '5.5km Europe' },
      { id: 'knmi_harmonie_arome_netherlands', name: 'HARMONIE Netherlands', description: '2km Netherlands' },
    ],
  },
  {
    id: 'jma',
    name: 'JMA (Japan)',
    models: [
      { id: 'jma_msm', name: 'MSM', description: '5km Japan' },
      { id: 'jma_gsm', name: 'GSM', description: '20km global' },
    ],
  },
  {
    id: 'ukmo',
    name: 'UK Met Office',
    models: [
      { id: 'ukmo_global_deterministic_10km', name: 'Global 10km', description: '10km global' },
      { id: 'ukmo_uk_deterministic_2km', name: 'UK 2km', description: '2km UK' },
    ],
  },
  {
    id: 'dmi',
    name: 'DMI (Denmark)',
    models: [
      { id: 'dmi_harmonie_arome_europe', name: 'HARMONIE Europe', description: '2km Europe' },
    ],
  },
  {
    id: 'meteoswiss',
    name: 'MeteoSwiss',
    models: [
      { id: 'meteoswiss_icon_ch1', name: 'ICON-CH1', description: '1km Switzerland' },
      { id: 'meteoswiss_icon_ch2', name: 'ICON-CH2', description: '2km Switzerland' },
    ],
  },
  {
    id: 'kma',
    name: 'KMA (Korea)',
    models: [
      { id: 'kma_gdps', name: 'GDPS', description: '10km global' },
      { id: 'kma_ldps', name: 'LDPS', description: '1.5km Korea' },
    ],
  },
  {
    id: 'other',
    name: 'Other Models',
    models: [
      { id: 'cma_grapes_global', name: 'CMA GRAPES', description: 'China Meteorological, 15km' },
      { id: 'bom_access_global', name: 'BOM ACCESS', description: 'Australia, 12km global' },
      { id: 'italia_meteo_arpae_icon_2i', name: 'Italia Meteo ICON', description: '2km Italy' },
    ],
  },
];

/**
 * Build hierarchy tree for UI rendering.
 */
export function buildModelHierarchyTree(): ModelHierarchyNode[] {
  const tree: ModelHierarchyNode[] = [];

  // Add aggregations section at top
  tree.push({
    id: 'aggregations',
    name: 'Aggregations',
    type: 'provider',
    children: aggregationOptions.map((agg) => ({
      id: agg.id,
      name: agg.name,
      type: 'aggregation' as const,
      description: agg.description,
      aggregationType: agg.id,
    })),
  });

  // Add provider sections
  for (const provider of modelProviders) {
    tree.push({
      id: provider.id,
      name: provider.name,
      type: 'provider',
      children: provider.models.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'model' as const,
        description: model.description,
        modelId: model.id,
      })),
    });
  }

  return tree;
}

/**
 * Get all model IDs under a node.
 */
export function getModelsUnderNode(node: ModelHierarchyNode): WeatherModel[] {
  const results: WeatherModel[] = [];

  function traverse(n: ModelHierarchyNode): void {
    if (n.type === 'model' && n.modelId) {
      results.push(n.modelId);
    }
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return results;
}

/**
 * Get all aggregation IDs under a node.
 */
export function getAggregationsUnderNode(node: ModelHierarchyNode): AggregationType[] {
  const results: AggregationType[] = [];

  function traverse(n: ModelHierarchyNode): void {
    if (n.type === 'aggregation' && n.aggregationType) {
      results.push(n.aggregationType);
    }
    if (n.children) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return results;
}

/**
 * Get all model IDs from hierarchy.
 */
export function getAllModelIds(): WeatherModel[] {
  const ids: WeatherModel[] = [];
  for (const provider of modelProviders) {
    for (const model of provider.models) {
      ids.push(model.id);
    }
  }
  return ids;
}

/**
 * Flatten all models for search.
 */
export function flattenModels(nodes: ModelHierarchyNode[]): ModelHierarchyNode[] {
  const results: ModelHierarchyNode[] = [];

  function traverse(node: ModelHierarchyNode): void {
    if (node.type === 'model' || node.type === 'aggregation') {
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
