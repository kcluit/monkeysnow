import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { RESORT_HIERARCHY, RESORT_LOCATIONS } from '../../data/resortLocations';
import { getModelInfo } from '../../data/modelHierarchy';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { useCountryModels } from '../../hooks/useCountryModels';
import { useLanguage } from '../../hooks/useLanguage';
import { useOverlay } from '../../hooks/useOverlay';
import { interpolate } from '../../locales';
import { shouldAutoFocusSearch } from '../../utils/autoFocus';
import { getSavedLocation } from '../../utils/savedLocations';
import {
    countryModelOptions,
    everywhereModelOptions,
    recommendedCardModel,
    resetCountryModels,
    setCountryModel,
    setEveryCountryModel,
    type CountryModelProvider,
} from '../../utils/cardModels';
import type { WeatherModel } from '../../types/openMeteo';

interface Country {
    code: string;
    name: string;
    resorts: number;
}

// Countries by continent, in the Resort picker's order
const CONTINENTS = RESORT_HIERARCHY.map((continent) => ({
    name: continent.name,
    countries: continent.countries.map((country): Country => ({
        code: country.code,
        name: country.name,
        resorts: country.provinces.reduce((sum, province) => sum + province.resorts.length, 0),
    })),
}));

const ALL_COUNTRIES = CONTINENTS
    .flatMap((continent) => continent.countries)
    .sort((a, b) => a.name.localeCompare(b.name));

const labelOf = (model: WeatherModel): string => getModelInfo(model)?.label ?? model;

/** "Auto everywhere", or how many countries have a Country model. */
export function useCardModelsSummary(): string {
    const { t } = useLanguage();
    const changed = Object.keys(useCountryModels()).length;
    if (changed === 0) return t('cardModels.autoEverywhere');
    return changed === 1 ? t('cardModels.changedOne') : interpolate(t('cardModels.changedMany'), { count: changed });
}

interface ModelOptionsProps {
    providers: CountryModelProvider[];
    onPick: (model: WeatherModel | null) => void;
    /** The Auto option's label; left out where there's no Auto to pick */
    autoLabel?: string;
    /** The current choice, null for Auto */
    selected?: WeatherModel | null;
    /** The country's Resort count, to show partial Coverage against */
    resorts?: number;
}

