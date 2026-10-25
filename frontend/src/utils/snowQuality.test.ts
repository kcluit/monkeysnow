import { describe, expect, it } from 'vitest';
import {
    addPrecipitation,
    CAUTION_LINES,
    dominantQuality,
    noPrecipitationByQuality,
    SNOW_CAUTIONS,
    snowFractionOf,
    snowQualityOf,
    snowToLiquidRatioOf,
    splitHour,
    standardPressureAt,
    sumPrecipitationByQuality,
    surfacePressureOr,
    wetBulbOf,
} from './snowQuality';
import type { SnowCaution, SnowQuality } from '../types';

/** How likely snow is at a wet bulb on Wang et al.'s (2019) curve, which the Snow cautions' lines are placed on */
const wangSnowChance = (wetBulbC: number): number => 1 / (1 + 6.99e-5 * Math.exp(2 * (wetBulbC + 3.97)));

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

describe('the Snow cautions\' lines', () => {
    it('put Cautious\'s Sleet/Mix from -0.5 and Rain at +0.5', () => {
        expect(CAUTION_LINES.cautious).toEqual({ mixFrom: -0.5, rainFrom: 0.5 });
    });

    /** Within a percentage point */
    const expectChance = (wetBulbC: number, chance: number) => expect(Math.abs(wangSnowChance(wetBulbC) - chance)).toBeLessThan(0.01);

    it('put Extra cautious\'s at -1.5 and -0.3, where snow is 99% and 90% likely', () => {
        expect(CAUTION_LINES.extraCautious).toEqual({ mixFrom: -1.5, rainFrom: -0.3 });
        expectChance(-1.5, 0.99);
        expectChance(-0.3, 0.90);
    });

    it('put Cautious\'s where snow is 93% and 65% likely', () => {
        expectChance(-0.5, 0.93);
        expectChance(0.5, 0.65);
    });

    it('put Realistic\'s at +0.25 and +1.35, where snow is 75% and 25% likely, so half snow at +0.8', () => {
        expect(CAUTION_LINES.realistic).toEqual({ mixFrom: 0.25, rainFrom: 1.35 });
        expectChance(0.25, 0.75);
        expectChance(1.35, 0.25);
        expect(snowFractionOf(0.8, 'realistic')).toBeCloseTo(0.5, 10);
        expectChance(0.8, 0.5);
    });

    it('call Rain soonest under Extra cautious and latest under Realistic', () => {
        expect(snowQualityOf(0, 'extraCautious')).toBe('rain');
        expect(snowQualityOf(0, 'cautious')).toBe('sleet/mix');
        expect(snowQualityOf(0, 'realistic')).toBe('wet_snow');
        expect(snowQualityOf(1, 'realistic')).toBe('sleet/mix');
        expect(snowQualityOf(1.35, 'realistic')).toBe('rain');
    });
});

describe('snowFractionOf', () => {
    it('is all snow at and below the Sleet/Mix line', () => {
        for (const caution of SNOW_CAUTIONS) {
            expect(snowFractionOf(CAUTION_LINES[caution].mixFrom, caution)).toBe(1);
            expect(snowFractionOf(-8, caution)).toBe(1);
        }
    });

    it('is all rain at and above the Rain line', () => {
        for (const caution of SNOW_CAUTIONS) {
            expect(snowFractionOf(CAUTION_LINES[caution].rainFrom, caution)).toBe(0);
            expect(snowFractionOf(4, caution)).toBe(0);
        }
    });

    it('falls in a straight line between', () => {
        expect(snowFractionOf(0, 'cautious')).toBeCloseTo(0.5, 10);
        expect(snowFractionOf(-0.25, 'cautious')).toBeCloseTo(0.75, 10);
        expect(snowFractionOf(0.4, 'cautious')).toBeCloseTo(0.1, 10);
        expect(snowFractionOf(-0.9, 'extraCautious')).toBeCloseTo(0.5, 10);
    });
});

