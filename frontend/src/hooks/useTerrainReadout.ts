import { useCallback, useEffect, useRef, useState } from 'react';
import { terrainAt, type TerrainPoint, type TerrainReading } from '../utils/terrainAtPoint';

/**
 * The terrain under the mouse, for the cursor readout. `pointAt` is called as the mouse moves, or with
 * null when it leaves the map or points at the sky; it reads at most once a frame, and a slow reading
 * that a newer one has overtaken is dropped.
 */
export function useTerrainReadout(): { reading: TerrainReading | null; pointAt: (point: TerrainPoint | null) => void } {
    const [reading, setReading] = useState<TerrainReading | null>(null);
    const latest = useRef(0);
    const pending = useRef<TerrainPoint | null>(null);
    const frame = useRef<number | undefined>(undefined);

    const pointAt = useCallback((point: TerrainPoint | null) => {
        pending.current = point;
        if (!point) {
            latest.current++;
            if (frame.current !== undefined) cancelAnimationFrame(frame.current);
            frame.current = undefined;
            setReading(null);
            return;
        }
        if (frame.current !== undefined) return;
        frame.current = requestAnimationFrame(() => {
            frame.current = undefined;
            const next = pending.current;
            if (!next) return;
            const id = ++latest.current;
            void terrainAt(next).then(result => {
                if (id === latest.current) setReading(result);
            });
        });
    }, []);

    useEffect(() => () => {
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
        latest.current++;
    }, []);

    return { reading, pointAt };
}
