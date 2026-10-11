/**
 * The Model styles tab of a chart's gear modal, and all of ModelStylesModal: a row for every
 * Forecast model and Aggregation, showing a sample of its line, that opens an editor for its
 * Model style. Selected models and Selected Aggregations come first and the rest are folded
 * away, so they can be styled before they're picked; the Spread fills and hiding the model
 * lines close the list. Its changes reach every chart.
 */

import { Fragment, useState, type ReactNode } from 'react';
import { aggregationOptions, getModelInfo, inCatalogueOrder, isKnownModel, modelProviders } from '../../data/modelHierarchy';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
import { useOverlay } from '../../hooks/useOverlay';
import {
    COLOR_PRESETS,
    DEFAULT_MODEL_STYLES,
    OPACITY_CHOICES,
    aggregationColor,
    modelColor,
    originalAggregationColor,
    originalModelColor,
    type LineStyle,
    type ModelStyles,
} from '../../utils/modelStyles';
import { getUnavailableReason } from '../../utils/comparisonModels';
import { matchesSearchWords, normalizeForSearch, toSearchWords } from '../../utils/resortSearch';
import type { ModelAvailabilityContext } from '../../types/detailView';
import type { AggregationType, WeatherModel } from '../../types/openMeteo';

interface ModelStylesTabProps {
    /** The styles being edited, saved when the modal closes */
    styles: ModelStyles;
    onChange: (styles: ModelStyles) => void;
    selectedModels: WeatherModel[];
    selectedAggregations: AggregationType[];
    /** Which models are drawn at the point being forecast; left out where there is no chart */
    modelAvailability?: ModelAvailabilityContext;
}

/** The editor that "Set all…" opens, which shares the one-open-at-a-time rule with the rows */
const ALL_SELECTED_MODELS = 'all';

// Each Forecast model's Provider, so the filter finds a model by its Provider's name too
const PROVIDER_NAMES = new Map(
    modelProviders.flatMap((provider) => provider.models.map((model): [WeatherModel, string] => [model.id, provider.name]))
);

/** One line's style with anything left at its default removed, or null when nothing is left. */
function cleanStyle(style: LineStyle): LineStyle | null {
    const clean: LineStyle = {};
    if (style.color !== undefined) clean.color = style.color;
    if (style.bold) clean.bold = true;
    if (style.opacity !== undefined) clean.opacity = style.opacity;
    return Object.keys(clean).length > 0 ? clean : null;
}

function withStyle<K extends string>(
    styles: Partial<Record<K, LineStyle>>,
    key: K,
    style: LineStyle
): Partial<Record<K, LineStyle>> {
    const next = { ...styles };
    const clean = cleanStyle(style);
    if (clean) next[key] = clean;
    else delete next[key];
    return next;
}

const percent = (opacity: number): string => `${Math.round(opacity * 100)}%`;

/**
 * Reset to default, for the footer of a modal showing this tab. Closing the modal saves,
 * so nothing could undo a reset: it asks first.
 */
export function ResetModelStyles({ onChange }: { onChange: (styles: ModelStyles) => void }): JSX.Element {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <div className="chart-settings-footer-start">
                <button type="button" className="chart-settings-btn cancel" onClick={() => setConfirming(true)}>
                    Reset to default
                </button>
            </div>
        );
    }

    return (
        <div className="chart-settings-footer-start" role="group" aria-label="Reset to default">
            <span className="chart-settings-footer-question">Reset every Model style?</span>
            <button
                type="button"
                className="chart-settings-btn apply"
                onClick={() => {
                    onChange(DEFAULT_MODEL_STYLES);
                    setConfirming(false);
                }}
            >
                Yes
            </button>
            <button type="button" className="chart-settings-btn cancel" onClick={() => setConfirming(false)}>
                No
            </button>
        </div>
    );
}

