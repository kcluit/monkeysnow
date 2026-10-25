/**
 * Forecast model catalogue, organised by Provider for hierarchical selection.
 * Single source of truth for each model's names, colour, Coverage and whether it
 * is one of the Recommended models (see CONTEXT.md and docs/adr/0005).
 */

import type { WeatherModel, AggregationType } from '../types/openMeteo';
import type { TranslationKey } from '../types/i18n';
import { formatDecimal, translate } from '../locales';

/** A latitude/longitude box, drawn generously around a model's own forecast area. */
export interface CoverageBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export type Coverage = 'global' | CoverageBox;

export interface ModelInfo {
  id: WeatherModel;
  /** Name inside its Provider's section, e.g. "HRRR" */
  name: string;
  /** Standalone name for chart legends, e.g. "NOAA HRRR" */
  label: string;
  color: string;
  /** In the current language whenever it's read, as resolution is */
  description?: string;
  /** Grid spacing, e.g. "2.5km" ("2,5 km" in French) */
  resolution?: string;
  coverage: Coverage;
  /** One of the Recommended models every visitor starts with */
  recommended?: boolean;
  ai?: boolean;
  /** Served by Open-Meteo but not yet documented */
  experimental?: boolean;
  /** Open-Meteo doesn't serve a variable a main-page card needs, so it can't be a Country model */
  noCards?: boolean;
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
  resolution?: string;
  children?: ModelHierarchyNode[];
  modelId?: WeatherModel;
  aggregationType?: AggregationType;
  ai?: boolean;
  experimental?: boolean;
}

/**
 * Aggregation options (Median, Mean, Min, Max, Percentiles). Names and descriptions are
 * getters, so they are in the current language whenever they're read, chart legends included.
 */
export const aggregationOptions: AggregationInfo[] = [
  {
    id: 'median',
    get name() { return translate('detail.aggregation.median'); },
    get description() { return translate('detail.aggregation.medianDescription'); },
    defaultColor: '#a855f7', // Purple
  },
  {
    id: 'mean',
    get name() { return translate('detail.aggregation.mean'); },
    get description() { return translate('detail.aggregation.meanDescription'); },
    defaultColor: '#ec4899', // Pink
  },
  {
    id: 'min',
    get name() { return translate('detail.aggregation.min'); },
    get description() { return translate('detail.aggregation.minDescription'); },
    defaultColor: '#14b8a6', // Teal
  },
  {
    id: 'max',
    get name() { return translate('detail.aggregation.max'); },
    get description() { return translate('detail.aggregation.maxDescription'); },
    defaultColor: '#f97316', // Orange
  },
  {
    id: 'p25',
    get name() { return translate('detail.aggregation.p25'); },
    get description() { return translate('detail.aggregation.p25Description'); },
    defaultColor: '#3b82f6', // Blue
  },
  {
    id: 'p75',
    get name() { return translate('detail.aggregation.p75'); },
    get description() { return translate('detail.aggregation.p75Description'); },
    defaultColor: '#10b981', // Emerald
  },
];

