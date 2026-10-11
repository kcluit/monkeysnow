/**
 * Slope bands (see CONTEXT.md): the ranges of Slope angle that the Slope angle Terrain colouring
 * paints, each in its own colour, the same on both maps. A band runs from its `from` angle up to
 * its `to` angle, in whole degrees; the bands are kept in order and never overlap, and there is
 * always at least one. They live in this browser's localStorage only, and every change is saved
 * at once.
 */

export interface SlopeBand {
    from: number;
    to: number;
    /** #rrggbb */
    colour: string;
}

export const MAX_SLOPE_ANGLE = 90;

// Most slab avalanches start between 30 and 45 degrees
export const DEFAULT_SLOPE_BANDS: readonly SlopeBand[] = [{ from: 30, to: 45, colour: '#e51e25' }];

// Each band added takes the first of these not yet used: swisstopo's slope colours, then a blue and a green
const NEW_BAND_COLOURS: readonly string[] = ['#ffdd00', '#ff8c00', '#9433c5', '#e51e25', '#2b83ba', '#1a9850'];
const NEW_BAND_DEGREES = 5;

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

const isWholeDegree = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_SLOPE_ANGLE;

/** Stored or decoded bands, with any that aren't whole, in order and apart dropped; the default ones if none are left. */
export function sanitizeSlopeBands(value: unknown): readonly SlopeBand[] {
    if (!Array.isArray(value)) return DEFAULT_SLOPE_BANDS;
    const bands = value
        .filter((band): band is SlopeBand => {
            if (typeof band !== 'object' || band === null) return false;
            const { from, to, colour } = band as Record<string, unknown>;
            return isWholeDegree(from) && isWholeDegree(to) && from < to && typeof colour === 'string' && HEX_COLOUR.test(colour);
        })
        .map(({ from, to, colour }) => ({ from, to, colour: colour.toLowerCase() }))
        .sort((a, b) => a.from - b.from);
    // A band overlapping the one below it is dropped
    const kept: SlopeBand[] = [];
    for (const band of bands) {
        if (kept.length === 0 || band.from >= kept[kept.length - 1].to) kept.push(band);
    }
    return kept.length > 0 ? kept : DEFAULT_SLOPE_BANDS;
}

/** How the legend names a band, e.g. "30–45°", or "45°+" for one that reaches vertical */
export function slopeBandLabel(band: SlopeBand): string {
    return band.to === MAX_SLOPE_ANGLE ? `${band.from}°+` : `${band.from}–${band.to}°`;
}

/** The bands in a few characters, e.g. "30-45-e51e25", for the 3D map's tile URLs: new bands must mean new tiles */
export function slopeBandsKey(bands: readonly SlopeBand[]): string {
    return bands.map(band => `${band.from}-${band.to}-${band.colour.slice(1)}`).join(',');
}

export function slopeBandsFromKey(key: string): readonly SlopeBand[] {
    return sanitizeSlopeBands(key.split(',').map((part) => {
        const [from, to, colour] = part.split('-');
        return { from: Number(from), to: Number(to), colour: `#${colour}` };
    }));
}

// --- Editing: each returns the changed bands, still in order and apart ---

/** Band `index` starting at `from`, held above the band below it and under its own end */
export function withBandFrom(bands: readonly SlopeBand[], index: number, from: number): readonly SlopeBand[] {
    const lowest = index > 0 ? bands[index - 1].to : 0;
    const clamped = Math.min(bands[index].to - 1, Math.max(lowest, Math.round(from)));
    return bands.map((band, i) => (i === index ? { ...band, from: clamped } : band));
}

/** Band `index` ending at `to`, held above its own start and under the band above it */
export function withBandTo(bands: readonly SlopeBand[], index: number, to: number): readonly SlopeBand[] {
    const highest = index < bands.length - 1 ? bands[index + 1].from : MAX_SLOPE_ANGLE;
    const clamped = Math.max(bands[index].from + 1, Math.min(highest, Math.round(to)));
    return bands.map((band, i) => (i === index ? { ...band, to: clamped } : band));
}

export function withBandColour(bands: readonly SlopeBand[], index: number, colour: string): readonly SlopeBand[] {
    if (!HEX_COLOUR.test(colour)) return bands;
    return bands.map((band, i) => (i === index ? { ...band, colour: colour.toLowerCase() } : band));
}

/** Without band `index`, unless it is the last one: Slope angle with no bands would be the same as no Terrain colouring */
export function withoutBand(bands: readonly SlopeBand[], index: number): readonly SlopeBand[] {
    return bands.length > 1 ? bands.filter((_, i) => i !== index) : bands;
}

/**
 * The band "Add band" adds: 5° just above the steepest band, or where that one reaches vertical,
 * the top of the widest gap below a band; null when there is no room anywhere.
 */
export function newSlopeBand(bands: readonly SlopeBand[]): SlopeBand | null {
    const colour = NEW_BAND_COLOURS.find(c => !bands.some(band => band.colour === c))
        ?? NEW_BAND_COLOURS[bands.length % NEW_BAND_COLOURS.length];
    const steepest = bands[bands.length - 1];
    if (steepest.to < MAX_SLOPE_ANGLE) {
        return { from: steepest.to, to: Math.min(MAX_SLOPE_ANGLE, steepest.to + NEW_BAND_DEGREES), colour };
    }
    let gap = { from: 0, to: bands[0].from };
    for (let i = 1; i < bands.length; i++) {
        if (bands[i].from - bands[i - 1].to > gap.to - gap.from) gap = { from: bands[i - 1].to, to: bands[i].from };
    }
    if (gap.to <= gap.from) return null;
    return { from: Math.max(gap.from, gap.to - NEW_BAND_DEGREES), to: gap.to, colour };
}

export function withBand(bands: readonly SlopeBand[], added: SlopeBand): readonly SlopeBand[] {
    return [...bands, added].sort((a, b) => a.from - b.from);
}

// --- Storage ---

const STORAGE_KEY = 'slopeBands';

function read(): readonly SlopeBand[] {
    try {
        return sanitizeSlopeBands(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
    } catch {
        return DEFAULT_SLOPE_BANDS;
    }
}

// Read on first use rather than on import, so main.tsx's one-off reset of stored data runs first
let slopeBands: readonly SlopeBand[] | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// Another tab changed them
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        slopeBands = read();
        notify();
    }
});

export function getSlopeBands(): readonly SlopeBand[] {
    slopeBands ??= read();
    return slopeBands;
}

export function setSlopeBands(next: readonly SlopeBand[]): void {
    slopeBands = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable (private mode, full): kept for this visit only
    }
    notify();
}

export function subscribeSlopeBands(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
