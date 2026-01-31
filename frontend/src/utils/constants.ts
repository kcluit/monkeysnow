import type { ElevationLevel, SortOption, SortDay, TemperatureMetric } from '../types';

// Webcam URLs (static data, not from backend)
export const webcamUrls: Record<string, string> = {
  "Apex Mountain": "https://apexresort.com/weather/?1#live-webcams",
  "Mt Baldy": "https://baldyresort.com/baldy-mt-resort/webcams/",
  "Powder King": "https://www.powderking.com/mountain/ski-report",
  "Nakiska": "https://skinakiska.com/conditions/mountain-cam/",
  "Castle Mountain": "https://www.skicastle.ca/webcams/",
  "Pass Powderkeg": "https://www.passpowderkeg.com/home/snowcam/",
  "Fairmont Hot Springs": "https://www.fairmonthotsprings.com/resort-webcams",
  "Shames Mountain": "https://mymountaincoop.ca/shames-mountain/our-mountain/snow-report/#webcam",
  "Manning Park": "https://manningpark.com/weather-webcams-and-trail-status/",
  "Big White": "https://www.bigwhite.com/mountain-conditions/webcams",
  "Hudson Bay Mountain": "https://hudsonbaymountain.com/conditions/",
  "Cypress Mountain": "https://www.cypressmountain.com/mountain-report#downhill-webcams",
  "Fernie Alpine": "https://skifernie.com/conditions/snow-report/",
  "Grouse Mountain": "https://www.grousemountain.com/web-cams/",
  "Sasquatch Mountain" : "https://sasquatchmountain.ca/weather-and-conditions/webcams/",
  "Kicking Horse": "https://kickinghorseresort.com/conditions/mountain-cam/",
  "Kimberley Alpine": "https://skikimberley.com/conditions/mountain-cam/",
  "Mount Seymour": "https://mtseymour.ca/the-mountain/todays-conditions-hours#block-webcams",
  "Mount Washington": "https://www.mountwashington.ca/the-mountain/conditions/snow-report.html#section-id-1693592933213",
  "Panorama Mountain": "https://www.panoramaresort.com/panorama-today/daily-snow-report/#webcam10",
  "Red Mountain": "https://www.redresort.com/report/",
  "Revelstoke Mountain": "https://www.revelstokemountainresort.com/mountain/conditions/webcams/",
  "SilverStar Mountain": "https://www.skisilverstar.com/the-mountain/webcams",
  "Sun Peaks": "https://www.sunpeaksresort.com/ski-ride/weather-conditions-cams/webcams",
  "Whistler Blackcomb": "https://whistlerpeak.com/",
  "Whitewater": "https://skiwhitewater.com/webcams/",
  "Lake Louise": "https://www.skilouise.com/snow-conditions/",
  "Sunshine Village": "https://www.skibanff.com/conditions",
  "Mt Norquay": "https://banffnorquay.com/winter/conditions/",
  "Marmot Basin": "https://www.skimarmot.com/mountain/weather-conditions/",
  "Mt Baker": "https://www.mtbaker.us/snow-report/",
  "Crystal Mountain WA": "https://www.crystalmountainresort.com/the-mountain/mountain-report-and-webcams/webcams",
  "Stevens Pass": "https://www.stevenspass.com/the-mountain/mountain-conditions/mountain-cams.aspx"
};

// Default settings
export const defaultSelectedResorts: string[] = ["Cypress-Mountain", "Mount-Seymour", "Grouse-Mountain"];
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
 * This empty array is a placeholder - the actual resort list comes from the backend.
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