/** The swatches for one line's colour: its original, the presets, and any colour at all. */
function ColorChoices({ color, original, onPick }: {
    color: string;
    original: string;
    /** Called with undefined for the original colour */
    onPick: (color: string | undefined) => void;
}): JSX.Element {
    const isCustom = color !== original && !COLOR_PRESETS.includes(color);
    return (
        <div className="model-style-colors">
            <button
                type="button"
                className={`model-color-swatch model-color-original${color === original ? ' selected' : ''}`}
                style={{ backgroundColor: original }}
                title="Original colour"
                aria-label="Original colour"
                onClick={() => onPick(undefined)}
            />
            {COLOR_PRESETS.filter((preset) => preset !== original).map((preset) => (
                <button
                    key={preset}
                    type="button"
                    className={`model-color-swatch${color === preset ? ' selected' : ''}`}
                    style={{ backgroundColor: preset }}
                    aria-label={preset}
                    onClick={() => onPick(preset)}
                />
            ))}
            <label
                className={`model-color-swatch model-color-custom${isCustom ? ' selected' : ''}`}
                style={isCustom ? { background: color } : undefined}
                title="Custom colour…"
            >
                <input
                    type="color"
                    value={color}
                    aria-label="Custom colour"
                    onChange={(e) => onPick(e.target.value.toLowerCase())}
                />
            </label>
        </div>
    );
}

/** A chip for every opacity, Auto first for models; none is lit when several lines differ. */
function OpacityChips({ opacity, allowAuto, onPick }: {
    /** undefined for Auto, null when several lines differ */
    opacity: number | undefined | null;
    allowAuto: boolean;
    onPick: (opacity: number | undefined) => void;
}): JSX.Element {
    const choices: (number | undefined)[] = allowAuto ? [undefined, ...OPACITY_CHOICES] : [...OPACITY_CHOICES];
    return (
        <div className="model-style-chips" role="radiogroup" aria-label="Opacity">
            {choices.map((choice) => (
                <button
                    key={choice ?? 'auto'}
                    type="button"
                    role="radio"
                    aria-checked={opacity === choice}
                    className={`model-style-chip${opacity === choice ? ' selected' : ''}`}
                    onClick={() => onPick(choice)}
                >
                    {choice === undefined ? 'Auto' : percent(choice)}
                </button>
            ))}
        </div>
    );
}

/** The Settings page's on/off switch; its knob sits in the middle when several lines differ. */
function SwitchKnob({ on }: { on: boolean | 'mixed' }): JSX.Element {
    return (
        <span className={`settings-toggle-switch${on === true ? ' on' : on === 'mixed' ? ' mixed' : ''}`}>
            <span className="settings-toggle-knob" />
        </span>
    );
}

function BoldSwitch({ bold, onChange }: { bold: boolean | 'mixed'; onChange: (bold: boolean) => void }): JSX.Element {
    return (
        <button
            type="button"
            className="model-style-bold-switch"
            aria-label="Bold"
            aria-pressed={bold}
            onClick={() => onChange(bold !== true)}
        >
            <SwitchKnob on={bold} />
        </button>
    );
}

/** One labelled control in an editor: the label beside it, or above it on phones. */
function EditorField({ label, children }: { label: string; children: ReactNode }): JSX.Element {
    return (
        <div className="model-style-field">
            <span className="model-style-field-label">{label}</span>
            <div className="model-style-field-control">{children}</div>
        </div>
    );
}

