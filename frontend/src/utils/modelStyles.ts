/**
 * Model styles (see CONTEXT.md): the colour, boldness and opacity a visitor has chosen
 * for each Forecast model's and Aggregation's line, the same on every chart in the
 * detail view. They live in this browser's localStorage only, together with the other
 * choices made in the Models tab of a chart's gear modal: the Spread fills, and hiding
 * the model lines behind the Aggregations.
 */

import { aggregationOptions, getModelInfo, isKnownModel } from '../data/modelHierarchy';
import type { AggregationType, WeatherModel } from '../types/openMeteo';
import { createOpenerRegistry } from './openerRegistry';

/** What a visitor changed about one line; anything left out is drawn as it was before. */
export interface LineStyle {
    color?: string;
    bold?: boolean;
    /** 0.05 to 1. Left out, a model is on Auto and an Aggregation is fully opaque */
    opacity?: number;
}

export interface ModelStyles {
    models: Partial<Record<WeatherModel, LineStyle>>;
    aggregations: Partial<Record<AggregationType, LineStyle>>;
    /** While Aggregations are drawn, leave out the model lines behind them */
    hideModelLines: boolean;
    /** Shade between the Min and Max lines */
    showMinMaxFill: boolean;
    /** Shade between the 25th and 75th percentile lines */
    showPercentileFill: boolean;
}

export const DEFAULT_MODEL_STYLES: ModelStyles = {
    models: {},
    aggregations: {},
    hideModelLines: false,
    showMinMaxFill: false,
    showPercentileFill: false,
};

/** The opacities a line can be given; a model can also be left on Auto. */
export const OPACITY_CHOICES: readonly number[] = [0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1];

/** Swatches offered for a line's colour, besides its original colour and a custom one. */
export const COLOR_PRESETS: readonly string[] = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#78716c', '#71717a', '#64748b',
];

export function originalModelColor(model: WeatherModel): string {
    return getModelInfo(model)?.color ?? '#6b7280';
}

export function originalAggregationColor(aggregation: AggregationType): string {
    return aggregationOptions.find((a) => a.id === aggregation)?.defaultColor ?? '#8b5cf6';
}

export function modelColor(styles: ModelStyles, model: WeatherModel): string {
    return styles.models[model]?.color ?? originalModelColor(model);
}

export function aggregationColor(styles: ModelStyles, aggregation: AggregationType): string {
    return styles.aggregations[aggregation]?.color ?? originalAggregationColor(aggregation);
}

// --- Storage ---

const STORAGE_KEY = 'modelStyles';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const isAggregationType = (key: string): key is AggregationType =>
    aggregationOptions.some((a) => a.id === key);

function readLineStyle(value: unknown): LineStyle | null {
    if (typeof value !== 'object' || value === null) return null;
    const { color, bold, opacity } = value as Record<string, unknown>;
    const style: LineStyle = {};
    if (typeof color === 'string' && HEX_COLOR.test(color)) style.color = color.toLowerCase();
    if (bold === true) style.bold = true;
    if (typeof opacity === 'number' && opacity > 0 && opacity <= 1) style.opacity = opacity;
    return Object.keys(style).length > 0 ? style : null;
}

function readLineStyles<K extends string>(value: unknown, isKey: (key: string) => key is K): Partial<Record<K, LineStyle>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    const styles: Partial<Record<K, LineStyle>> = {};
    for (const [key, raw] of Object.entries(value)) {
        const style = readLineStyle(raw);
        // A model since dropped from the catalogue is forgotten
        if (style && isKey(key)) styles[key] = style;
    }
    return styles;
}

function readJson(key: string): unknown {
    try {
        return JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
        return null;
    }
}

// Before Model styles, Aggregation colours and the three toggles had keys of their own.
// One opacity applied to every model, but only while Aggregations were drawn; a model's
// own opacity applies always, so that one is dropped rather than carried over.
const LEGACY_KEYS = {
    aggregationColors: 'detailAggregationColors',
    hideModelLines: 'detailHideAggregationMembers',
    showMinMaxFill: 'detailShowMinMaxFill',
    showPercentileFill: 'detailShowPercentileFill',
    modelLineOpacity: 'modelLineOpacity',
};

function migrateLegacySettings(): ModelStyles {
    const aggregations: ModelStyles['aggregations'] = {};
    const colors = readJson(LEGACY_KEYS.aggregationColors);
    if (typeof colors === 'object' && colors !== null) {
        for (const { id, defaultColor } of aggregationOptions) {
            const color = (colors as Record<string, unknown>)[id];
            if (typeof color === 'string' && HEX_COLOR.test(color) && color.toLowerCase() !== defaultColor) {
                aggregations[id] = { color: color.toLowerCase() };
            }
        }
    }
    const migrated: ModelStyles = {
        models: {},
        aggregations,
        hideModelLines: readJson(LEGACY_KEYS.hideModelLines) === true,
        showMinMaxFill: readJson(LEGACY_KEYS.showMinMaxFill) === true,
        showPercentileFill: readJson(LEGACY_KEYS.showPercentileFill) === true,
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        Object.values(LEGACY_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch {
        // Storage unavailable: migrated again next visit
    }
    return migrated;
}

function read(): ModelStyles {
    let stored: string | null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch {
        return DEFAULT_MODEL_STYLES;
    }
    if (stored === null) return migrateLegacySettings();

    const parsed = readJson(STORAGE_KEY);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_MODEL_STYLES;
    const value = parsed as Record<string, unknown>;
    return {
        models: readLineStyles(value.models, isKnownModel),
        aggregations: readLineStyles(value.aggregations, isAggregationType),
        hideModelLines: value.hideModelLines === true,
        showMinMaxFill: value.showMinMaxFill === true,
        showPercentileFill: value.showPercentileFill === true,
    };
}

// Read on first use rather than on import, so main.tsx's one-off reset of stored data runs first
let modelStyles: ModelStyles | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// Another tab changed them
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        modelStyles = read();
        notify();
    }
});

export function getModelStyles(): ModelStyles {
    modelStyles ??= read();
    return modelStyles;
}

export function setModelStyles(next: ModelStyles): void {
    modelStyles = next;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage unavailable (private mode, full): kept for this visit only
    }
    notify();
}

export function subscribeModelStyles(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// --- Opening the Models tab ---

const openers = createOpenerRegistry();

/**
 * Offers a way to open the Models tab while the caller is mounted; the latest one offered
 * is used. The detail view opens its first chart's gear modal on it, and App opens it on
 * its own wherever there is no chart.
 */
export const registerModelStylesOpener = openers.register;

/** Opens the Models tab, from the command palette, the Settings page or the model picker. */
export const openModelStyles = openers.open;
