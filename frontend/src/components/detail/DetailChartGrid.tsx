/**
 * Detail Chart Grid Component
 *
 * Renders a grid of weather charts for selected variables.
 */

import { WeatherChart } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';



export function DetailChartGrid({
    data,
    timeAxis,
    comparisonModels,
    selectedVariables,
    selectedAggregations,
    selectedModels,
    modelAvailability,
    openSettings,
    onOpenSettings,
    onCloseSettings,
    unitSystem,
    isChartLocked,
    isLoading,
    onToggleVariable,
    location,
}: DetailChartGridProps): JSX.Element {

    return (
        <div className="detail-chart-grid">
            {selectedVariables.map((variable) => (
                <WeatherChart
                    key={variable}
                    data={data}
                    timeAxis={timeAxis}
                    comparisonModels={comparisonModels}
                    selectedAggregations={selectedAggregations}
                    variable={variable}
                    unitSystem={unitSystem}
                    isChartLocked={isChartLocked}
                    isLoading={isLoading}
                    onToggleVisibility={
                        onToggleVariable ? () => onToggleVariable(variable) : undefined
                    }
                    location={location}
                    selectedModels={selectedModels}
                    modelAvailability={modelAvailability}
                    isSettingsOpen={openSettings?.variable === variable}
                    settingsTab={openSettings?.variable === variable ? openSettings.tab : undefined}
                    onOpenSettings={() => onOpenSettings(variable)}
                    onCloseSettings={onCloseSettings}
                />
            ))}
        </div>
    );
}
