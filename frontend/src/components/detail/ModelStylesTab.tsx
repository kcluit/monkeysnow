/**
 * The Model styles tab of a chart's gear modal: the Model style of every Forecast model
 * (Selected models first, the rest folded away) and Aggregation, the band fills, and
 * hiding the model lines. Its changes reach every chart.
 */

import { Fragment, useState } from 'react';
import { aggregationOptions, getModelInfo, inCatalogueOrder, isKnownModel, modelProviders } from '../../data/modelHierarchy';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';
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
    onPick: (color: string | undefined, done: boolean) => void;
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
                onClick={() => onPick(undefined, true)}
            />
            {COLOR_PRESETS.filter((preset) => preset !== original).map((preset) => (
                <button
                    key={preset}
                    type="button"
                    className={`model-color-swatch${color === preset ? ' selected' : ''}`}
                    style={{ backgroundColor: preset }}
                    aria-label={preset}
                    onClick={() => onPick(preset, true)}
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
                    // Fires while dragging in the browser's picker, so the swatches stay open
                    onChange={(e) => onPick(e.target.value.toLowerCase(), false)}
                />
            </label>
        </div>
    );
}

/** Bold toggle and opacity menu, shared by the line rows and the "All models" row. */
function StyleControls({ bold, opacity, allowAuto, onBoldChange, onOpacityChange }: {
    /** 'mixed' when some of several lines are bold */
    bold: boolean | 'mixed';
    /** undefined for Auto, null when several lines differ */
    opacity: number | undefined | null;
    allowAuto: boolean;
    onBoldChange: (bold: boolean) => void;
    onOpacityChange: (opacity: number | undefined) => void;
}): JSX.Element {
    const value = opacity === null ? 'mixed' : opacity === undefined ? 'auto' : String(opacity);
    return (
        <>
            <button
                type="button"
                className={`model-style-bold${bold === true ? ' active' : bold === 'mixed' ? ' mixed' : ''}`}
                aria-pressed={bold === 'mixed' ? 'mixed' : bold}
                title="Bold"
                onClick={() => onBoldChange(bold !== true)}
            >
                B
            </button>
            <select
                className="model-style-opacity"
                value={value}
                aria-label="Opacity"
                onChange={(e) => onOpacityChange(e.target.value === 'auto' ? undefined : Number(e.target.value))}
            >
                {opacity === null && <option value="mixed" disabled hidden>Mixed</option>}
                {allowAuto && <option value="auto">Auto</option>}
                {OPACITY_CHOICES.map((choice) => (
                    <option key={choice} value={String(choice)}>{percent(choice)}</option>
                ))}
            </select>
        </>
    );
}

/** One Forecast model's or Aggregation's row. */
function LineStyleRow({ name, note, color, original, style, allowAuto, onChange }: {
    name: string;
    /** Why it isn't drawn here, which greys the row; it can still be styled */
    note: string | null;
    color: string;
    original: string;
    style: LineStyle | undefined;
    /** Models can be on Auto; an Aggregation's opacity defaults to 100% */
    allowAuto: boolean;
    onChange: (style: LineStyle) => void;
}): JSX.Element {
    const [isPicking, setIsPicking] = useState(false);
    const current = style ?? {};
    // For an Aggregation, 100% is its default and stored as nothing
    const opacity = current.opacity ?? (allowAuto ? undefined : 1);

    return (
        <div className={`model-style-row${note ? ' unavailable' : ''}`}>
            <div className="model-style-main">
                <button
                    type="button"
                    className={`model-style-color${isPicking ? ' open' : ''}`}
                    title={`Change colour of ${name}`}
                    aria-label={`Change colour of ${name}`}
                    aria-expanded={isPicking}
                    onClick={() => setIsPicking(!isPicking)}
                >
                    <span className="model-style-color-dot" style={{ backgroundColor: color }} />
                    <span className="model-style-color-caret"><Icon icon={icons.caretDown} /></span>
                </button>
                <span className="model-style-name">
                    <span className={current.bold ? 'model-style-name-bold' : undefined}>{name}</span>
                    {note && <span className="model-style-note">{note}</span>}
                </span>
                <StyleControls
                    bold={!!current.bold}
                    opacity={opacity}
                    allowAuto={allowAuto}
                    onBoldChange={(bold) => onChange({ ...current, bold })}
                    onOpacityChange={(next) => onChange({ ...current, opacity: !allowAuto && next === 1 ? undefined : next })}
                />
            </div>
            {isPicking && (
                <ColorChoices
                    color={color}
                    original={original}
                    onPick={(picked, done) => {
                        onChange({ ...current, color: picked === original ? undefined : picked });
                        if (done) setIsPicking(false);
                    }}
                />
            )}
        </div>
    );
}

function Toggle({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}): JSX.Element {
    return (
        <label className="chart-settings-toggle">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="chart-settings-toggle-label">{label}</span>
            <span className="chart-settings-toggle-desc">{description}</span>
        </label>
    );
}

export function ModelStylesTab({
    styles,
    onChange,
    selectedModels,
    selectedAggregations,
    modelAvailability,
}: ModelStylesTabProps): JSX.Element {
    const [showOtherModels, setShowOtherModels] = useState(false);
    const models = inCatalogueOrder(selectedModels.filter(isKnownModel));

    // Every Forecast model that isn't a Selected model, by Provider, so it is styled before it's picked
    const otherModelsByProvider = modelProviders
        .map((provider) => ({
            provider,
            others: provider.models.map((model) => model.id).filter((id) => !models.includes(id)),
        }))
        .filter(({ others }) => others.length > 0);
    const otherModelCount = otherModelsByProvider.reduce((count, { others }) => count + others.length, 0);

    // The "All selected models" row shows what they share, and sets it on each of them
    const boldCount = models.filter((model) => styles.models[model]?.bold).length;
    const allBold = boldCount === 0 ? false : boldCount === models.length ? true : 'mixed';
    const opacities = new Set(models.map((model) => styles.models[model]?.opacity));
    const sharedOpacity = opacities.size <= 1 ? [...opacities][0] : null;
    const setOnAllModels = (change: LineStyle) => {
        let next = styles.models;
        for (const model of models) next = withStyle(next, model, { ...styles.models[model], ...change });
        onChange({ ...styles, models: next });
    };

    const modelRow = (model: WeatherModel, note: string | null) => (
        <LineStyleRow
            key={model}
            name={getModelInfo(model)?.label ?? model}
            note={note}
            color={modelColor(styles, model)}
            original={originalModelColor(model)}
            style={styles.models[model]}
            allowAuto
            onChange={(style) => onChange({ ...styles, models: withStyle(styles.models, model, style) })}
        />
    );

    const hasPair = (a: AggregationType, b: AggregationType) =>
        selectedAggregations.includes(a) && selectedAggregations.includes(b);

    return (
        <>
            <p className="model-styles-intro">These apply to every chart, for every resort.</p>

            <div className="chart-settings-section">
                <h3 className="chart-settings-section-title">Selected models</h3>
                {models.length === 0 ? (
                    <p className="model-styles-intro">No models selected yet.</p>
                ) : (
                    <div className="model-style-grid">
                        <div className="model-style-row model-style-all">
                            <div className="model-style-main">
                                <span className="model-style-color-placeholder" />
                                <span className="model-style-name">All selected models</span>
                                <StyleControls
                                    bold={allBold}
                                    opacity={sharedOpacity}
                                    allowAuto
                                    onBoldChange={(bold) => setOnAllModels({ bold })}
                                    onOpacityChange={(opacity) => setOnAllModels({ opacity })}
                                />
                            </div>
                        </div>
                        {models.map((model) =>
                            modelRow(model, modelAvailability ? getUnavailableReason(model, modelAvailability) : null)
                        )}
                    </div>
                )}
            </div>

            {otherModelCount > 0 && (
                <div className="chart-settings-section">
                    <h3 className="chart-settings-section-title">
                        <button
                            type="button"
                            className="model-styles-fold"
                            aria-expanded={showOtherModels}
                            onClick={() => setShowOtherModels(!showOtherModels)}
                        >
                            <Icon icon={showOtherModels ? icons.caretDown : icons.caretRight} />
                            Other models ({otherModelCount})
                        </button>
                    </h3>
                    {showOtherModels && (
                        <div className="model-style-grid">
                            {otherModelsByProvider.map(({ provider, others }) => (
                                <Fragment key={provider.id}>
                                    <h4 className="model-style-provider">{provider.name}</h4>
                                    {others.map((model) => modelRow(model, null))}
                                </Fragment>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="chart-settings-section">
                <h3 className="chart-settings-section-title">Aggregations</h3>
                <div className="model-style-grid">
                    {aggregationOptions.map(({ id, name }) => (
                        <LineStyleRow
                            key={id}
                            name={name}
                            note={selectedAggregations.includes(id) ? null : 'Not picked'}
                            color={aggregationColor(styles, id)}
                            original={originalAggregationColor(id)}
                            style={styles.aggregations[id]}
                            allowAuto={false}
                            onChange={(style) => onChange({ ...styles, aggregations: withStyle(styles.aggregations, id, style) })}
                        />
                    ))}
                </div>
            </div>

            <div className="chart-settings-section">
                <h3 className="chart-settings-section-title">With Aggregations</h3>
                <div className="model-style-grid">
                    <Toggle
                        label="Min-max fill"
                        description={hasPair('min', 'max') ? 'Shades between the Min and Max lines' : 'Needs Min and Max picked'}
                        checked={styles.showMinMaxFill}
                        onChange={(showMinMaxFill) => onChange({ ...styles, showMinMaxFill })}
                    />
                    <Toggle
                        label="25th-75th fill"
                        description={hasPair('p25', 'p75') ? 'Shades between the 25th and 75th percentile lines' : 'Needs 25th and 75th Percentile picked'}
                        checked={styles.showPercentileFill}
                        onChange={(showPercentileFill) => onChange({ ...styles, showPercentileFill })}
                    />
                    <Toggle
                        label="Hide individual model lines"
                        description="While Aggregations are drawn, show only them"
                        checked={styles.hideModelLines}
                        onChange={(hideModelLines) => onChange({ ...styles, hideModelLines })}
                    />
                </div>
            </div>
        </>
    );
}
