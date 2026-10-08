import type { ElevationLevel, SortOption, SortDay, TemperatureMetric } from '../types';

// Webcam URLs by Resort slug (static data, not from backend)
export const webcamUrls: Record<string, string> = {
  "apex": "https://apexresort.com/weather/?1#live-webcams",
  "mt-baldy-family": "https://baldyresort.com/baldy-mt-resort/webcams/",
  "powder-king": "https://www.powderking.com/mountain/ski-report",
  "nakiska": "https://skinakiska.com/conditions/mountain-cam/",
  "castle": "https://www.skicastle.ca/webcams/",
  "pass-powderkeg-ski": "https://www.passpowderkeg.com/home/snowcam/",
  "fairmont-hot-springs": "https://www.fairmonthotsprings.com/resort-webcams",
  "shames-mountain": "https://mymountaincoop.ca/shames-mountain/our-mountain/snow-report/#webcam",
  "manning-park": "https://manningpark.com/weather-webcams-and-trail-status/",
  "big-white": "https://www.bigwhite.com/mountain-conditions/webcams",
  "hudson-bay-mountain": "https://hudsonbaymountain.com/conditions/",
  "cypress-mountain": "https://www.cypressmountain.com/mountain-report#downhill-webcams",
  "fernie-alpine": "https://skifernie.com/conditions/snow-report/",
  "grouse-mountain": "https://www.grousemountain.com/web-cams/",
  "sasquatch": "https://sasquatchmountain.ca/weather-and-conditions/webcams/",
  "kicking-horse": "https://kickinghorseresort.com/conditions/mountain-cam/",
  "kimberley-alpine": "https://skikimberley.com/conditions/mountain-cam/",
  "mt-seymour": "https://mtseymour.ca/the-mountain/todays-conditions-hours#block-webcams",
  "mount-washington-alpine": "https://www.mountwashington.ca/the-mountain/conditions/snow-report.html#section-id-1693592933213",
  "panorama": "https://www.panoramaresort.com/panorama-today/daily-snow-report/#webcam10",
  "red": "https://www.redresort.com/report/",
  "revelstoke": "https://www.revelstokemountainresort.com/mountain/conditions/webcams/",
  "silver-star": "https://www.skisilverstar.com/the-mountain/webcams",
  "sun-peaks": "https://www.sunpeaksresort.com/ski-ride/weather-conditions-cams/webcams",
  "whistler-blackcomb": "https://whistlerpeak.com/",
  "whitewater": "https://skiwhitewater.com/webcams/",
  "lake-louise": "https://www.skilouise.com/snow-conditions/",
  "banff-sunshine-village": "https://www.skibanff.com/conditions",
  "mt-norquay": "https://banffnorquay.com/winter/conditions/",
  "marmot-basin": "https://www.skimarmot.com/mountain/weather-conditions/",
  "mt-baker": "https://www.mtbaker.us/snow-report/",
  "crystal-mountain": "https://www.crystalmountainresort.com/the-mountain/mountain-report-and-webcams/webcams",
  "stevens-pass": "https://www.stevenspass.com/the-mountain/mountain-conditions/mountain-cams.aspx"
};

// Default settings
export const defaultSelectedResorts: string[] = [];
export const defaultElevation: ElevationLevel = "bot";
export const defaultSort: SortOption = "temperature";
export const defaultSortDay: SortDay = 'next3days';
export const defaultTemperatureMetric: TemperatureMetric = "max";

/**
 * Fallback function to get display name from API ID.
 * Simply converts kebab-case to Title Case.
 *
 * Note: For proper display names, use HierarchyContext's getDisplayName() instead.
 */
export function getDisplayNameFallback(apiId: string): string {
  return apiId.replace(/-/g, ' ');
}

// ============================================================================
// DEPRECATED: These exports are kept for backward compatibility during migration.
// Components should migrate to using HierarchyContext instead.
// ============================================================================

/**
 * @deprecated Use HierarchyContext's skiResorts instead.
 * This empty array is a placeholder - the actual resort list comes from the HierarchyContext.
 */
export const skiResorts: string[] = [];

/**
 * @deprecated Use HierarchyContext's resortAliases instead.
 */
export const resortAliases: Record<string, string> = {};

/**
 * @deprecated Use HierarchyContext's getDisplayName() instead.
 */
export function getDisplayName(apiId: string): string {
  return getDisplayNameFallback(apiId);
}
