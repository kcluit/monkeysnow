import { describe, expect, it } from 'vitest';
import {
    addPrecipitation,
    dominantQuality,
    estimateHour,
    MIX_FROM,
    noPrecipitationByQuality,
    RAIN_FROM,
    snowFractionOf,
    snowQualityOf,
    snowToLiquidRatioOf,
    standardPressureAt,
    sumPrecipitationByQuality,
    surfacePressureOr,
    wetBulbOf,
} from './snowQuality';
import type { SnowQuality } from '../types';

describe('wetBulbOf', () => {
    it('is the air temperature in saturated air', () => {
        for (const t of [-15, -5, 0, 5]) expect(wetBulbOf(t, 100, 800)).toBeCloseTo(t, 6);
    });

    it('agrees with the psychrometric chart: 20 °C at 50% and sea level is about 13.85 °C', () => {
        expect(Math.abs(wetBulbOf(20, 50, 1013.25) - 13.85)).toBeLessThan(0.1);
    });

    it('is colder in drier air', () => {
        expect(wetBulbOf(1, 60, 800)).toBeLessThan(wetBulbOf(1, 95, 800));
    });

    it('is colder at lower pressure for the same air, by more the drier it is', () => {
        const humid = wetBulbOf(0, 95, 1013.25) - wetBulbOf(0, 95, 750);
        const dry = wetBulbOf(0, 40, 1013.25) - wetBulbOf(0, 40, 750);
        expect(humid).toBeGreaterThan(0);
        expect(dry).toBeGreaterThan(humid);
    });

    it('clamps humidity to 0..100', () => {
        expect(wetBulbOf(0, 140, 800)).toBe(wetBulbOf(0, 100, 800));
        expect(wetBulbOf(0, -5, 800)).toBe(wetBulbOf(0, 0, 800));
    });
});

describe('surface pressure', () => {
    it('is the standard atmosphere\'s where the model gives none: 1013 at sea level, about 747 at 2500 m', () => {
        expect(standardPressureAt(0)).toBeCloseTo(1013.25, 2);
        expect(standardPressureAt(2500)).toBeCloseTo(747, 0);
        expect(surfacePressureOr(NaN, 2500)).toBe(standardPressureAt(2500));
        expect(surfacePressureOr(0, 2500)).toBe(standardPressureAt(2500));
    });

    it('is the model\'s where it gives one', () => {
        expect(surfacePressureOr(812, 2500)).toBe(812);
    });
});

describe('the two lines', () => {
    it('put Rain at +0.5 and Sleet/Mix from -0.5', () => {
        expect(RAIN_FROM).toBe(0.5);
        expect(MIX_FROM).toBe(-0.5);
    });
});

describe('snowFractionOf', () => {
    it('is all snow at and below -0.5', () => {
        expect(snowFractionOf(-0.5)).toBe(1);
        expect(snowFractionOf(-8)).toBe(1);
    });

    it('is all rain at and above +0.5', () => {
        expect(snowFractionOf(0.5)).toBe(0);
        expect(snowFractionOf(4)).toBe(0);
    });

    it('falls in a straight line between', () => {
        expect(snowFractionOf(0)).toBeCloseTo(0.5, 10);
        expect(snowFractionOf(-0.25)).toBeCloseTo(0.75, 10);
        expect(snowFractionOf(0.4)).toBeCloseTo(0.1, 10);
    });
});

describe('snowToLiquidRatioOf', () => {
    it('is 8 at -0.5 and warmer', () => {
        expect(snowToLiquidRatioOf(-0.5)).toBe(8);
        expect(snowToLiquidRatioOf(0)).toBe(8);
        expect(snowToLiquidRatioOf(5)).toBe(8);
    });

    it('rises straight to 17 at -14', () => {
        expect(snowToLiquidRatioOf(-3.5)).toBeCloseTo(10, 10);
        expect(snowToLiquidRatioOf(-11)).toBeCloseTo(15, 10);
        expect(snowToLiquidRatioOf(-14)).toBe(17);
    });

    it('stays at 17 to -18', () => {
        expect(snowToLiquidRatioOf(-16)).toBe(17);
        expect(snowToLiquidRatioOf(-18)).toBe(17);
    });

    it('falls to 12 by -25 and stays there', () => {
        expect(snowToLiquidRatioOf(-20.8)).toBeCloseTo(15, 10);
        expect(snowToLiquidRatioOf(-25)).toBe(12);
        expect(snowToLiquidRatioOf(-40)).toBe(12);
    });

    it('never jumps: a tenth of a degree moves it by less than a tenth', () => {
        for (let t = -30; t <= 2; t += 0.1) {
            expect(Math.abs(snowToLiquidRatioOf(t) - snowToLiquidRatioOf(t - 0.1))).toBeLessThan(0.1);
        }
    });
});

