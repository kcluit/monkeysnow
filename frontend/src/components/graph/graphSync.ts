/**
 * What every Graph on the page shares: the stretch of time on show, how far it can
 * zoom out, where a double-click returns to, and the moment being pointed at, which
 * the other Graphs mark with a hairline. Times are epoch seconds, so Graphs in
 * different time zones line up by moment.
 */

import type { XRange } from '../../lib/charts/plugins';

/** How much a Graph opens on */
const OPENING_SECONDS = 5 * 86400;

/** What a Graph does when another one zooms, pans or is pointed at */
export interface SyncedGraph {
    showWindow(range: XRange): void;
    /** A hairline at this moment, or none */
    showHairline(moment: number | null): void;
}

export class GraphSync {
    /** Every hour any Graph on the page has */
    bounds: XRange = { min: 0, max: 0 };
    /** 5 days from the current hour, within the bounds: for History, which ends at the current hour, the 5 days up to it */
    home: XRange = { min: 0, max: 0 };
    window: XRange = { min: 0, max: 0 };
    hairline: number | null = null;

    private graphs = new Set<SyncedGraph>();
    private hairlineSource: SyncedGraph | null = null;
    private zoomed = false;

    /** Takes in the hours of the Graphs on the page; until a visitor zooms, the window follows the opening 5 days. */
    setBounds(bounds: XRange): void {
        if (bounds.min === this.bounds.min && bounds.max === this.bounds.max) return;
        this.bounds = bounds;
        const hourNow = Math.floor(Date.now() / 3_600_000) * 3600;
        const min = Math.max(bounds.min, Math.min(hourNow, bounds.max - OPENING_SECONDS));
        this.home = { min, max: Math.min(bounds.max, min + OPENING_SECONDS) };

        if (!this.zoomed) {
            this.window = this.home;
        } else {
            const span = Math.min(this.window.max - this.window.min, bounds.max - bounds.min);
            const windowMin = Math.max(bounds.min, Math.min(bounds.max - span, this.window.min));
            this.window = { min: windowMin, max: windowMin + span };
        }
        this.graphs.forEach((graph) => graph.showWindow(this.window));
    }

    add(graph: SyncedGraph): void {
        this.graphs.add(graph);
    }

    remove(graph: SyncedGraph): void {
        this.graphs.delete(graph);
        if (this.hairlineSource === graph) this.setHairline(null, graph);
    }

    /** One Graph zoomed or panned: the rest follow */
    setWindow(range: XRange, source: SyncedGraph): void {
        this.window = range;
        this.zoomed = range.min !== this.home.min || range.max !== this.home.max;
        this.graphs.forEach((graph) => {
            if (graph !== source) graph.showWindow(range);
        });
    }

    /** One Graph is pointed at, or no longer is: the rest mark the moment */
    setHairline(moment: number | null, source: SyncedGraph): void {
        // Only the Graph being pointed at can take the hairline away
        if (moment === null && this.hairlineSource !== source) return;
        this.hairline = moment;
        this.hairlineSource = moment === null ? null : source;
        this.graphs.forEach((graph) => {
            if (graph !== source) graph.showHairline(moment);
        });
    }
}
