/**
 * Resort locations bundled with the app.
 *
 * locations.json nests resorts as Continent -> Country -> [Province] -> Resort.
 * Some countries (most of Europe) skip the province level. This module flattens
 * it for lookups and reshapes it into the hierarchy the resort picker renders.
 */

import locationsData from './locations.json';

export interface ResortLocation {
    displayName: string;
    bot: number;
    mid: number;
    top: number;
    loc: [number, number]; // [lat, lon]
    country: string;
}

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

type RawResort = Omit<ResortLocation, 'country'>;
type RawCountry = Record<string, RawResort | Record<string, RawResort>>;
type RawLocations = Record<string, Record<string, RawCountry>>;

const rawLocations = locationsData as unknown as RawLocations;

function isResort(value: unknown): value is RawResort {
    return Boolean(value) && typeof value === 'object' && (value as RawResort).bot !== undefined;
}

/**
 * Converts a name to a URL-friendly slug ID.
 * E.g., "British Columbia" -> "british-columbia"
 */
function toSlugId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function buildLocationMap(): Map<string, ResortLocation> {
    const map = new Map<string, ResortLocation>();

    for (const continentData of Object.values(rawLocations)) {
        for (const [countryName, countryData] of Object.entries(continentData)) {
            for (const [key, value] of Object.entries(countryData)) {
                if (isResort(value)) {
                    map.set(key, { ...value, country: countryName });
                } else if (value && typeof value === 'object') {
                    for (const [resortId, resortData] of Object.entries(value)) {
                        if (isResort(resortData)) {
                            map.set(resortId, { ...resortData, country: countryName });
                        }
                    }
                }
            }
        }
    }

    return map;
}

function buildHierarchy(): ContinentData[] {
    const hierarchy: ContinentData[] = [];

    for (const [continentName, continentData] of Object.entries(rawLocations)) {
        const continent: ContinentData = { id: toSlugId(continentName), name: continentName, countries: [] };

        for (const [countryName, countryData] of Object.entries(continentData)) {
            const country: CountryData = { id: toSlugId(countryName), name: countryName, provinces: [] };

            for (const [key, value] of Object.entries(countryData)) {
                if (isResort(value)) {
                    // 3-level: resort sits directly under the country, so give it an implicit province
                    let province = country.provinces.find(p => p.id === toSlugId(countryName));
                    if (!province) {
                        province = { id: toSlugId(countryName), name: countryName, resorts: [] };
                        country.provinces.push(province);
                    }
                    province.resorts.push({ id: key, displayName: value.displayName || key.replace(/-/g, ' ') });
                } else if (value && typeof value === 'object') {
                    // 4-level: entry is a province containing resorts
                    const province: ProvinceData = { id: toSlugId(key), name: key, resorts: [] };
                    for (const [resortId, resortData] of Object.entries(value)) {
                        if (isResort(resortData)) {
                            province.resorts.push({
                                id: resortId,
                                displayName: resortData.displayName || resortId.replace(/-/g, ' '),
                            });
                        }
                    }
                    if (province.resorts.length > 0) {
                        country.provinces.push(province);
                    }
                }
            }

            if (country.provinces.length > 0) {
                continent.countries.push(country);
            }
        }

        if (continent.countries.length > 0) {
            hierarchy.push(continent);
        }
    }

    return hierarchy;
}

export const RESORT_LOCATIONS: ReadonlyMap<string, ResortLocation> = buildLocationMap();

export const RESORT_HIERARCHY: ContinentData[] = buildHierarchy();
