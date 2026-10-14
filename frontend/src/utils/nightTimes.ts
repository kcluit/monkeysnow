/**
 * When it is night at a point: from sunset to sunrise, worked out from the sun's
 * position (the formulas SunCalc uses, after Astronomy Answers), so it costs no
 * Open-Meteo calls. Accurate to a few minutes, which is plenty for shading a Graph.
 */

const RAD = Math.PI / 180;
const DAY_SECONDS = 86400;
const J1970 = 2440588;
const J2000 = 2451545;
/** The Earth's tilt */
const OBLIQUITY = RAD * 23.4397;
/** The sun's centre is this far below the horizon at sunrise and sunset, allowing for refraction */
const SUNSET_ALTITUDE = RAD * -0.833;
/** How finely nights are found; their ends are within half of it */
const STEP_SECONDS = 300;

/** The sun's altitude in radians at `epochSeconds`, seen from `lat`, `lon` (degrees). */
function sunAltitude(epochSeconds: number, lat: number, lon: number): number {
    const days = epochSeconds / DAY_SECONDS - 0.5 + J1970 - J2000;
    const meanAnomaly = RAD * (357.5291 + 0.98560028 * days);
    const centre = RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly));
    const eclipticLongitude = meanAnomaly + centre + RAD * 102.9372 + Math.PI;
    const declination = Math.asin(Math.sin(OBLIQUITY) * Math.sin(eclipticLongitude));
    const rightAscension = Math.atan2(Math.sin(eclipticLongitude) * Math.cos(OBLIQUITY), Math.cos(eclipticLongitude));
    const siderealTime = RAD * (280.16 + 360.9856235 * days) + RAD * lon;
    const hourAngle = siderealTime - rightAscension;
    const phi = RAD * lat;
    return Math.asin(Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle));
}

/** The nights between `start` and `end` (epoch seconds), each as [sunset, sunrise], cut to that span. */
export function nightsBetween(start: number, end: number, lat: number, lon: number): [number, number][] {
    const nights: [number, number][] = [];
    let nightStart: number | null = null;
    for (let t = start; t <= end; t += STEP_SECONDS) {
        const dark = sunAltitude(t, lat, lon) < SUNSET_ALTITUDE;
        if (dark && nightStart === null) nightStart = t;
        if (!dark && nightStart !== null) {
            nights.push([nightStart, t]);
            nightStart = null;
        }
    }
    if (nightStart !== null) nights.push([nightStart, end]);
    return nights;
}