describe('snowToLiquidRatioOf', () => {
    it('is 8 at -0.5 and warmer', () => {
        expect(snowToLiquidRatioOf(-0.5, 'cautious')).toBe(8);
        expect(snowToLiquidRatioOf(0, 'cautious')).toBe(8);
        expect(snowToLiquidRatioOf(5, 'cautious')).toBe(8);
    });

    it('rises straight to 17 at -14', () => {
        expect(snowToLiquidRatioOf(-3.5, 'cautious')).toBeCloseTo(10, 10);
        expect(snowToLiquidRatioOf(-11, 'cautious')).toBeCloseTo(15, 10);
        expect(snowToLiquidRatioOf(-14, 'cautious')).toBe(17);
    });

    it('stays at 17 to -18', () => {
        expect(snowToLiquidRatioOf(-16, 'cautious')).toBe(17);
        expect(snowToLiquidRatioOf(-18, 'cautious')).toBe(17);
    });

    it('falls to 12 by -25 and stays there', () => {
        expect(snowToLiquidRatioOf(-20.8, 'cautious')).toBeCloseTo(15, 10);
        expect(snowToLiquidRatioOf(-25, 'cautious')).toBe(12);
        expect(snowToLiquidRatioOf(-40, 'cautious')).toBe(12);
    });

    it('is the same line under Realistic', () => {
        for (let t = -30; t <= 2; t += 0.5) expect(snowToLiquidRatioOf(t, 'realistic')).toBe(snowToLiquidRatioOf(t, 'cautious'));
    });

    it('is LaChapelle\'s denser snow under Extra cautious near freezing: 9.6 at -5 against the line\'s 11', () => {
        expect(snowToLiquidRatioOf(-5, 'extraCautious')).toBeCloseTo(1000 / (50 + 1.7 * Math.pow(10, 1.5)), 10);
        expect(snowToLiquidRatioOf(-5, 'extraCautious')).toBeCloseTo(9.64, 2);
        expect(snowToLiquidRatioOf(-5, 'cautious')).toBeCloseTo(11, 10);
    });

    it('is never more under Extra cautious than the line, and the line from about -10 down', () => {
        for (let t = -30; t <= 2; t += 0.1) {
            expect(snowToLiquidRatioOf(t, 'extraCautious')).toBeLessThanOrEqual(snowToLiquidRatioOf(t, 'cautious'));
        }
        for (const t of [-10, -14, -16, -20, -25]) {
            expect(snowToLiquidRatioOf(t, 'extraCautious')).toBe(snowToLiquidRatioOf(t, 'cautious'));
        }
    });

    it('never jumps: a hundredth of a degree moves it by less than two hundredths', () => {
        // LaChapelle's curve climbs about 1.2 a degree around -10 °C, steeper than the line
        for (const caution of SNOW_CAUTIONS) {
            for (let t = -30; t <= 2; t += 0.01) {
                expect(Math.abs(snowToLiquidRatioOf(t, caution) - snowToLiquidRatioOf(t - 0.01, caution))).toBeLessThan(0.02);
            }
        }
    });
});

