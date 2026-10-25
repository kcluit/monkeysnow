/**
 * Edits the Slope bands, a row each: where it starts and ends, its colour, and removing it; then
 * adding a band and putting back the default. Every change is saved at once and redraws Slope angle
 * on whichever map shows it. Used in either map's layers panel and in SlopeBandsModal.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { useSlopeBands } from '../../hooks/useSlopeBands';
import {
    DEFAULT_SLOPE_BANDS,
    getSlopeBands,
    newSlopeBand,
    setSlopeBands,
    slopeBandLabel,
    withBand,
    withBandColour,
    withBandFrom,
    withBandTo,
    withoutBand,
    type SlopeBand,
} from '../../utils/slopeBands';

// Read the bands when acting, not when last drawn: leaving an angle's box saves it just before a click elsewhere acts
const update = (change: (bands: readonly SlopeBand[]) => readonly SlopeBand[]) => setSlopeBands(change(getSlopeBands()));

/**
 * Whole degrees. What is typed is kept until the box is left or Enter is pressed, then snapped into the
 * band's room; the arrow keys step it at once.
 */
function AngleInput({ value, label, onChange }: { value: number; label: string; onChange: (degrees: number) => void }): JSX.Element {
    // Null while the box isn't being typed in
    const [typed, setTyped] = useState<string | null>(null);
    const commit = () => {
        if (typed !== null && /^\d+$/.test(typed.trim())) onChange(Number(typed));
        setTyped(null);
    };
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            setTyped(null);
            onChange(value + (e.key === 'ArrowUp' ? 1 : -1));
        }
    };
    return (
        <input
            type="text"
            inputMode="numeric"
            className="slope-bands-angle"
            aria-label={label}
            value={typed ?? value}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setTyped(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
        />
    );
}

/** The browser's colour picker; the map is redrawn with the colour picked, not every one passed over on the way */
function ColourInput({ value, label, onChange }: { value: string; label: string; onChange: (colour: string) => void }): JSX.Element {
    const ref = useRef<HTMLInputElement>(null);
    const [passing, setPassing] = useState<string | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // React's onChange fires on every colour along the way; the DOM's change event only on the one picked
    useEffect(() => {
        const input = ref.current;
        if (!input) return;
        const pick = () => {
            onChangeRef.current(input.value);
            setPassing(null);
        };
        input.addEventListener('change', pick);
        return () => input.removeEventListener('change', pick);
    }, []);

    return (
        <input
            ref={ref}
            type="color"
            className="slope-bands-colour"
            aria-label={label}
            value={passing ?? value}
            onChange={(e) => setPassing(e.target.value)}
        />
    );
}

export function SlopeBandsEditor(): JSX.Element {
    const { t } = useLanguage();
    const bands = useSlopeBands();
    const [confirmingReset, setConfirmingReset] = useState(false);
    const canAdd = newSlopeBand(bands) !== null;
    const isDefault = JSON.stringify(bands) === JSON.stringify(DEFAULT_SLOPE_BANDS);

    return (
        <div className="slope-bands">
            <ul className="slope-bands-list" aria-label={t('map.slopeBands.title')}>
                {bands.map((band, i) => (
                    <li key={i} className="slope-bands-row">
                        <AngleInput value={band.from} label={t('map.slopeBands.from', { n: i + 1 })} onChange={(from) => update(b => withBandFrom(b, i, from))} />
                        <span aria-hidden="true">–</span>
                        <AngleInput value={band.to} label={t('map.slopeBands.to', { n: i + 1 })} onChange={(to) => update(b => withBandTo(b, i, to))} />
                        <span aria-hidden="true">°</span>
                        <ColourInput value={band.colour} label={t('map.slopeBands.colour', { n: i + 1 })} onChange={(colour) => update(b => withBandColour(b, i, colour))} />
                        <button
                            type="button"
                            className="slope-bands-remove"
                            disabled={bands.length === 1}
                            aria-label={t('map.slopeBands.remove', { band: slopeBandLabel(band) })}
                            title={bands.length === 1 ? t('map.slopeBands.lastStays') : t('map.slopeBands.remove', { band: slopeBandLabel(band) })}
                            onClick={() => update(b => withoutBand(b, i))}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                    </li>
                ))}
            </ul>
            <div className="slope-bands-actions">
                {confirmingReset ? (
                    <div className="slope-bands-confirm" role="group" aria-label={t('map.slopeBands.reset')}>
                        <span>{t('map.slopeBands.confirmReset')}</span>
                        <button
                            type="button"
                            className="slope-bands-btn"
                            onClick={() => {
                                setSlopeBands(DEFAULT_SLOPE_BANDS);
                                setConfirmingReset(false);
                            }}
                        >
                            {t('map.slopeBands.yes')}
                        </button>
                        <button type="button" className="slope-bands-btn" onClick={() => setConfirmingReset(false)}>{t('map.slopeBands.no')}</button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            className="slope-bands-btn"
                            disabled={!canAdd}
                            title={canAdd ? undefined : t('map.slopeBands.noRoom')}
                            onClick={() => update(b => {
                                const added = newSlopeBand(b);
                                return added ? withBand(b, added) : b;
                            })}
                        >
                            {t('map.slopeBands.add')}
                        </button>
                        <button type="button" className="slope-bands-btn" disabled={isDefault} onClick={() => setConfirmingReset(true)}>
                            {t('map.slopeBands.reset')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
