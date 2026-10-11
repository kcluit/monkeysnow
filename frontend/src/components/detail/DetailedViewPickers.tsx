/**
 * The Detailed view's Models and Charts pickers on their own, for the Settings page and the
 * command palette: open while mounted, and closing them, however they're closed, saves and
 * calls onClose. On the Detailed view the palette opens the view's own Models picker instead,
 * which also shows which models cover the point being forecast.
 */

import { useEffect, useRef } from 'react';
import { useSelectedModels, useSelectedAggregations } from '../../hooks/useSelectedModels';
import { useModelHierarchy } from '../../hooks/useModelHierarchy';
import { useShownCharts } from '../../hooks/useDetailedViewSettings';
import { useVariableSelection } from '../../hooks/useVariableSelection';
import { ModelSelectionGridModal } from '../ModelSelectionModal';
import { VariableSelectionModal } from '../VariableSelectionModal';

/** Opens on mount, and calls onClose once the picker has opened and closed again */
function useOpenUntilClosed(isOpen: boolean, open: () => void, onClose: () => void): void {
    const hasOpened = useRef(false);
    useEffect(() => {
        open();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (isOpen) {
            hasOpened.current = true;
        } else if (hasOpened.current) {
            onClose();
        }
    }, [isOpen, onClose]);
}

export function DetailedViewModelsPicker({ onClose }: { onClose: () => void }): JSX.Element {
    const [selectedModels, setSelectedModels] = useSelectedModels();
    const [selectedAggregations, setSelectedAggregations] = useSelectedAggregations();
    const hierarchy = useModelHierarchy({
        selectedModels,
        onModelsChange: setSelectedModels,
        selectedAggregations,
        onAggregationsChange: setSelectedAggregations,
    });
    useOpenUntilClosed(hierarchy.isOpen, hierarchy.openModal, onClose);
    return <ModelSelectionGridModal hierarchy={hierarchy} />;
}

export function ChartsPicker({ onClose }: { onClose: () => void }): JSX.Element {
    const [selectedVariables, setSelectedVariables] = useShownCharts();
    const selection = useVariableSelection({ selectedVariables, setSelectedVariables });
    useOpenUntilClosed(selection.isOpen, selection.openModal, onClose);
    return <VariableSelectionModal selection={selection} />;
}