// Coverage boxes, from each domain's meta.json bounding box plus a margin. Too loose is
// fine (the runtime check drops models that come back empty); too tight hides a model.
const US: CoverageBox = { south: 19, north: 54, west: -139, east: -58 };
const NORTH_AMERICA: CoverageBox = { south: 15, north: 85, west: -180, east: -30 };
const HRDPS: CoverageBox = { south: 39, north: 72, west: -155, east: -40 };
const HRDPS_WEST: CoverageBox = { south: 45, north: 61.5, west: -128, east: -112 };
const ICON_EU: CoverageBox = { south: 29.5, north: 70.5, west: -23.5, east: 62.5 };
const ICON_D2: CoverageBox = { south: 43, north: 58.5, west: -4, east: 20.5 };
const ARPEGE_EUROPE: CoverageBox = { south: 20, north: 72, west: -32, east: 42 };
const AROME_FRANCE: CoverageBox = { south: 37.5, north: 55.5, west: -12, east: 16 };
const UKV: CoverageBox = { south: 43, north: 64, west: -25, east: 15 };
const JMA_MSM: CoverageBox = { south: 22, north: 48, west: 120, east: 150 };
const HARMONIE_EUROPE: CoverageBox = { south: 39.5, north: 63, west: -25, east: 40 };
const KNMI_NETHERLANDS: CoverageBox = { south: 48.5, north: 55.5, west: 0, east: 9 };
const MET_NORDIC: CoverageBox = { south: 52, north: 72.5, west: -2, east: 34 };
const METEOSWISS: CoverageBox = { south: 42.5, north: 50, west: 1, east: 17 };
const GEOSPHERE: CoverageBox = { south: 43, north: 52, west: 5.5, east: 22.5 };
const CHMI_CENTRAL_EUROPE: CoverageBox = { south: 38.5, north: 56.5, west: 1, east: 34.5 };
const CHMI_CZECHIA: CoverageBox = { south: 48.5, north: 51.2, west: 12, east: 19 };
const ICON_2I: CoverageBox = { south: 33.5, north: 49, west: 3, east: 22 };

/** A model as the catalogue below writes it: its description is a translation key */
type CatalogueModel = Omit<ModelInfo, 'description'> & { descriptionKey: TranslationKey };

/** A grid spacing such as "2.5km" or "1.5-25km" written the current language's way: "2,5 km" in French */
function localResolution(resolution: string): string {
  const distance = resolution
    .replace(/km$/, '')
    .replace(/\d+\.\d+/g, (number) => formatDecimal(Number(number), number.split('.')[1].length));
  return translate('detail.modelResolution', { distance });
}

/**
 * One Provider's models, with their description and resolution as getters, so they are
 * in the current language whenever they're read (the language can change on an open page).
 */
function describe(models: CatalogueModel[]): ModelInfo[] {
  return models.map(({ descriptionKey, resolution, ...model }): ModelInfo => {
    const info: ModelInfo = Object.defineProperty(model, 'description', {
      get: () => translate(descriptionKey),
      enumerable: true,
    });
    return resolution === undefined ? info : Object.defineProperty(info, 'resolution', {
      get: () => localResolution(resolution),
      enumerable: true,
    });
  });
}

/**
 * Forecast models by Provider: each Provider's Seamless model first, then its
 * single models from coarsest to finest. A name that says where a Provider is
 * is a getter, so it's in the current language whenever it's read.
 */
