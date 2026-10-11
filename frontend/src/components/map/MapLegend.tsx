import { TERRAIN_COLOURINGS, type TerrainColouringId } from '../../utils/mapLayers';
import { slopeBandLabel, type SlopeBand } from '../../utils/slopeBands';
import {
    ASPECT_SECTORS,
    GRADIENT_STOPS,
    HEIGHT_TINT_STOPS,
    type ColourStop,
} from '../../utils/terrainRendering';
import type { UnitSystem } from '../../utils/unitConversion';

const FEET_TO_METRES = 0.3048;

const rgb = (colour: readonly number[]) => `rgb(${colour.join(', ')})`;

/** A smooth bar of a colour scale, with labels at the given values */
function ScaleBar({ stops, ticks }: { stops: readonly ColourStop[]; ticks: { value: number; label: string }[] }): JSX.Element {
    const first = stops[0].value;
    const span = stops[stops.length - 1].value - first;
    const at = (value: number) => ((value - first) / span) * 100;
    const background = `linear-gradient(to right, ${stops.map(s => `${rgb(s.colour)} ${at(s.value)}%`).join(', ')})`;
    return (
        <div className="resort-map-legend-scale">
            <div className="resort-map-legend-bar" style={{ background }} />
            <div className="resort-map-legend-ticks">
                {ticks.map(tick => (
                    <span key={tick.value} style={{ left: `${at(tick.value)}%` }}>{tick.label}</span>
                ))}
            </div>
        </div>
    );
}

/** The eight Aspects as a compass rose, north up */
function AspectRose(): JSX.Element {
    const radius = 22;
    const wedge = (index: number) => {
        const from = ((index * 45 - 22.5) * Math.PI) / 180;
        const to = ((index * 45 + 22.5) * Math.PI) / 180;
        const point = (angle: number) => `${radius * Math.sin(angle)} ${-radius * Math.cos(angle)}`;
        return `M 0 0 L ${point(from)} A ${radius} ${radius} 0 0 1 ${point(to)} Z`;
    };
    return (
        <svg className="resort-map-legend-rose" viewBox="-34 -34 68 68" role="img" aria-label="Aspect: the compass direction a slope faces">
            {ASPECT_SECTORS.map((sector, i) => (
                <path key={sector.name} d={wedge(i)} fill={rgb(sector.colour)} stroke="rgba(128, 128, 128, 0.6)" strokeWidth={0.5} />
            ))}
            {[['N', 0, -29], ['E', 29, 0], ['S', 0, 29], ['W', -29, 0]].map(([letter, x, y]) => (
                <text key={letter} x={x} y={y} textAnchor="middle" dominantBaseline="central">{letter}</text>
            ))}
        </svg>
    );
}

function heightTicks(unitSystem: UnitSystem): { value: number; label: string }[] {
    if (unitSystem === 'imperial') {
        return [0, 10000, 20000].map(feet => ({ value: feet * FEET_TO_METRES, label: feet === 0 ? '0' : `${feet}ft` }));
    }
    return [0, 2000, 4000, 6000, 8000].map(metres => ({ value: metres, label: metres === 0 ? '0' : `${metres}m` }));
}

interface MapLegendProps {
    colouring: TerrainColouringId;
    slopeBands: readonly SlopeBand[];
    unitSystem: UnitSystem;
}

/** What the Terrain colouring's colours mean, along the bottom of either map while it is on. */
export function MapLegend({ colouring, slopeBands, unitSystem }: MapLegendProps): JSX.Element {
    const label = TERRAIN_COLOURINGS.find(c => c.id === colouring)?.label;
    return (
        <div className="resort-map-legend" aria-label={`${label} legend`}>
            <div className="resort-map-legend-title">{label}</div>
            {colouring === 'slopeAngle' && (
                <>
                    <div className="resort-map-legend-bands">
                        {slopeBands.map(band => (
                            <span key={band.from}>
                                <i style={{ background: band.colour }} />
                                {slopeBandLabel(band)}
                            </span>
                        ))}
                    </div>
                    <div className="resort-map-legend-note">Approximate</div>
                </>
            )}
            {colouring === 'gradient' && (
                <ScaleBar stops={GRADIENT_STOPS} ticks={[0, 15, 30, 45, 60, 75, 90].map(d => ({ value: d, label: `${d}°` }))} />
            )}
            {colouring === 'aspect' && <AspectRose />}
            {colouring === 'heightTint' && <ScaleBar stops={HEIGHT_TINT_STOPS} ticks={heightTicks(unitSystem)} />}
        </div>
    );
}
