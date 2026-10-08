/**
 * Resorts bundled with the app.
 *
 * resorts/resorts.json is generated from OpenSkiData by scripts/import-resorts.mjs
 * (see resorts/README.md). This module indexes it for lookups, resolves earlier
 * slugs and pre-OpenSkiData IDs to current ones, and reshapes it into the
 * Continent -> Country -> Region hierarchy the resort picker renders.
 */

import resortData from './resorts/resorts.json';

export interface ResortLocation {
    displayName: string;
    /** The Resort's other names, often in the local script; searchable but not shown. */
    aka?: string[];
    bot: number;
    mid: number;
    top: number;
    loc: [number, number]; // [lat, lon]
    country: string; // ISO 3166-1 alpha-2, e.g. "CA"
    continent: string;
    region?: string;
}

export interface ResortInfo {
    id: string;
    displayName: string;
    aka?: string[];
}

/** A Region, or for a country too small to split, one implicit group named after the country. */
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

interface RawResort {
    name: string;
    aka?: string[];
    country: string;
    region?: string;
    loc: number[];
    bot: number;
    mid: number;
    top: number;
}

interface RawCountry {
    name: string;
    continent: string;
    regions: boolean;
}

const rawCountries = resortData.countries as unknown as Record<string, RawCountry>;
const rawResorts = resortData.resorts as unknown as Record<string, RawResort>;

const CONTINENT_ORDER = ['North America', 'Europe', 'Asia', 'Oceania', 'South America', 'Africa'];

/** Attribution OpenSkiData's licence (ODbL) requires wherever Resort data is shown. */
export const RESORT_DATA_ATTRIBUTION: string = resortData.attribution;

/**
 * Converts a name to a URL-friendly slug ID.
 * E.g., "British Columbia" -> "british-columbia"
 */
function toSlugId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

function buildLocationMap(): Map<string, ResortLocation> {
    const map = new Map<string, ResortLocation>();
    for (const [id, r] of Object.entries(rawResorts)) {
        map.set(id, {
            displayName: r.name,
            ...(r.aka ? { aka: r.aka } : {}),
            bot: r.bot,
            mid: r.mid,
            top: r.top,
            loc: [r.loc[0], r.loc[1]],
            country: r.country,
            continent: rawCountries[r.country].continent,
            ...(r.region ? { region: r.region } : {}),
        });
    }
    return map;
}

function buildHierarchy(): ContinentData[] {
    const continents = new Map<string, ContinentData>();
    const countries = new Map<string, CountryData>();
    const provinces = new Map<string, ProvinceData>();

    for (const [id, r] of Object.entries(rawResorts)) {
        const country = rawCountries[r.country];

        let continent = continents.get(country.continent);
        if (!continent) {
            continent = { id: toSlugId(country.continent), name: country.continent, countries: [] };
            continents.set(country.continent, continent);
        }

        let countryNode = countries.get(r.country);
        if (!countryNode) {
            countryNode = { id: toSlugId(country.name), name: country.name, provinces: [] };
            countries.set(r.country, countryNode);
            continent.countries.push(countryNode);
        }

        // Small countries get one implicit group named after the country
        const provinceName = country.regions ? r.region ?? 'Other' : country.name;
        const provinceKey = `${r.country}|${provinceName}`;
        let province = provinces.get(provinceKey);
        if (!province) {
            const provinceId = country.regions ? `${countryNode.id}-${toSlugId(provinceName)}` : countryNode.id;
            province = { id: provinceId, name: provinceName, resorts: [] };
            provinces.set(provinceKey, province);
            countryNode.provinces.push(province);
        }

        province.resorts.push({ id, displayName: r.name, ...(r.aka ? { aka: r.aka } : {}) });
    }

    const hierarchy = [...continents.values()].sort(
        (a, b) => CONTINENT_ORDER.indexOf(a.name) - CONTINENT_ORDER.indexOf(b.name)
    );
    for (const continent of hierarchy) {
        continent.countries.sort(byName);
        for (const country of continent.countries) {
            country.provinces.sort(byName);
            for (const province of country.provinces) {
                province.resorts.sort((a, b) => a.displayName.localeCompare(b.displayName));
            }
        }
    }
    return hierarchy;
}

export const RESORT_LOCATIONS: ReadonlyMap<string, ResortLocation> = buildLocationMap();

export const RESORT_HIERARCHY: ContinentData[] = buildHierarchy();

/** The continent a country's Resorts are grouped under, or null for a country with no Resorts. */
export function continentOfCountry(country: string): string | null {
    return rawCountries[country]?.continent ?? null;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle (haversine) distance. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** The slug of the Resort nearest to a point. */
export function nearestResortId(lat: number, lon: number): string {
    let nearest = '';
    let nearestKm = Infinity;
    for (const [id, { loc }] of RESORT_LOCATIONS) {
        const km = distanceKm(lat, lon, loc[0], loc[1]);
        if (km < nearestKm) {
            nearest = id;
            nearestKm = km;
        }
    }
    return nearest;
}

// Earlier slugs and pre-OpenSkiData IDs (e.g. "Big-White", "Big Sky") that still resolve
const normalizeId = (id: string) => id.trim().toLowerCase().replace(/\s+/g, '-');
const ALIASES = new Map(Object.entries(resortData.aliases as unknown as Record<string, string>));
const NORMALIZED_ALIASES = new Map([...ALIASES].map(([alias, slug]) => [normalizeId(alias), slug]));

/**
 * The current slug for a Resort ID, an earlier slug or a pre-OpenSkiData ID,
 * or null if it names no Resort. Exact matches win over case-insensitive ones,
 * so an old ID never resolves to a different Resort that now has its lowercase form.
 */
export function resolveResortId(id: string): string | null {
    if (RESORT_LOCATIONS.has(id)) return id;
    const alias = ALIASES.get(id);
    if (alias) return alias;
    const normalized = normalizeId(id);
    if (RESORT_LOCATIONS.has(normalized)) return normalized;
    return NORMALIZED_ALIASES.get(normalized) ?? null;
}