export const modelProviders: ProviderData[] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    models: describe([
      { id: 'best_match', name: 'Best Match', label: 'Best Match', color: '#6366f1', descriptionKey: 'detail.modelDescription.bestMatch', coverage: 'global' },
    ]),
  },
  {
    id: 'ecmwf',
    get name() { return translate('detail.provider.ecmwf'); },
    models: describe([
      { id: 'ecmwf_ifs025', name: 'IFS 0.25°', label: 'ECMWF IFS 0.25°', color: '#0ea5e9', descriptionKey: 'detail.modelDescription.ecmwfIfs025', resolution: '25km', coverage: 'global' },
      { id: 'ecmwf_aifs025_single', name: 'AIFS', label: 'ECMWF AIFS', color: '#1d4ed8', descriptionKey: 'detail.modelDescription.ecmwfAifs025Single', resolution: '25km', coverage: 'global', ai: true },
      { id: 'ecmwf_ifs', name: 'IFS HRES', label: 'ECMWF IFS HRES', color: '#3b82f6', descriptionKey: 'detail.modelDescription.ecmwfIfs', resolution: '9km', coverage: 'global', recommended: true },
    ]),
  },
  {
    id: 'noaa',
    get name() { return translate('detail.provider.noaa'); },
    models: describe([
      { id: 'ncep_gfs_seamless', name: 'GFS Seamless', label: 'GFS Seamless', color: '#f59e0b', descriptionKey: 'detail.modelDescription.ncepGfsSeamless', resolution: '3-13km', coverage: 'global', recommended: true },
      { id: 'ncep_aigfs025', name: 'AIGFS', label: 'NOAA AIGFS', color: '#b45309', descriptionKey: 'detail.modelDescription.ncepAigfs025', resolution: '25km', coverage: 'global', ai: true, noCards: true },
      { id: 'ncep_hgefs025_ensemble_mean', name: 'HGEFS Mean', label: 'NOAA HGEFS Mean', color: '#fcd34d', descriptionKey: 'detail.modelDescription.ncepHgefs025EnsembleMean', resolution: '25km', coverage: 'global', ai: true, noCards: true },
      { id: 'ncep_gfs_global', name: 'GFS', label: 'NOAA GFS', color: '#d97706', descriptionKey: 'detail.modelDescription.ncepGfsGlobal', resolution: '13km', coverage: 'global' },
      { id: 'ncep_nam_conus', name: 'NAM', label: 'NOAA NAM', color: '#ea580c', descriptionKey: 'detail.modelDescription.ncepNamConus', resolution: '3km', coverage: US },
      { id: 'ncep_hrrr_conus', name: 'HRRR', label: 'NOAA HRRR', color: '#c2410c', descriptionKey: 'detail.modelDescription.ncepHrrrConus', resolution: '3km', coverage: US },
      { id: 'ncep_nbm_conus', name: 'NBM', label: 'NOAA NBM', color: '#22c55e', descriptionKey: 'detail.modelDescription.ncepNbmConus', resolution: '2.5km', coverage: US },
    ]),
  },
  {
    id: 'dwd',
    get name() { return translate('detail.provider.dwd'); },
    models: describe([
      { id: 'dwd_icon_seamless', name: 'ICON Seamless', label: 'ICON Seamless', color: '#10b981', descriptionKey: 'detail.modelDescription.dwdIconSeamless', resolution: '2-11km', coverage: 'global' },
      { id: 'dwd_icon_global_native', name: 'ICON Global (native grid)', label: 'DWD ICON Global native', color: '#047857', descriptionKey: 'detail.modelDescription.dwdIconGlobalNative', resolution: '13km', coverage: 'global', experimental: true },
      { id: 'dwd_icon_global', name: 'ICON Global', label: 'DWD ICON Global', color: '#059669', descriptionKey: 'detail.modelDescription.dwdIconGlobal', resolution: '11km', coverage: 'global' },
      { id: 'dwd_icon_eu', name: 'ICON-EU', label: 'DWD ICON-EU', color: '#34d399', descriptionKey: 'detail.modelDescription.dwdIconEu', resolution: '7km', coverage: ICON_EU },
      { id: 'dwd_icon_d2', name: 'ICON-D2', label: 'DWD ICON-D2', color: '#0d9488', descriptionKey: 'detail.modelDescription.dwdIconD2', resolution: '2km', coverage: ICON_D2 },
      { id: 'dwd_icon_d2_native', name: 'ICON-D2 (native grid)', label: 'DWD ICON-D2 native', color: '#115e59', descriptionKey: 'detail.modelDescription.dwdIconD2Native', resolution: '2km', coverage: ICON_D2, experimental: true },
    ]),
  },
  {
    id: 'eccc',
    get name() { return translate('detail.provider.eccc'); },
    models: describe([
      { id: 'cmc_gem_seamless', name: 'GEM Seamless', label: 'GEM Seamless', color: '#ef4444', descriptionKey: 'detail.modelDescription.cmcGemSeamless', resolution: '2.5-15km', coverage: 'global' },
      { id: 'cmc_gem_gdps', name: 'GEM Global', label: 'GEM Global', color: '#dc2626', descriptionKey: 'detail.modelDescription.cmcGemGdps', resolution: '15km', coverage: 'global' },
      { id: 'cmc_gem_rdps', name: 'GEM Regional', label: 'GEM Regional', color: '#b91c1c', descriptionKey: 'detail.modelDescription.cmcGemRdps', resolution: '10km', coverage: NORTH_AMERICA },
      { id: 'cmc_gem_hrdps', name: 'HRDPS', label: 'GEM HRDPS', color: '#991b1b', descriptionKey: 'detail.modelDescription.cmcGemHrdps', resolution: '2.5km', coverage: HRDPS },
      { id: 'cmc_gem_hrdps_west', name: 'HRDPS West', label: 'GEM HRDPS West', color: '#7f1d1d', descriptionKey: 'detail.modelDescription.cmcGemHrdpsWest', resolution: '1km', coverage: HRDPS_WEST },
    ]),
  },
  {
    id: 'meteofrance',
    name: 'Météo-France',
    models: describe([
      { id: 'meteofrance_seamless', name: 'Météo-France Seamless', label: 'Météo-France Seamless', color: '#8b5cf6', descriptionKey: 'detail.modelDescription.meteofranceSeamless', resolution: '1.5-25km', coverage: 'global' },
      { id: 'meteofrance_arpege_seamless', name: 'ARPEGE Seamless', label: 'ARPEGE Seamless', color: '#a78bfa', descriptionKey: 'detail.modelDescription.meteofranceArpegeSeamless', resolution: '10-25km', coverage: 'global' },
      { id: 'meteofrance_arome_seamless', name: 'AROME Seamless', label: 'AROME Seamless', color: '#c4b5fd', descriptionKey: 'detail.modelDescription.meteofranceAromeSeamless', resolution: '1.5-2.5km', coverage: AROME_FRANCE },
      { id: 'meteofrance_arpege_world', name: 'ARPEGE World', label: 'ARPEGE World', color: '#7c3aed', descriptionKey: 'detail.modelDescription.meteofranceArpegeWorld', resolution: '25km', coverage: 'global' },
      { id: 'meteofrance_arpege_europe', name: 'ARPEGE Europe', label: 'ARPEGE Europe', color: '#6d28d9', descriptionKey: 'detail.modelDescription.meteofranceArpegeEurope', resolution: '10km', coverage: ARPEGE_EUROPE },
      { id: 'meteofrance_arome_france', name: 'AROME France', label: 'AROME France', color: '#5b21b6', descriptionKey: 'detail.modelDescription.meteofranceAromeFrance', resolution: '2.5km', coverage: AROME_FRANCE },
      { id: 'meteofrance_arome_france_hd', name: 'AROME France HD', label: 'AROME France HD', color: '#4c1d95', descriptionKey: 'detail.modelDescription.meteofranceAromeFranceHd', resolution: '1.5km', coverage: AROME_FRANCE, noCards: true },
    ]),
  },
  {
    id: 'ukmo',
    name: 'UK Met Office',
    models: describe([
      { id: 'ukmo_seamless', name: 'UKMO Seamless', label: 'UKMO Seamless', color: '#22d3ee', descriptionKey: 'detail.modelDescription.ukmoSeamless', resolution: '2-10km', coverage: 'global' },
      { id: 'ukmo_global_deterministic_10km', name: 'Global', label: 'UKMO Global', color: '#06b6d4', descriptionKey: 'detail.modelDescription.ukmoGlobalDeterministic10km', resolution: '10km', coverage: 'global' },
      { id: 'ukmo_uk_deterministic_2km', name: 'UK', label: 'UKMO UK', color: '#0891b2', descriptionKey: 'detail.modelDescription.ukmoUkDeterministic2km', resolution: '2km', coverage: UKV },
    ]),
  },
  {
    id: 'jma',
    get name() { return translate('detail.provider.jma'); },
    models: describe([
      { id: 'jma_seamless', name: 'JMA Seamless', label: 'JMA Seamless', color: '#f472b6', descriptionKey: 'detail.modelDescription.jmaSeamless', resolution: '5-55km', coverage: 'global' },
      { id: 'jma_gsm', name: 'GSM', label: 'JMA GSM', color: '#d946ef', descriptionKey: 'detail.modelDescription.jmaGsm', resolution: '55km', coverage: 'global' },
      { id: 'jma_msm', name: 'MSM', label: 'JMA MSM', color: '#e879f9', descriptionKey: 'detail.modelDescription.jmaMsm', resolution: '5km', coverage: JMA_MSM },
    ]),
  },
  {
    id: 'knmi',
    get name() { return translate('detail.provider.knmi'); },
    models: describe([
      { id: 'knmi_seamless', name: 'KNMI Seamless', label: 'KNMI Seamless', color: '#65a30d', descriptionKey: 'detail.modelDescription.knmiSeamless', resolution: '2-5.5km', coverage: HARMONIE_EUROPE },
      { id: 'knmi_harmonie_arome_europe', name: 'HARMONIE Europe', label: 'KNMI HARMONIE Europe', color: '#84cc16', descriptionKey: 'detail.modelDescription.knmiHarmonieAromeEurope', resolution: '5.5km', coverage: HARMONIE_EUROPE },
      { id: 'knmi_harmonie_arome_netherlands', name: 'HARMONIE Netherlands', label: 'KNMI HARMONIE NL', color: '#4d7c0f', descriptionKey: 'detail.modelDescription.knmiHarmonieAromeNetherlands', resolution: '2km', coverage: KNMI_NETHERLANDS },
    ]),
  },
  {
    id: 'dmi',
    get name() { return translate('detail.provider.dmi'); },
    models: describe([
      { id: 'dmi_seamless', name: 'DMI Seamless', label: 'DMI Seamless', color: '#d8b4fe', descriptionKey: 'detail.modelDescription.dmiSeamless', resolution: '2km', coverage: HARMONIE_EUROPE },
      { id: 'dmi_harmonie_arome_europe', name: 'HARMONIE Europe', label: 'DMI HARMONIE Europe', color: '#c084fc', descriptionKey: 'detail.modelDescription.dmiHarmonieAromeEurope', resolution: '2km', coverage: HARMONIE_EUROPE },
    ]),
  },
  {
    id: 'metno',
    name: 'MET Norway',
    models: describe([
      { id: 'metno_seamless', name: 'MET Norway Seamless', label: 'MET Norway Seamless', color: '#ca8a04', descriptionKey: 'detail.modelDescription.metnoSeamless', resolution: '1km', coverage: MET_NORDIC },
      { id: 'metno_nordic', name: 'MET Nordic', label: 'MET Nordic', color: '#a16207', descriptionKey: 'detail.modelDescription.metnoNordic', resolution: '1km', coverage: MET_NORDIC },
    ]),
  },
  {
    id: 'meteoswiss',
    name: 'MeteoSwiss',
    models: describe([
      { id: 'meteoswiss_icon_seamless', name: 'MeteoSwiss Seamless', label: 'MeteoSwiss Seamless', color: '#be123c', descriptionKey: 'detail.modelDescription.meteoswissIconSeamless', resolution: '1-2km', coverage: METEOSWISS },
      { id: 'meteoswiss_icon_ch2', name: 'ICON-CH2', label: 'MeteoSwiss ICON-CH2', color: '#e11d48', descriptionKey: 'detail.modelDescription.meteoswissIconCh2', resolution: '2km', coverage: METEOSWISS },
      { id: 'meteoswiss_icon_ch1', name: 'ICON-CH1', label: 'MeteoSwiss ICON-CH1', color: '#9f1239', descriptionKey: 'detail.modelDescription.meteoswissIconCh1', resolution: '1km', coverage: METEOSWISS },
    ]),
  },
  {
    id: 'geosphere',
    name: 'GeoSphere Austria',
    models: describe([
      { id: 'geosphere_seamless', name: 'GeoSphere Seamless', label: 'GeoSphere Seamless', color: '#f0abfc', descriptionKey: 'detail.modelDescription.geosphereSeamless', resolution: '2.5km', coverage: GEOSPHERE },
      { id: 'geosphere_arome_austria', name: 'AROME Austria', label: 'GeoSphere AROME', color: '#c026d3', descriptionKey: 'detail.modelDescription.geosphereAromeAustria', resolution: '2.5km', coverage: GEOSPHERE },
    ]),
  },
  {
    id: 'chmi',
    get name() { return translate('detail.provider.chmi'); },
    models: describe([
      { id: 'chmi_aladin_seamless', name: 'CHMI Seamless', label: 'CHMI Seamless', color: '#5eead4', descriptionKey: 'detail.modelDescription.chmiAladinSeamless', resolution: '1-2.3km', coverage: CHMI_CENTRAL_EUROPE },
      { id: 'chmi_aladin_central_europe_2km', name: 'ALADIN Central Europe', label: 'CHMI ALADIN', color: '#0f766e', descriptionKey: 'detail.modelDescription.chmiAladinCentralEurope2km', resolution: '2.3km', coverage: CHMI_CENTRAL_EUROPE },
      { id: 'chmi_aladin_cz_1km', name: 'ALADIN Czechia', label: 'CHMI ALADIN Czechia', color: '#134e4a', descriptionKey: 'detail.modelDescription.chmiAladinCz1km', resolution: '1km', coverage: CHMI_CZECHIA },
    ]),
  },
  {
    id: 'italiameteo',
    name: 'ItaliaMeteo',
    models: describe([
      { id: 'italia_meteo_arpae_icon_2i', name: 'ICON-2I', label: 'ItaliaMeteo ICON-2I', color: '#4ade80', descriptionKey: 'detail.modelDescription.italiaMeteoArpaeIcon2i', resolution: '2km', coverage: ICON_2I },
    ]),
  },
  {
    id: 'cma',
    get name() { return translate('detail.provider.cma'); },
    models: describe([
      { id: 'cma_grapes_global', name: 'GRAPES', label: 'CMA GRAPES', color: '#fde047', descriptionKey: 'detail.modelDescription.cmaGrapesGlobal', resolution: '15km', coverage: 'global' },
    ]),
  },
];

