import { useLanguage } from '../../hooks/useLanguage';
import { ASPECT_SECTORS } from '../../utils/terrainRendering';
import type { TerrainReading } from '../../utils/terrainAtPoint';
import { formatElevation, type UnitSystem } from '../../utils/unitConversion';

interface CursorReadoutProps {
    reading: TerrainReading;
    unitSystem: UnitSystem;
    /** The 3D map's exaggeration slider has the top-right corner, so the readout goes below it */
    is3D: boolean;
}

/** The height, Slope angle and Aspect of the terrain under the mouse, in the top-right corner of either map. */
export function CursorReadout({ reading, unitSystem, is3D }: CursorReadoutProps): JSX.Element {
    const { t } = useLanguage();
    const aspect = ASPECT_SECTORS.find(sector => sector.name === reading.aspect);
    return (
        <div className={`resort-map-readout ${is3D ? 'resort-map-readout-3d' : ''}`} aria-hidden="true">
            <span>{t('map.readout.height')} <strong>{formatElevation(reading.height, unitSystem)}</strong></span>
            {reading.slopeAngle !== null && <span>{t('map.readout.slopeAngle')} <strong>{Math.round(reading.slopeAngle)}°</strong></span>}
            {aspect && <span>{t('map.readout.aspect')} <strong>{t(aspect.label)}</strong></span>}
        </div>
    );
}