describe('snowQualityOf', () => {
    it('is Rain from +0.5 up', () => {
        expect(snowQualityOf(0.5)).toBe('rain');
        expect(snowQualityOf(3)).toBe('rain');
    });

    it('is Sleet/Mix from -0.5 to +0.5', () => {
        expect(snowQualityOf(-0.5)).toBe('sleet/mix');
        expect(snowQualityOf(0)).toBe('sleet/mix');
        expect(snowQualityOf(0.49)).toBe('sleet/mix');
    });

    it('is Wet snow under a ratio of 10, down to about -3.5', () => {
        expect(snowQualityOf(-0.51)).toBe('wet_snow');
        expect(snowQualityOf(-3.4)).toBe('wet_snow');
    });

    it('is Dry snow from a ratio of 10 to 15, about -3.5 to -11', () => {
        expect(snowQualityOf(-3.5)).toBe('dry_snow');
        expect(snowQualityOf(-7)).toBe('dry_snow');
        expect(snowQualityOf(-10.9)).toBe('dry_snow');
    });

    it('is Powder from a ratio of 15, about -11 to -21', () => {
        expect(snowQualityOf(-11)).toBe('powder');
        expect(snowQualityOf(-16)).toBe('powder');
        expect(snowQualityOf(-20)).toBe('powder');
    });

    it('is Dry snow again in the bitter cold', () => {
        expect(snowQualityOf(-21)).toBe('dry_snow');
        expect(snowQualityOf(-30)).toBe('dry_snow');
    });
});

describe('estimateHour', () => {
    it('makes rain of everything in warm air', () => {
        const hour = estimateHour(6, 80, 2.5, 800);
        expect(hour.quality).toBe('rain');
        expect(hour.rainMm).toBe(2.5);
        expect(hour.snowCm).toBe(0);
    });

    it('makes snow of everything in cold air, by the ratio at its wet bulb', () => {
        const hour = estimateHour(-6, 85, 3, 800);
        expect(hour.quality).toBe('dry_snow');
        expect(hour.rainMm).toBe(0);
        expect(hour.snowCm).toBeCloseTo(3 * snowToLiquidRatioOf(hour.wetBulb) / 10, 10);
    });

    it('splits a Sleet/Mix hour so the snow water and the rain add up to what fell', () => {
        // Saturated air a little above freezing sits inside the Sleet/Mix band
        const hour = estimateHour(0.3, 100, 2, 800);
        expect(hour.quality).toBe('sleet/mix');
        const snowWaterMm = hour.snowCm * 10 / snowToLiquidRatioOf(hour.wetBulb);
        expect(snowWaterMm + hour.rainMm).toBeCloseTo(2, 10);
        expect(hour.rainMm).toBeGreaterThan(0);
        expect(hour.snowCm).toBeGreaterThan(0);
    });

    it('treats a missing or negative amount as nothing falling', () => {
        expect(estimateHour(-5, 90, NaN, 800).snowCm).toBe(0);
        expect(estimateHour(-5, 90, -1, 800).rainMm).toBe(0);
    });
});

describe('dominantQuality', () => {
    const tally = (hours: [SnowQuality, number][]) => {
        const byQuality = noPrecipitationByQuality();
        for (const [quality, mm] of hours) addPrecipitation(byQuality, quality, mm);
        return byQuality;
    };

    it('is nothing when nothing fell', () => {
        expect(dominantQuality(noPrecipitationByQuality())).toBeNull();
        expect(dominantQuality(tally([['rain', 0], ['powder', NaN]]))).toBeNull();
    });

    it('is the one label of a stretch with one', () => {
        expect(dominantQuality(tally([['wet_snow', 1.2], ['wet_snow', 0.3]]))).toBe('wet_snow');
    });

    it('goes by amount, so four drizzle hours do not outvote two heavy snow hours', () => {
        const night = tally([['rain', 0.1], ['rain', 0.1], ['rain', 0.1], ['rain', 0.1], ['dry_snow', 8], ['dry_snow', 8]]);
        expect(dominantQuality(night)).toBe('dry_snow');
    });

    it('lets one real rain hour outweigh lighter snow', () => {
        expect(dominantQuality(tally([['rain', 5], ['powder', 1], ['powder', 1], ['powder', 1]]))).toBe('rain');
    });

    it('takes the worst of the tied on a tie', () => {
        expect(dominantQuality(tally([['rain', 3], ['dry_snow', 3]]))).toBe('rain');
        expect(dominantQuality(tally([['powder', 2], ['wet_snow', 2], ['sleet/mix', 1]]))).toBe('wet_snow');
    });

    it('counts sums a rounding error apart as tied', () => {
        expect(dominantQuality(tally([['dry_snow', 0.1], ['dry_snow', 0.2], ['rain', 0.3]]))).toBe('rain');
        expect(dominantQuality(tally([['rain', 0.1], ['rain', 0.2], ['dry_snow', 0.3]]))).toBe('rain');
    });
});

describe('sumPrecipitationByQuality', () => {
    it('adds up Periods into a day and skips Periods without the tally', () => {
        const am = [1, 0, 0, 0, 0];
        const pm = [0, 0, 0, 4, 0];
        expect(sumPrecipitationByQuality([am, undefined, pm])).toEqual([1, 0, 0, 4, 0]);
        expect(dominantQuality(sumPrecipitationByQuality([am, pm]))).toBe('dry_snow');
    });
});