const MODEL_INFO = new Map<WeatherModel, ModelInfo>(
  modelProviders.flatMap((provider) => provider.models.map((model) => [model.id, model] as const))
);

/** Catalogue position of every model, for stable ordering and Clone tie-breaks. */
const CATALOGUE_ORDER = new Map<WeatherModel, number>(
  Array.from(MODEL_INFO.keys()).map((id, index) => [id, index])
);

export function getModelInfo(modelId: WeatherModel): ModelInfo | undefined {
  return MODEL_INFO.get(modelId);
}

export function isKnownModel(modelId: string): modelId is WeatherModel {
  return MODEL_INFO.has(modelId as WeatherModel);
}

/** The Selected models every visitor starts with (docs/adr/0005). */
export const RECOMMENDED_MODELS: WeatherModel[] = modelProviders.flatMap((provider) =>
  provider.models.filter((model) => model.recommended).map((model) => model.id)
);

/** Whether a point falls inside a model's Coverage. Unknown models never cover anything. */
export function coversPoint(modelId: WeatherModel, lat: number, lon: number): boolean {
  const coverage = MODEL_INFO.get(modelId)?.coverage;
  if (!coverage) return false;
  if (coverage === 'global') return true;
  return lat >= coverage.south && lat <= coverage.north && lon >= coverage.west && lon <= coverage.east;
}

export function hasGlobalCoverage(modelId: WeatherModel): boolean {
  return MODEL_INFO.get(modelId)?.coverage === 'global';
}

/** Sorts models into catalogue order (Provider by Provider). */
export function inCatalogueOrder(models: WeatherModel[]): WeatherModel[] {
  return [...models].sort(
    (a, b) => (CATALOGUE_ORDER.get(a) ?? Infinity) - (CATALOGUE_ORDER.get(b) ?? Infinity)
  );
}

/**
 * Build hierarchy tree for UI rendering, its names and descriptions in the current
 * language: build it again when the language changes.
 */
export function buildModelHierarchyTree(): ModelHierarchyNode[] {
  const tree: ModelHierarchyNode[] = [];

  // Add aggregations section at top
  tree.push({
    id: 'aggregations',
    name: translate('detail.aggregations'),
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
        resolution: model.resolution,
        modelId: model.id,
        ai: model.ai,
        experimental: model.experimental,
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
  return Array.from(MODEL_INFO.keys());
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
