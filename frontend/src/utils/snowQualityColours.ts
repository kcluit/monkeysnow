/**
 * Snow quality colours: what each Snow quality is drawn in on a Graph, following the
 * weather-radar convention, and the same on every theme so a colour always means one
 * Snow quality.
 */

import type { SnowQuality } from '../types';
import { translate } from '../locales';

export const SNOW_QUALITY_COLOURS: Record<SnowQuality, string> = {
    rain: '#22a447',
    'sleet/mix': '#e8559b',
    wet_snow: '#5ab8f0',
    dry_snow: '#2f6fe0',
    powder: '#8a4fe0',
};

/**
 * Each Snow quality's name as the page shows it. Getters, so each is looked up in the
 * language shown when it's read, never once as this module loads.
 */
export const SNOW_QUALITY_NAMES: Record<SnowQuality, string> = {
    get rain() { return translate('snowQuality.rain'); },
    get 'sleet/mix'() { return translate('snowQuality.sleetMix'); },
    get wet_snow() { return translate('snowQuality.wetSnow'); },
    get dry_snow() { return translate('snowQuality.drySnow'); },
    get powder() { return translate('snowQuality.powder'); },
};
