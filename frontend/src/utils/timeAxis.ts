/**
 * The hourly time axis shared by every chart in the detail view, labelled in the
 * forecast's own time zone. It is built once per forecast rather than per chart,
 * because formatting dates in a time zone is slow unless the formatters are reused.
 */

export interface TimeAxis {
    /** Epoch milliseconds of each hour */
    timestamps: number[];
    /** "Wed, Oct 7" at local midnight, "5 PM" at other hours */
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

interface Formatters {
    hour: Intl.DateTimeFormat;
    hourLabel: Intl.DateTimeFormat;
    dayLabel: Intl.DateTimeFormat;
    tooltip: Intl.DateTimeFormat;
    day: Intl.DateTimeFormat;
}

const formatterCache = new Map<string, Formatters>();

function createFormatters(timeZone: string | undefined): Formatters {
    const zone = timeZone ? { timeZone } : {};
    return {
        hour: new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric', hourCycle: 'h23' }),
        hourLabel: new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric' }),
        dayLabel: new Intl.DateTimeFormat('en-US', { ...zone, weekday: 'short', month: 'short', day: 'numeric' }),
        tooltip: new Intl.DateTimeFormat('en-US', { ...zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' }),
        day: new Intl.DateTimeFormat('en-US', timeZone
            ? { timeZone, year: 'numeric', month: 'short', day: 'numeric' }
            : { month: 'short', day: 'numeric' }),
    };
}

function formattersFor(timeZone: string | undefined): Formatters {
    const key = timeZone ?? '';
    let formatters = formatterCache.get(key);
    if (!formatters) {
        try {
            formatters = createFormatters(timeZone);
        } catch {
            // Unknown time zone: label in the browser's own
            formatters = createFormatters(undefined);
        }
        formatterCache.set(key, formatters);
    }
    return formatters;
}

/** An hourly axis from `start` to `end` (epoch ms, both included). */
export function buildTimeAxis(start: number, end: number, timeZone?: string): TimeAxis {
    const f = formattersFor(timeZone);
    const axis: TimeAxis = { timestamps: [], labels: [], tooltipLabels: [], hours: [], midnightIndices: [], days: [], dayIndex: [] };

    for (let t = start, i = 0; t <= end; t += HOUR_MS, i++) {
        const date = new Date(t);
        const hour = Number(f.hour.format(date)) % 24;
        const day = f.day.format(date);
        if (axis.days[axis.days.length - 1] !== day) axis.days.push(day);
        if (hour === 0) axis.midnightIndices.push(i);

        axis.timestamps.push(t);
        axis.hours.push(hour);
        axis.labels.push(hour === 0 ? f.dayLabel.format(date) : f.hourLabel.format(date));
        axis.tooltipLabels.push(f.tooltip.format(date));
        axis.dayIndex.push(axis.days.length - 1);
    }
    return axis;
}

/** Position of `timestamp` on the axis, or -1 when it falls outside. */
export function axisIndexOf(axis: TimeAxis, timestamp: number): number {
    const index = Math.round((timestamp - axis.timestamps[0]) / HOUR_MS);
    return index >= 0 && index < axis.timestamps.length ? index : -1;
}