/** One Forecast model's or Aggregation's row: a sample of its line, and its editor while open. */
function LineRow({ name, note, color, original, style, allowAuto, isOpen, onToggle, onChange }: {
    name: string;
    /** Why it isn't drawn here, which greys the row; it can still be styled */
    note: string | null;
    color: string;
    original: string;
    style: LineStyle | undefined;
    /** Models can be on Auto; an Aggregation's opacity defaults to 100% */
    allowAuto: boolean;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (style: LineStyle) => void;
}): JSX.Element {
    const current = style ?? {};
    // For an Aggregation, 100% is its default and stored as nothing
    const opacity = current.opacity ?? (allowAuto ? undefined : 1);
    // Auto's fade depends on the chart, so a model's sample is drawn solid and says which it is
    const tag = opacity === undefined ? 'Auto' : allowAuto || opacity !== 1 ? percent(opacity) : null;

    return (
        <div className={`model-style-row${note ? ' unavailable' : ''}${isOpen ? ' open' : ''}`}>
            <button type="button" className="model-style-summary" aria-expanded={isOpen} onClick={onToggle}>
                <span className="model-style-color-dot" style={{ backgroundColor: color }} />
                <span className="model-style-name">
                    <span>{name}</span>
                    {note && <span className="model-style-note">{note}</span>}
                </span>
                <span className="model-style-sample" aria-hidden="true">
                    <span
                        className={current.bold ? 'bold' : undefined}
                        style={{ backgroundColor: color, opacity: opacity ?? 1 }}
                    />
                </span>
                <span className="model-style-tag">{tag}</span>
                <span className={`model-style-changed${style ? ' on' : ''}`} title={style ? 'Changed' : undefined} />
            </button>
            {isOpen && (
                <div className="model-style-editor">
                    <EditorField label="Colour">
                        <ColorChoices
                            color={color}
                            original={original}
                            onPick={(picked) => onChange({ ...current, color: picked === original ? undefined : picked })}
                        />
                    </EditorField>
                    <EditorField label="Opacity">
                        <OpacityChips
                            opacity={opacity}
                            allowAuto={allowAuto}
                            onPick={(next) => onChange({ ...current, opacity: !allowAuto && next === 1 ? undefined : next })}
                        />
                    </EditorField>
                    <EditorField label="Bold">
                        <BoldSwitch bold={!!current.bold} onChange={(bold) => onChange({ ...current, bold })} />
                    </EditorField>
                    <button type="button" className="model-style-reset" disabled={!style} onClick={() => onChange({})}>
                        <Icon icon={icons.reset} />
                        Reset line
                    </button>
                </div>
            )}
        </div>
    );
}

/** A heading that folds what's under it, with how many lines it holds and how many are changed. */
function FoldTitle({ label, count, changed, isOpen, disabled, onToggle }: {
    label: string;
    count: number;
    changed: number;
    isOpen: boolean;
    /** While filtering, every fold stays open */
    disabled: boolean;
    onToggle: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            className="model-styles-fold"
            aria-expanded={isOpen}
            disabled={disabled}
            onClick={onToggle}
        >
            <Icon icon={isOpen ? icons.caretDown : icons.caretRight} />
            {label} ({count})
            {changed > 0 && <span className="model-styles-fold-changed">· {changed} changed</span>}
        </button>
    );
}

