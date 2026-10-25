/**
 * A Graph's time axis, labelled in the point's own time zone and in the language shown:
 * the day ("Sat 17", "sam. 17") at each local midnight and clock hours in between, as
 * many as fit. It is built once per Graph and language because formatting in a time
 * zone is slow unless the formatters are reused.
 */

import { hourFormat, type DateFormat } from '../../locales';

const HOUR = 3600;
/** The closest two labels may sit, in CSS pixels */
const MIN_LABEL_SPACING = 46;
const HOUR_STEPS = [1, 2, 3, 6, 12];
const DAY_STEPS = [1, 2, 3, 7];

interface Formatters {
    hour: Intl.DateTimeFormat;
    hourLabel: DateFormat;
    weekday: Intl.DateTimeFormat;
    dayOfMonth: Intl.DateTimeFormat;
    tooltipDay: Intl.DateTimeFormat;
}

const formatterCache = new Map<string, Formatters>();

function createFormatters(timeZone: string | undefined, locale: string): Formatters {
    const zone = timeZone ? { timeZone } : {};
    return {
        // Read as a number, so always in English digits on a 24-hour clock
        hour: new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric', hourCycle: 'h23' }),
        hourLabel: hourFormat(locale, { ...zone, hour: 'numeric' }),
        weekday: new Intl.DateTimeFormat(locale, { ...zone, weekday: 'short' }),
        dayOfMonth: new Intl.DateTimeFormat(locale, { ...zone, day: 'numeric' }),
        tooltipDay: new Intl.DateTimeFormat(locale, { ...zone, weekday: 'short', month: 'short', day: 'numeric' }),
    };
}

function formattersFor(timeZone: string | undefined, locale: string): Formatters {
    const key = `${locale}|${timeZone ?? ''}`;
    let formatters = formatterCache.get(key);
    if (!formatters) {
        try {
            formatters = createFormatters(timeZone, locale);
        } catch {
            // A time zone this browser doesn't know: label in the browser's own
            formatters = createFormatters(undefined, locale);
        }
        formatterCache.set(key, formatters);
    }
    return formatters;
}

export class GraphTimeAxis {
    /** Epoch seconds of every hour on the axis */
    private times: number[] = [];
    private hours: number[] = [];
    private labels: string[] = [];
    /** Epoch seconds of each local midnight */
    readonly midnights: number[] = [];
    private formatters: Formatters;

    /**
     * Hours on the forecast's own clock (`alignedTo` is one of them) from `from` to `to`,
     * so the axis covers what every Graph on the page shows, labelled in `locale`'s way.
     */
    constructor(from: number, to: number, alignedTo: number, timeZone: string | undefined, locale: string) {
        this.formatters = formattersFor(timeZone, locale);
        const f = this.formatters;
        const first = alignedTo - Math.ceil((alignedTo - from) / HOUR) * HOUR;
        for (let t = first; t <= to; t += HOUR) {
            const date = new Date(t * 1000);
            const hour = Number(f.hour.format(date)) % 24;
            const repeated = this.hours.length > 0 && this.hours[this.hours.length - 1] === hour;
            this.times.push(t);
            // The hour repeated when clocks go back gets no tick of its own
            this.hours.push(repeated ? -1 : hour);
            if (hour === 0 && !repeated) {
                this.midnights.push(t);
                this.labels.push(`${f.weekday.format(date)} ${f.dayOfMonth.format(date)}`);
            } else {
                this.labels.push(f.hourLabel.format(date));
            }
        }
    }

    private indexOf(t: number): number {
        return Math.round((t - this.times[0]) / HOUR);
    }

    /** Ticks between `min` and `max` on a plot `width` CSS pixels wide */
    splits(min: number, max: number, width: number): number[] {
        const pxPerHour = width / Math.max(1, (max - min) / HOUR);
        const hourStep = HOUR_STEPS.find((step) => step * pxPerHour >= MIN_LABEL_SPACING);
        if (hourStep) {
            const ticks: number[] = [];
            const start = Math.max(0, this.indexOf(min));
            const end = Math.min(this.times.length - 1, this.indexOf(max));
            for (let i = start; i <= end; i++) {
                const t = this.times[i];
                if (t >= min && t <= max && this.hours[i] >= 0 && this.hours[i] % hourStep === 0) ticks.push(t);
            }
            return ticks;
        }
        // Too narrow for hours: every day, or every few, counted from the first so labels don't jump while panning
        const dayStep = DAY_STEPS.find((step) => step * 24 * pxPerHour >= MIN_LABEL_SPACING) ?? 7;
        return this.midnights.filter((t, k) => k % dayStep === 0 && t >= min && t <= max);
    }

    label(t: number): string {
        return this.labels[this.indexOf(t)] ?? '';
    }

    /** "Sat, Oct 17, 4 – 5 PM" ("sam. 17 oct., 16 – 17 h", "sáb, 17 oct, 16 – 17 h"): the hour before `t`, which its precipitation fell in */
    hourBefore(t: number): string {
        const f = this.formatters;
        const end = new Date(t * 1000);
        const start = new Date((t - HOUR) * 1000);
        // Spanish's "h" follows a no-break space (hourFormat())
        const [startHour, startPeriod] = f.hourLabel.format(start).split(/ |\u{00A0}/u);
        const endLabel = f.hourLabel.format(end);
        const sameHalf = endLabel.endsWith(startPeriod ?? '');
        return `${f.tooltipDay.format(start)}, ${sameHalf ? startHour : f.hourLabel.format(start)} – ${endLabel}`;
    }
}