function ModelOptions({ providers, onPick, autoLabel, selected, resorts }: ModelOptionsProps): JSX.Element {
    const { t } = useLanguage();
    return (
        <div className="card-models-options">
            {autoLabel && (
                <button
                    className={`card-models-option ${selected === null ? 'selected' : ''}`}
                    aria-pressed={selected === null}
                    onClick={() => onPick(null)}
                >
                    <span className="card-models-option-name">{autoLabel}</span>
                </button>
            )}
            {providers.map((provider) => (
                <div key={provider.name}>
                    <div className="card-models-provider">{provider.name}</div>
                    {provider.options.map(({ info, covered }) => {
                        const partial = covered !== undefined && resorts !== undefined && covered < resorts
                            ? interpolate(t('cardModels.covers'), { covered, total: resorts })
                            : null;
                        return (
                            <button
                                key={info.id}
                                className={`card-models-option ${selected === info.id ? 'selected' : ''}`}
                                aria-pressed={selected === info.id}
                                onClick={() => onPick(info.id)}
                            >
                                <span className="card-models-option-name">{info.name}</span>
                                <span className="card-models-option-detail">
                                    {[info.description, info.resolution, partial].filter(Boolean).join(' · ')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

interface CountryRowProps {
    country: Country;
    chosen: WeatherModel | undefined;
    isExpanded: boolean;
    onToggle: () => void;
    onPick: (model: WeatherModel | null) => void;
}

function CountryRow({ country, chosen, isExpanded, onToggle, onPick }: CountryRowProps): JSX.Element {
    const { t } = useLanguage();
    const autoLabel = interpolate(t('cardModels.auto'), { model: labelOf(recommendedCardModel(country.code)) });
    return (
        <div className={`card-models-country ${isExpanded ? 'expanded' : ''}`}>
            <button className="card-models-row" aria-expanded={isExpanded} onClick={onToggle}>
                <span className="card-models-row-name">{country.name}</span>
                <span className={`card-models-row-value ${chosen ? 'chosen' : ''}`}>
                    {chosen ? labelOf(chosen) : autoLabel}
                </span>
            </button>
            {isExpanded && (
                <ModelOptions
                    providers={countryModelOptions(country.code)}
                    onPick={onPick}
                    autoLabel={autoLabel}
                    selected={chosen ?? null}
                    resorts={country.resorts}
                />
            )}
        </div>
    );
}

export interface CardModelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedResorts: string[];
}

/**
 * Card models by country: a Country model for any country, or Auto for its
 * Recommended card model (docs/adr/0006).
 */
export const CardModelsModal = memo(function CardModelsModal({ isOpen, onClose, selectedResorts }: CardModelsModalProps): JSX.Element | null {
    const { t } = useLanguage();
    const countryModels = useCountryModels();
    const summary = useCardModelsSummary();
    const [search, setSearch] = useState('');
    // One list open at a time: "everywhere", or "<group>:<country code>"
    const [expanded, setExpanded] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Start each opening fresh; focus the search unless that would open a phone's keyboard
    useEffect(() => {
        if (!isOpen) return;
        setSearch('');
        setExpanded(null);
        if (shouldAutoFocusSearch()) inputRef.current?.focus();
    }, [isOpen]);

    // Lock page scroll while open, and close on Esc
    useOverlay(isOpen, onClose);

    // The countries of the Selection's Resorts and Saved locations
    const selectionCountries = useMemo(() => {
        const codes = new Set(selectedResorts.map((id) => RESORT_LOCATIONS.get(id)?.country ?? getSavedLocation(id)?.country));
        return ALL_COUNTRIES.filter((country) => codes.has(country.code));
    }, [selectedResorts]);

    if (!isOpen) return null;

    const query = search.trim().toLowerCase();
    const matches = (country: Country) =>
        !query || country.name.toLowerCase().includes(query) || country.code.toLowerCase() === query;
    const groups = [
        { key: 'selection', name: t('cardModels.yourSelection'), countries: selectionCountries.filter(matches) },
        ...CONTINENTS.map((continent) => ({
            key: continent.name,
            name: continent.name,
            countries: continent.countries.filter(matches),
        })),
    ].filter((group) => group.countries.length > 0);

    const toggle = (key: string) => setExpanded((current) => (current === key ? null : key));

    return (
        <div className="command-palette-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="command-palette resort-grid-modal">
                <div className="resort-grid-header">
                    <div className="command-input-wrapper">
                        <input
                            ref={inputRef}
                            type="text"
                            className="command-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('cardModels.search')}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                    <button className="resort-grid-close-btn" onClick={onClose} aria-label="Close">
                        <Icon icon={icons.close} />
                    </button>
                </div>

                <div className="resort-grid-content">
                    <div className="card-models-group card-models-everywhere">
                        <button className="card-models-row" aria-expanded={expanded === 'everywhere'} onClick={() => toggle('everywhere')}>
                            <span className="card-models-row-name">{t('cardModels.everywhere')}</span>
                        </button>
                        {expanded === 'everywhere' && (
                            <ModelOptions
                                providers={everywhereModelOptions()}
                                onPick={(model) => {
                                    if (model) setEveryCountryModel(model);
                                    setExpanded(null);
                                }}
                            />
                        )}
                    </div>

                    {groups.length === 0 ? (
                        <div className="resort-grid-empty">{t('cardModels.noCountries')}</div>
                    ) : (
                        <div className="resort-grid-columns">
                            {groups.map((group) => (
                                <section key={group.key} className="card-models-group">
                                    <h3 className="card-models-group-name">{group.name}</h3>
                                    {group.countries.map((country) => {
                                        const key = `${group.key}:${country.code}`;
                                        return (
                                            <CountryRow
                                                key={key}
                                                country={country}
                                                chosen={countryModels[country.code]}
                                                isExpanded={expanded === key}
                                                onToggle={() => toggle(key)}
                                                onPick={(model) => {
                                                    setCountryModel(country.code, model);
                                                    setExpanded(null);
                                                }}
                                            />
                                        );
                                    })}
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                <div className="command-palette-footer">
                    <span className="command-hint">
                        <kbd>esc</kbd> close
                    </span>
                    {Object.keys(countryModels).length > 0 && (
                        <button className="resort-grid-clear-btn" onClick={resetCountryModels}>
                            {t('cardModels.resetAll')}
                        </button>
                    )}
                    <span className="resort-selection-count">{summary}</span>
                </div>
            </div>
        </div>
    );
});
