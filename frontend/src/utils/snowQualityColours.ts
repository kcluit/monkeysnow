/**
 * Snow quality colours: what each Snow quality is drawn in on a Graph, following the
 * weather-radar convention, and the same on every theme so a colour always means one
 * Snow quality.
 */

import type { SnowQuality } from '../types';

export const SNOW_QUALITY_COLOURS: Record<SnowQuality, string> = {
    rain: '#22a447',
    'sleet/mix': '#e8559b',
    wet_snow: '#5ab8f0',
    dry_snow: '#2f6fe0',
    powder: '#8a4fe0',
};

/** Each Snow quality's name as the page shows it */
export const SNOW_QUALITY_NAMES: Record<SnowQuality, string> = {
    rain: 'Rain',
    'sleet/mix': 'Sleet/Mix',
    wet_snow: 'Wet snow',
    dry_snow: 'Dry snow',
    powder: 'Powder',
};
