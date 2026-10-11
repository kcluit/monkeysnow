/**
 * Detail Chart Grid Component
 *
 * Renders a column of weather charts for selected variables, reordered by dragging the grip in a chart's header.
 */

import { useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { WeatherChart, type WeatherChartComponentProps } from './WeatherChart';
import type { DetailChartGridProps } from '../../types/detailView';
import type { WeatherVariable } from '../../types/openMeteo';

/** One chart in the column, moved by dragging the grip in its header */
function SortableWeatherChart(props: Omit<WeatherChartComponentProps, 'dragHandle'>): JSX.Element {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.variable });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={isDragging ? 'weather-chart-dragging' : undefined}
        >
            <WeatherChart
                {...props}
                dragHandle={
                    <button
                        ref={setActivatorNodeRef}
                        type="button"
                        className="weather-chart-drag-handle"
                        title="Drag to reorder"
                        {...attributes}
                        {...listeners}
                        aria-label="Drag to reorder"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="4" r="1.5" />
                            <circle cx="11" cy="4" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="12" r="1.5" />
                            <circle cx="11" cy="12" r="1.5" />
                        </svg>
                    </button>
                }
            />
        </div>
    );
}

export function DetailChartGrid({
    data,
    timeAxis,
    comparisonModels,
    selectedVariables,
    onReorderVariables,
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
    // A mouse drags once it moves 8px; a finger holds the grip still first, so swiping across it still scrolls
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = selectedVariables.indexOf(active.id as WeatherVariable);
        const to = selectedVariables.indexOf(over.id as WeatherVariable);
        if (from === -1 || to === -1) return;
        onReorderVariables(arrayMove(selectedVariables, from, to));
    }, [selectedVariables, onReorderVariables]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext items={selectedVariables} strategy={verticalListSortingStrategy}>
                <div className="detail-chart-grid">
                    {selectedVariables.map((variable) => (
                        <SortableWeatherChart
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
            </SortableContext>
        </DndContext>
    );
}