describe('snowQualityOf', () => {
    it('is Rain from +0.5 up', () => {
        expect(snowQualityOf(0.5, 'cautious')).toBe('rain');
        expect(snowQualityOf(3, 'cautious')).toBe('rain');
    });

    it('is Sleet/Mix from -0.5 to +0.5', () => {
        expect(snowQualityOf(-0.5, 'cautious')).toBe('sleet/mix');
        expect(snowQualityOf(0, 'cautious')).toBe('sleet/mix');
        expect(snowQualityOf(0.49, 'cautious')).toBe('sleet/mix');
    });

    it('is Wet snow under a ratio of 10, down to about -3.5', () => {
        expect(snowQualityOf(-0.51, 'cautious')).toBe('wet_snow');
        expect(snowQualityOf(-3.4, 'cautious')).toBe('wet_snow');
    });

    it('is Dry snow from a ratio of 10 to 15, about -3.5 to -11', () => {
        expect(snowQualityOf(-3.5, 'cautious')).toBe('dry_snow');
        expect(snowQualityOf(-7, 'cautious')).toBe('dry_snow');
        expect(snowQualityOf(-10.9, 'cautious')).toBe('dry_snow');
    });

    it('is Powder from a ratio of 15, about -11 to -21', () => {
        expect(snowQualityOf(-11, 'cautious')).toBe('powder');
        expect(snowQualityOf(-16, 'cautious')).toBe('powder');
        expect(snowQualityOf(-20, 'cautious')).toBe('powder');
    });

    it('is Dry snow again in the bitter cold', () => {
        expect(snowQualityOf(-21, 'cautious')).toBe('dry_snow');
        expect(snowQualityOf(-30, 'cautious')).toBe('dry_snow');
    });

    it('keeps Wet snow down to about -5.5 under Extra cautious, and Powder in cold snow', () => {
        expect(snowQualityOf(-1.5, 'extraCautious')).toBe('sleet/mix');
        expect(snowQualityOf(-1.51, 'extraCautious')).toBe('wet_snow');
        expect(snowQualityOf(-5.4, 'extraCautious')).toBe('wet_snow');
        expect(snowQualityOf(-5.6, 'extraCautious')).toBe('dry_snow');
        expect(snowQualityOf(-11, 'extraCautious')).toBe('powder');
        expect(snowQualityOf(-20, 'extraCautious')).toBe('powder');
    });

    it('gives Realistic the same snow labels as Cautious below Cautious\'s Sleet/Mix line', () => {
        for (let t = -30; t < -0.5; t += 0.5) expect(snowQualityOf(t, 'realistic')).toBe(snowQualityOf(t, 'cautious'));
    });
});

describe('splitHour', () => {
    it('makes rain of everything in warm air', () => {
        const hour = splitHour(wetBulbOf(6, 80, 800), 2.5, 'cautious');
        expect(hour.quality).toBe('rain');
        expect(hour.rainMm).toBe(2.5);
        expect(hour.snowCm).toBe(0);
    });

    it('makes snow of everything in cold air, by the ratio at its wet bulb', () => {
        const wetBulb = wetBulbOf(-6, 85, 800);
        const hour = splitHour(wetBulb, 3, 'cautious');
        expect(hour.quality).toBe('dry_snow');
        expect(hour.rainMm).toBe(0);
        expect(hour.snowCm).toBeCloseTo(3 * snowToLiquidRatioOf(wetBulb, 'cautious') / 10, 10);
    });

    it('splits a Sleet/Mix hour so the snow water and the rain add up to what fell, under every caution', () => {
        const cases: [SnowCaution, number][] = [['extraCautious', -0.9], ['cautious', 0.3], ['realistic', 0.8]];
        for (const [caution, wetBulb] of cases) {
            const hour = splitHour(wetBulb, 2, caution);
            expect(hour.quality).toBe('sleet/mix');
            const snowWaterMm = hour.snowCm * 10 / snowToLiquidRatioOf(wetBulb, caution);
            expect(snowWaterMm + hour.rainMm).toBeCloseTo(2, 10);
            expect(hour.rainMm).toBeGreaterThan(0);
            expect(hour.snowCm).toBeGreaterThan(0);
        }
    });

    it('makes the least snow under Extra cautious and the most under Realistic', () => {
        for (const wetBulb of [-4, -1, 0, 0.5]) {
            const snowOf = (caution: SnowCaution) => splitHour(wetBulb, 3, caution).snowCm;
            expect(snowOf('extraCautious')).toBeLessThanOrEqual(snowOf('cautious'));
            expect(snowOf('cautious')).toBeLessThanOrEqual(snowOf('realistic'));
        }
        expect(splitHour(-4, 3, 'extraCautious').snowCm).toBeLessThan(splitHour(-4, 3, 'cautious').snowCm);
    });

    it('treats a missing or negative amount as nothing falling', () => {
        expect(splitHour(-5, NaN, 'cautious').snowCm).toBe(0);
        expect(splitHour(-5, -1, 'cautious').rainMm).toBe(0);
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
