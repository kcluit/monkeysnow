/**
 * The hourly time axis shared by every chart in the detail view, labelled in the
 * forecast's own time zone. It is built once per forecast rather than per chart,
 * because formatting dates in a time zone is slow unless the formatters are reused.
 * Its labels are written in the language showing when they're first read, once per
 * language, so a change of language relabels it without building it again.
 */

import { formatLocale } from '../locales';

export interface TimeAxis {
    /** Epoch milliseconds of each hour */
    timestamps: number[];
    /** "Wed, Oct 7" at local midnight, "5 PM" at other hours ("mer. 7 oct.", "17 h" in French) */
    labels: string[];
    /** "Wed, Oct 7, 5 PM" */
    tooltipLabels: string[];
    /** Local hour of day of each point, 0-23 */
    hours: number[];
    /** Indices of the points at local midnight */
    midnightIndices: number[];
    /** One label per local calendar day, e.g. "Oct 7, 2026" */
    days: string[];
    /** Which entry of `days` each point falls on */
    dayIndex: number[];
}

const HOUR_MS = 3_600_000;

/** Formatters whose output is read or compared, never shown, so always en-US */
interface StructureFormatters {
    /** The hour, its parts parsed as a number */
    hour: Intl.DateTimeFormat;
    /** Tells local calendar days apart */
    day: Intl.DateTimeFormat;
}

/** The labels' formatters, in one language */
interface LabelFormatters {
    hourLabel: Intl.DateTimeFormat;
    dayLabel: Intl.DateTimeFormat;
    tooltip: Intl.DateTimeFormat;
    day: Intl.DateTimeFormat;
}

type AxisLabels = Pick<TimeAxis, 'labels' | 'tooltipLabels' | 'days'>;

const structureFormatterCache = new Map<string, StructureFormatters>();
/** By locale and time zone */
const labelFormatterCache = new Map<string, LabelFormatters>();

function dayOptions(timeZone: string | undefined): Intl.DateTimeFormatOptions {
    return timeZone
        ? { timeZone, year: 'numeric', month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' };
}

function createStructureFormatters(timeZone: string | undefined): StructureFormatters {
    const zone = timeZone ? { timeZone } : {};
    return {
        hour: new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric', hourCycle: 'h23' }),
        day: new Intl.DateTimeFormat('en-US', dayOptions(timeZone)),
    };
}

function createLabelFormatters(locale: string, timeZone: string | undefined): LabelFormatters {
    const zone = timeZone ? { timeZone } : {};
    return {
        hourLabel: new Intl.DateTimeFormat(locale, { ...zone, hour: 'numeric' }),
        dayLabel: new Intl.DateTimeFormat(locale, { ...zone, weekday: 'short', month: 'short', day: 'numeric' }),
        tooltip: new Intl.DateTimeFormat(locale, { ...zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' }),
        day: new Intl.DateTimeFormat(locale, dayOptions(timeZone)),
    };
}

function cachedFormatters<T>(
    cache: Map<string, T>,
    key: string,
    timeZone: string | undefined,
    create: (timeZone: string | undefined) => T
): T {
    let formatters = cache.get(key);
    if (!formatters) {
        try {
            formatters = create(timeZone);
        } catch {
            // Unknown time zone: label in the browser's own
            formatters = create(undefined);
        }
        cache.set(key, formatters);
    }
    return formatters;
}

/** An hourly axis from `start` to `end` (epoch ms, both included). */
export function buildTimeAxis(start: number, end: number, timeZone?: string): TimeAxis {
    const f = cachedFormatters(structureFormatterCache, timeZone ?? '', timeZone, createStructureFormatters);
    const timestamps: number[] = [];
    const hours: number[] = [];
    const midnightIndices: number[] = [];
    const dayIndex: number[] = [];
    // Each local day, and its first hour on the axis, which its label is written from
    const dayKeys: string[] = [];
    const dayStarts: number[] = [];

    for (let t = start, i = 0; t <= end; t += HOUR_MS, i++) {
        const date = new Date(t);
        const hour = Number(f.hour.format(date)) % 24;
        const day = f.day.format(date);
        if (dayKeys[dayKeys.length - 1] !== day) {
            dayKeys.push(day);
            dayStarts.push(t);
        }
        if (hour === 0) midnightIndices.push(i);

        timestamps.push(t);
        hours.push(hour);
        dayIndex.push(dayKeys.length - 1);
    }

    const labelsByLocale = new Map<string, AxisLabels>();
    const labelsNow = (): AxisLabels => {
        const locale = formatLocale();
        let labels = labelsByLocale.get(locale);
        if (!labels) {
            const l = cachedFormatters(labelFormatterCache, `${locale}|${timeZone ?? ''}`, timeZone,
                (zone) => createLabelFormatters(locale, zone));
            labels = {
                labels: timestamps.map((t, i) => (hours[i] === 0 ? l.dayLabel : l.hourLabel).format(t)),
                tooltipLabels: timestamps.map((t) => l.tooltip.format(t)),
                days: dayStarts.map((t) => l.day.format(t)),
            };
            labelsByLocale.set(locale, labels);
        }
        return labels;
    };

    return {
        timestamps,
        hours,
        midnightIndices,
        dayIndex,
        get labels() { return labelsNow().labels; },
        get tooltipLabels() { return labelsNow().tooltipLabels; },
        get days() { return labelsNow().days; },
    };
}

/** Position of `timestamp` on the axis, or -1 when it falls outside. */
export function axisIndexOf(axis: TimeAxis, timestamp: number): number {
    const index = Math.round((timestamp - axis.timestamps[0]) / HOUR_MS);
    return index >= 0 && index < axis.timestamps.length ? index : -1;
}