/** One of the switches that end the list, with what it needs when that isn't there. */
function Toggle({ label, title, needs, checked, onChange }: {
    label: string;
    /** What it does, on hover */
    title: string;
    /** What has to be selected for it to show anything, when that isn't */
    needs: string | null;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): JSX.Element {
    return (
        <button
            type="button"
            className="model-style-switch"
            title={title}
            aria-pressed={checked}
            onClick={() => onChange(!checked)}
        >
            <span className="model-style-switch-text">
                <span className="model-style-switch-label">{label}</span>
                {needs && <span className="model-style-note">{needs}</span>}
            </span>
            <SwitchKnob on={checked} />
        </button>
    );
}

export function ModelStylesTab({
    styles,
    onChange,
    selectedModels,
    selectedAggregations,
    modelAvailability,
}: ModelStylesTabProps): JSX.Element {
    const [openLine, setOpenLine] = useState<string | null>(null);
    const [showOtherModels, setShowOtherModels] = useState(false);
    const [showOtherAggregations, setShowOtherAggregations] = useState(false);
    const [filter, setFilter] = useState('');

    // An open editor takes Esc before the modal does
    useOverlay(openLine !== null, () => setOpenLine(null));
    const toggleLine = (key: string) => setOpenLine(openLine === key ? null : key);
    // Filtering or folding can hide the open editor's row, so either closes it
    const changeFilter = (next: string) => {
        setFilter(next);
        setOpenLine(null);
    };
    const toggleFold = (setShow: (show: boolean) => void, show: boolean) => {
        setShow(!show);
        setOpenLine(null);
    };

    const words = toSearchWords(filter);
    const isFiltering = words.length > 0;
    const matches = (text: string) => !isFiltering || matchesSearchWords(normalizeForSearch(text), words);
    const modelMatches = (model: WeatherModel) =>
        matches(`${getModelInfo(model)?.label ?? model} ${PROVIDER_NAMES.get(model) ?? ''}`);

    const models = inCatalogueOrder(selectedModels.filter(isKnownModel));
    const shownModels = models.filter(modelMatches);

    // Every Forecast model that isn't a Selected model, by Provider, so it is styled before it's picked
    const otherModelsByProvider = modelProviders
        .map((provider) => ({
            provider,
            others: provider.models.map((model) => model.id).filter((id) => !models.includes(id)),
        }))
        .filter(({ others }) => others.length > 0);
    const otherModels = otherModelsByProvider.flatMap(({ others }) => others);
    const shownOtherModelsByProvider = otherModelsByProvider
        .map(({ provider, others }) => ({ provider, others: others.filter(modelMatches) }))
        .filter(({ others }) => others.length > 0);
    const isOtherModelsOpen = isFiltering || showOtherModels;

    const aggregations = aggregationOptions.filter(({ id }) => selectedAggregations.includes(id));
    const otherAggregations = aggregationOptions.filter(({ id }) => !selectedAggregations.includes(id));
    const shownAggregations = aggregations.filter(({ name }) => matches(name));
    const shownOtherAggregations = otherAggregations.filter(({ name }) => matches(name));
    const isOtherAggregationsOpen = isFiltering || showOtherAggregations;

    const nothingMatches = isFiltering && shownModels.length + shownOtherModelsByProvider.length
        + shownAggregations.length + shownOtherAggregations.length === 0;

    // "Set all…" shows what the Selected models share, and sets it on each of them
    const boldCount = models.filter((model) => styles.models[model]?.bold).length;
    const allBold = boldCount === 0 ? false : boldCount === models.length ? true : 'mixed';
    const opacities = new Set(models.map((model) => styles.models[model]?.opacity));
    const sharedOpacity = opacities.size <= 1 ? [...opacities][0] : null;
    const setOnAllModels = (change: LineStyle) => {
        let next = styles.models;
        for (const model of models) next = withStyle(next, model, { ...styles.models[model], ...change });
        onChange({ ...styles, models: next });
    };

    const modelRow = (model: WeatherModel, note: string | null) => {
        const key = `model:${model}`;
        return (
            <LineRow
                key={key}
                name={getModelInfo(model)?.label ?? model}
                note={note}
                color={modelColor(styles, model)}
                original={originalModelColor(model)}
                style={styles.models[model]}
                allowAuto
                isOpen={openLine === key}
                onToggle={() => toggleLine(key)}
                onChange={(style) => onChange({ ...styles, models: withStyle(styles.models, model, style) })}
            />
        );
    };

    const aggregationRow = (id: AggregationType, name: string) => {
        const key = `aggregation:${id}`;
        return (
            <LineRow
                key={key}
                name={name}
                note={null}
                color={aggregationColor(styles, id)}
                original={originalAggregationColor(id)}
                style={styles.aggregations[id]}
                allowAuto={false}
                isOpen={openLine === key}
                onToggle={() => toggleLine(key)}
                onChange={(style) => onChange({ ...styles, aggregations: withStyle(styles.aggregations, id, style) })}
            />
        );
    };

    const hasPair = (a: AggregationType, b: AggregationType) =>
        selectedAggregations.includes(a) && selectedAggregations.includes(b);

    return (
        <>
            <p className="model-styles-intro">These apply to every chart, for every resort.</p>

            <div className="model-styles-filter">
                <input
                    type="search"
                    className="model-styles-filter-input"
                    value={filter}
                    placeholder="Filter lines…"
                    aria-label="Filter lines"
                    onChange={(e) => changeFilter(e.target.value)}
                />
            </div>

            {nothingMatches && <p className="model-styles-intro">No lines match.</p>}

            {(!isFiltering || shownModels.length > 0) && (
                <div className="chart-settings-section">
                    <div className="model-styles-heading">
                        <h3 className="chart-settings-section-title">Selected models</h3>
                        {!isFiltering && models.length > 1 && (
                            <button
                                type="button"
                                className="model-styles-set-all"
                                aria-expanded={openLine === ALL_SELECTED_MODELS}
                                onClick={() => toggleLine(ALL_SELECTED_MODELS)}
                            >
                                Set all…
                            </button>
                        )}
                    </div>
                    {openLine === ALL_SELECTED_MODELS && (
                        <div className="model-style-editor model-style-all-editor">
                            <EditorField label="Opacity">
                                <OpacityChips
                                    opacity={sharedOpacity}
                                    allowAuto
                                    onPick={(opacity) => setOnAllModels({ opacity })}
                                />
                            </EditorField>
                            <EditorField label="Bold">
                                <BoldSwitch bold={allBold} onChange={(bold) => setOnAllModels({ bold })} />
                            </EditorField>
                        </div>
                    )}
                    {models.length === 0 ? (
                        <p className="model-styles-intro">No models selected yet.</p>
                    ) : (
                        <div className="model-style-list">
                            {shownModels.map((model) =>
                                modelRow(model, modelAvailability ? getUnavailableReason(model, modelAvailability) : null)
                            )}
                        </div>
                    )}
                </div>
            )}

            {otherModels.length > 0 && (!isFiltering || shownOtherModelsByProvider.length > 0) && (
                <div className="chart-settings-section">
                    <h3 className="chart-settings-section-title">
                        <FoldTitle
                            label="Other models"
                            count={otherModels.length}
                            changed={otherModels.filter((model) => styles.models[model]).length}
                            isOpen={isOtherModelsOpen}
                            disabled={isFiltering}
                            onToggle={() => toggleFold(setShowOtherModels, showOtherModels)}
                        />
                    </h3>
                    {isOtherModelsOpen && (
                        <div className="model-style-list">
                            {shownOtherModelsByProvider.map(({ provider, others }) => (
                                <Fragment key={provider.id}>
                                    <h4 className="model-style-provider">{provider.name}</h4>
                                    {others.map((model) => modelRow(model, null))}
                                </Fragment>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {(!isFiltering || shownAggregations.length + shownOtherAggregations.length > 0) && (
                <div className="chart-settings-section">
                    <h3 className="chart-settings-section-title">Aggregations</h3>
                    {!isFiltering && aggregations.length === 0 && (
                        <p className="model-styles-intro">None selected. Select them in the model picker.</p>
                    )}
                    {shownAggregations.length > 0 && (
                        <div className="model-style-list">
                            {shownAggregations.map(({ id, name }) => aggregationRow(id, name))}
                        </div>
                    )}
                    {otherAggregations.length > 0 && (!isFiltering || shownOtherAggregations.length > 0) && (
                        <>
                            <h4 className="model-style-provider">
                                <FoldTitle
                                    label="Other Aggregations"
                                    count={otherAggregations.length}
                                    changed={otherAggregations.filter(({ id }) => styles.aggregations[id]).length}
                                    isOpen={isOtherAggregationsOpen}
                                    disabled={isFiltering}
                                    onToggle={() => toggleFold(setShowOtherAggregations, showOtherAggregations)}
                                />
                            </h4>
                            {isOtherAggregationsOpen && (
                                <div className="model-style-list">
                                    {shownOtherAggregations.map(({ id, name }) => aggregationRow(id, name))}
                                </div>
                            )}
                        </>
                    )}
                    {!isFiltering && (
                        <div className="model-style-switches">
                            <Toggle
                                label="Min–max spread"
                                title="Shades between the Min and Max lines"
                                needs={hasPair('min', 'max') ? null : 'Needs Min and Max selected'}
                                checked={styles.showMinMaxFill}
                                onChange={(showMinMaxFill) => onChange({ ...styles, showMinMaxFill })}
                            />
                            <Toggle
                                label="25th–75th spread"
                                title="Shades between the 25th and 75th percentile lines"
                                needs={hasPair('p25', 'p75') ? null : 'Needs 25th and 75th Percentile selected'}
                                checked={styles.showPercentileFill}
                                onChange={(showPercentileFill) => onChange({ ...styles, showPercentileFill })}
                            />
                            <Toggle
                                label="Hide model lines"
                                title="While Aggregations are drawn, show only them"
                                needs={selectedAggregations.length > 0 ? null : 'Needs an Aggregation selected'}
                                checked={styles.hideModelLines}
                                onChange={(hideModelLines) => onChange({ ...styles, hideModelLines })}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
