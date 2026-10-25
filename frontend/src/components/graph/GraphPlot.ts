/**
 * One Graph's uPlot chart: precipitation bars in their Snow quality colours on the left
 * axis, the temperature on the right, and the Freezing level, which has no axis of its
 * own, read against dashed lines at the heights being forecast. Night is shaded, local
 * midnights and the current hour are marked, and it zooms, pans and is pointed at
 * together with every other Graph on the page through a GraphSync. Its words are in the
 * language of its `t`, so a change of language builds it again.
 */

import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { createTouchPlugin, createZoomPlugin, type XRange } from '../../lib/charts/plugins';
import { chartTextFill } from '../../lib/charts/theme';
import { colorWithOpacity } from '../../lib/charts/utils/colorUtils';
import type { ChartTheme } from '../../lib/charts';
import { formatDecimal } from '../../locales';
import { SNOW_QUALITIES } from '../../utils/snowQuality';
import { SNOW_QUALITY_COLOURS, SNOW_QUALITY_NAMES } from '../../utils/snowQualityColours';
import { getWeatherDescription, getWeatherEmoji } from '../../utils/weather';
import { precipitationFloor, type CompassPoint, type GraphData } from './graphData';
import type { GraphTimeAxis } from './graphTimeAxis';
import type { GraphSync, SyncedGraph } from './graphSync';
import type { ElevationLevel, UnitSystem } from '../../types';
import type { Translate, TranslationKey } from '../../types/i18n';

export const TEMPERATURE_COLOUR = '#f2643a';
/** Of the theme's secondary text colour, which night is shaded in */
export const NIGHT_OPACITY = 0.12;

const FONT = '11px system-ui, -apple-system, sans-serif';
/** Of the labels on the heights being forecast, in CSS pixels */
const LABEL_SIZE = 10;
const X_AXIS_SIZE = 26;
const PADDING_TOP = 8;

export interface GraphPlotOptions {
    data: GraphData;
    axis: GraphTimeAxis;
    /** Each night as [sunset, sunrise], epoch seconds */
    nights: [number, number][];
    theme: ChartTheme;
    units: UnitSystem;
    width: number;
    /** Of the plot alone, without the time axis */
    plotHeight: number;
    sync: GraphSync;
    /** The language shown's t(), which the labels and the tooltip are written with */
    t: Translate;
}

const BAND_NAMES: Record<ElevationLevel, TranslationKey> = { bot: 'band.base', mid: 'band.mid', top: 'band.top' };

const WIND_FROM: Record<CompassPoint, TranslationKey> = {
    n: 'graph.windFrom.n', ne: 'graph.windFrom.ne', e: 'graph.windFrom.e', se: 'graph.windFrom.se',
    s: 'graph.windFrom.s', sw: 'graph.windFrom.sw', w: 'graph.windFrom.w', nw: 'graph.windFrom.nw',
};

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class GraphPlot implements SyncedGraph {
    private readonly u: uPlot;
    private readonly options: GraphPlotOptions;
    private tooltip!: HTMLDivElement;
    private hairline!: HTMLDivElement;

    constructor(container: HTMLElement, options: GraphPlotOptions) {
        this.options = options;
        const { data, sync, width, plotHeight } = options;
        const chartData: uPlot.AlignedData = [data.times, ...data.bars, data.temperature, data.freezingLevel];
        this.u = new uPlot(this.buildOptions(width, plotHeight), chartData, container);
        this.u.setScale('x', sync.window);
        sync.add(this);
        this.showHairline(sync.hairline);
    }

    destroy(): void {
        this.options.sync.remove(this);
        this.u.destroy();
    }

    setWidth(width: number): void {
        if (width > 0 && width !== this.u.width) this.u.setSize({ width, height: this.u.height });
    }

    showWindow(range: XRange): void {
        if (this.u.scales.x.min === range.min && this.u.scales.x.max === range.max) return;
        this.u.setScale('x', range);
    }

    showHairline(moment: number | null): void {
        // uPlot draws once while it is being built, before either exists
        if (!this.hairline || !this.u) return;
        const left = moment === null ? -1 : this.u.valToPos(moment, 'x');
        const shown = left >= 0 && left <= this.u.over.clientWidth;
        this.hairline.style.display = shown ? 'block' : 'none';
        if (shown) this.hairline.style.left = `${left}px`;
    }

    private buildOptions(width: number, plotHeight: number): uPlot.Options {
        const { data, axis, theme, units, t } = this.options;
        const labelFill: uPlot.Axis.Stroke = (u) => chartTextFill(u.ctx, theme, theme.textSecondary);
        const floor = precipitationFloor(units);
        const heights = data.heightLines.map((line) => line.height);

        const bars = uPlot.paths.bars!({ size: [0.85, Infinity], align: -1 });
        const series: uPlot.Series[] = [
            {},
            ...SNOW_QUALITIES.map((quality): uPlot.Series => ({
                label: SNOW_QUALITY_NAMES[quality],
                scale: 'precipitation',
                fill: SNOW_QUALITY_COLOURS[quality],
                stroke: SNOW_QUALITY_COLOURS[quality],
                width: 0,
                paths: bars,
                points: { show: false },
            })),
            { label: t('graph.temperature'), scale: 'temperature', stroke: TEMPERATURE_COLOUR, width: 2, points: { show: false } },
            { label: t('graph.freezingLevel'), scale: 'freezingLevel', stroke: theme.textSecondary, width: 1.25, points: { show: false } },
        ];

        return {
            width,
            height: plotHeight + X_AXIS_SIZE + PADDING_TOP,
            padding: [PADDING_TOP, 4, 0, 4],
            series,
            legend: { show: false },
            scales: {
                x: { time: false, range: (_u, min, max) => [min, max] },
                precipitation: { range: (_u, _min, max) => [0, Math.max(floor, max ?? 0) * 1.08] },
                temperature: {
                    range: (_u, min, max) => {
                        if (min === null || max === null) return [-5, 5];
                        const pad = Math.max(1, (max - min) * 0.15);
                        return [min - pad, max + pad];
                    },
                },
                freezingLevel: {
                    range: (_u, min, max) => {
                        const low = Math.min(min ?? Infinity, ...heights);
                        const high = Math.max(max ?? -Infinity, ...heights);
                        const pad = Math.max(units === 'imperial' ? 150 : 50, (high - low) * 0.12);
                        return [low - pad, high + pad];
                    },
                },
            },
            axes: [
                {
                    scale: 'x',
                    stroke: labelFill,
                    font: FONT,
                    size: X_AXIS_SIZE,
                    gap: 4,
                    grid: { show: true, stroke: theme.gridColor, width: 1 },
                    ticks: { show: true, stroke: theme.gridColor, size: 4 },
                    splits: (u, _axisIdx, min, max) => axis.splits(min, max, u.over.clientWidth || u.width),
                    values: (_u, splits) => splits.map((t) => axis.label(t)),
                },
                {
                    scale: 'precipitation',
                    stroke: labelFill,
                    font: FONT,
                    size: 34,
                    gap: 4,
                    grid: { show: true, stroke: theme.gridColor, width: 1 },
                    ticks: { show: false },
                    values: (_u, values) => values.map((v) => (Number.isInteger(v) ? String(v) : formatDecimal(v, 1))),
                },
                {
                    scale: 'temperature',
                    side: 1,
                    stroke: TEMPERATURE_COLOUR,
                    font: FONT,
                    size: 38,
                    gap: 4,
                    grid: { show: false },
                    ticks: { show: false },
                    values: (_u, values) => values.map((v) => `${Math.round(v)}°`),
                },
            ],
            cursor: {
                y: false,
                points: { show: false },
                drag: { x: false, y: false, setScale: false },
                // A bar stands over the hour before its time, so the hour pointed at is the next one
                dataIdx: (_u, _seriesIdx, closestIdx, xValue) => {
                    const { times } = data;
                    if (times.length < 2) return closestIdx;
                    const index = Math.ceil((xValue - times[0]) / (times[1] - times[0]));
                    return Math.max(0, Math.min(times.length - 1, index));
                },
            },
            plugins: [
                createZoomPlugin({
                    wheel: 'smooth',
                    limits: () => this.options.sync.bounds,
                    home: () => this.options.sync.home,
                    onZoom: (min, max) => this.options.sync.setWindow({ min, max }, this),
                }),
                createTouchPlugin({
                    limits: () => this.options.sync.bounds,
                    onZoom: (min, max) => this.options.sync.setWindow({ min, max }, this),
                }),
                this.marksPlugin(),
            ],
        };
    }

    /** Night, midnights, the heights being forecast, 0 °C, the current hour, the tooltip and the hairline */
    private marksPlugin(): uPlot.Plugin {
        const { data, axis, nights, theme, units, t } = this.options;
        // Darker on light themes and lighter on dark ones, so it shows on every theme
        const nightFill = colorWithOpacity(theme.textSecondary, NIGHT_OPACITY);
        // "Base 1500 m", or a Saved location's height alone
        const unit = units === 'imperial' ? 'ft' : 'm';
        const heightLines = data.heightLines.map((line) => ({
            ...line,
            label: `${line.band ? `${t(BAND_NAMES[line.band])} ` : ''}${line.height} ${unit}`,
        }));

        const verticalLine = (u: uPlot, t: number, stroke: string, width: number) => {
            const x = Math.round(u.valToPos(t, 'x', true)) + 0.5;
            const { top, height } = u.bbox;
            u.ctx.strokeStyle = stroke;
            u.ctx.lineWidth = width * uPlot.pxRatio;
            u.ctx.beginPath();
            u.ctx.moveTo(x, top);
            u.ctx.lineTo(x, top + height);
            u.ctx.stroke();
        };

        const inView = (u: uPlot, t: number) => t >= u.scales.x.min! && t <= u.scales.x.max!;
        const heightLineY = (u: uPlot, height: number) => Math.round(u.valToPos(height, 'freezingLevel', true)) + 0.5;

        return {
            hooks: {
                ready: [
                    (u) => {
                        this.tooltip = document.createElement('div');
                        this.tooltip.className = 'graph-tooltip';
                        Object.assign(this.tooltip.style, {
                            position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: '100',
                            background: theme.tooltipBg, color: theme.textPrimary, border: `1px solid ${theme.tooltipBorder}`,
                            padding: '4px 8px', fontSize: '12px', lineHeight: '1.45', borderRadius: '4px', whiteSpace: 'nowrap',
                        });
                        this.hairline = document.createElement('div');
                        this.hairline.className = 'graph-hairline';
                        Object.assign(this.hairline.style, {
                            position: 'absolute', top: '0', bottom: '0', width: '0', display: 'none', pointerEvents: 'none',
                            borderLeft: `1px dashed ${theme.textSecondary}`,
                        });
                        u.over.append(this.hairline, this.tooltip);
                    },
                ],
                drawClear: [
                    (u) => {
                        const { ctx, bbox } = u;
                        ctx.save();
                        ctx.fillStyle = nightFill;
                        for (const [sunset, sunrise] of nights) {
                            if (sunrise < u.scales.x.min! || sunset > u.scales.x.max!) continue;
                            const left = Math.max(bbox.left, u.valToPos(sunset, 'x', true));
                            const right = Math.min(bbox.left + bbox.width, u.valToPos(sunrise, 'x', true));
                            if (right > left) ctx.fillRect(left, bbox.top, right - left, bbox.height);
                        }
                        ctx.restore();
                    },
                ],
                drawAxes: [
                    (u) => {
                        const { ctx, bbox } = u;
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
                        ctx.clip();

                        // A separator at each local midnight
                        for (const midnight of axis.midnights) {
                            if (inView(u, midnight)) verticalLine(u, midnight, colorWithOpacity(theme.textSecondary, 0.45), 1);
                        }

                        // A faint 0 °C line, only where the temperatures cross it
                        const temperatures = u.scales.temperature;
                        if (temperatures.min! < 0 && temperatures.max! > 0) {
                            const y = Math.round(u.valToPos(0, 'temperature', true)) + 0.5;
                            ctx.strokeStyle = colorWithOpacity(TEMPERATURE_COLOUR, 0.35);
                            ctx.lineWidth = uPlot.pxRatio;
                            ctx.beginPath();
                            ctx.moveTo(bbox.left, y);
                            ctx.lineTo(bbox.left + bbox.width, y);
                            ctx.stroke();
                        }

                        // The heights being forecast, for reading the Freezing level against
                        ctx.setLineDash([4 * uPlot.pxRatio, 4 * uPlot.pxRatio]);
                        for (const line of data.heightLines) {
                            const y = heightLineY(u, line.height);
                            ctx.strokeStyle = colorWithOpacity(theme.textSecondary, line.picked ? 0.85 : 0.45);
                            ctx.lineWidth = (line.picked ? 1.5 : 1) * uPlot.pxRatio;
                            ctx.beginPath();
                            ctx.moveTo(bbox.left, y);
                            ctx.lineTo(bbox.left + bbox.width, y);
                            ctx.stroke();
                        }
                        ctx.restore();
                    },
                ],
                draw: [
                    (u) => {
                        const { ctx, bbox } = u;
                        const px = uPlot.pxRatio;
                        ctx.save();

                        // The heights' labels go over the bars, on a halo so they read; ones too
                        // close together to stack sit side by side instead
                        ctx.textBaseline = 'bottom';
                        ctx.lineJoin = 'round';
                        ctx.lineWidth = 3 * px;
                        ctx.strokeStyle = theme.tooltipBg;
                        let previous: { y: number; right: number } | null = null;
                        const fromBottom = [...heightLines].sort((a, b) => a.height - b.height);
                        for (const line of fromBottom) {
                            const y = heightLineY(u, line.height) - 2 * px;
                            ctx.font = `${line.picked ? 'bold ' : ''}${LABEL_SIZE * px}px system-ui, -apple-system, sans-serif`;
                            const x: number = previous && previous.y - y < (LABEL_SIZE + 2) * px ? previous.right + 8 * px : bbox.left + 4 * px;
                            ctx.strokeText(line.label, x, y);
                            ctx.fillStyle = chartTextFill(ctx, theme, theme.textSecondary);
                            ctx.fillText(line.label, x, y);
                            previous = { y, right: x + ctx.measureText(line.label).width };
                        }

                        const now = Date.now() / 1000;
                        if (inView(u, now)) verticalLine(u, now, theme.accent, 1.5);
                        ctx.restore();
                    },
                ],
                setScale: [
                    (_u, key) => {
                        if (key === 'x' && this.options.sync.hairline !== null) this.showHairline(this.options.sync.hairline);
                    },
                ],
                setCursor: [
                    (u) => {
                        if (!this.tooltip) return;
                        const { left, top, idx } = u.cursor;
                        if (left === undefined || left < 0 || idx === null || idx === undefined) {
                            this.tooltip.style.display = 'none';
                            this.options.sync.setHairline(null, this);
                            return;
                        }
                        this.hairline.style.display = 'none';
                        this.showTooltip(idx, left, top ?? 0);
                        this.options.sync.setHairline(u.posToVal(left, 'x'), this);
                    },
                ],
            },
        };
    }

    private showTooltip(idx: number, left: number, top: number): void {
        const { data, axis, units, t } = this.options;
        const imperial = units === 'imperial';
        const quality = data.qualities[idx];
        const amount = data.amounts[idx];

        let precipitation = escapeHtml(t('graph.noPrecipitation'));
        if (quality) {
            const unit = data.isSnow[idx] ? (imperial ? 'in' : 'cm') : imperial ? 'in' : 'mm';
            const digits = imperial && !data.isSnow[idx] ? 2 : 1;
            const words = t('graph.precipitationAmount', { amount: formatDecimal(amount, digits), unit, quality: SNOW_QUALITY_NAMES[quality] });
            precipitation = `<span style="color:${SNOW_QUALITY_COLOURS[quality]}">■</span> ${escapeHtml(words)}`;
        }
        const temperature = data.temperature[idx];
        const freezing = data.freezingLevel[idx];
        const weather = data.weather[idx];
        const windSpeed = data.windSpeed[idx];
        const windFrom = data.windFrom[idx];
        const rows = [
            `<strong>${escapeHtml(axis.hourBefore(data.times[idx]))}</strong>`,
            weather === null ? '' : `${getWeatherEmoji(weather)} ${escapeHtml(getWeatherDescription(weather))}`,
            precipitation,
            temperature === null ? '' : `<span style="color:${TEMPERATURE_COLOUR}">●</span> ${escapeHtml(t('graph.temperature'))} ${Math.round(temperature)} °${imperial ? 'F' : 'C'}`,
            windSpeed === null ? '' : `${escapeHtml(t('graph.wind'))} ${Math.round(windSpeed)} ${imperial ? 'mph' : 'km/h'}${windFrom ? ` ${t(WIND_FROM[windFrom])}` : ''}`,
            freezing === null ? '' : `${escapeHtml(t('graph.freezingLevel'))} ${Math.round(freezing)} ${imperial ? 'ft' : 'm'}`,
        ];
        this.tooltip.innerHTML = rows.filter(Boolean).map((row) => `<div>${row}</div>`).join('');
        this.tooltip.style.display = 'block';

        // Beside the pointer, flipped away from the edges, and inside the plot on phones
        const plot = this.u.over;
        const { width, height } = this.tooltip.getBoundingClientRect();
        let x = left + 12;
        let y = top + 12;
        if (x + width > plot.clientWidth) x = left - width - 12;
        if (y + height > plot.clientHeight) y = top - height - 12;
        this.tooltip.style.left = `${Math.max(0, x)}px`;
        this.tooltip.style.top = `${Math.max(0, y)}px`;
    }
}
