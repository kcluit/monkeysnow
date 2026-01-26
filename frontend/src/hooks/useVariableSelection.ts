import { useState, useCallback, useMemo } from 'react';
import type { WeatherVariable } from '../types/openMeteo';
import { ALL_VARIABLES, VARIABLE_CONFIGS } from '../utils/chartConfigurations';

export interface UseVariableSelectionProps {
  selectedVariables: WeatherVariable[];
  setSelectedVariables: (variables: WeatherVariable[]) => void;
}

export interface UseVariableSelectionReturn {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Variables in display order (includes both selected and unselected)
  orderedVariables: WeatherVariable[];

  // Selection state
  selectedVariables: WeatherVariable[];
  isSelected: (varId: WeatherVariable) => boolean;

  // Actions
  toggleVariable: (varId: WeatherVariable) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reorderVariables: (activeId: string, overId: string) => void;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredVariables: WeatherVariable[];
}

export function useVariableSelection({
  selectedVariables,
  setSelectedVariables,
}: UseVariableSelectionProps): UseVariableSelectionReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // The order of selectedVariables determines chart display order
  // We maintain a separate ordered list that includes unselected variables for the modal
  const orderedVariables = useMemo(() => {
    // Start with selected variables in their current order
    const ordered = [...selectedVariables];
    // Add unselected variables at the end (maintaining their relative order from ALL_VARIABLES)
    ALL_VARIABLES.forEach((varId) => {
      if (!ordered.includes(varId)) {
        ordered.push(varId);
      }
    });
    return ordered;
  }, [selectedVariables]);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setSearchTerm('');
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  const isSelected = useCallback(
    (varId: WeatherVariable) => selectedVariables.includes(varId),
    [selectedVariables]
  );

  const toggleVariable = useCallback(
    (varId: WeatherVariable) => {
      if (selectedVariables.includes(varId)) {
        // Don't allow removing the last variable
        if (selectedVariables.length > 1) {
          setSelectedVariables(selectedVariables.filter((v) => v !== varId));
        }
      } else {
        // Add variable at the end
        setSelectedVariables([...selectedVariables, varId]);
      }
    },
    [selectedVariables, setSelectedVariables]
  );

  const selectAll = useCallback(() => {
    // Select all in the current order
    setSelectedVariables([...orderedVariables]);
  }, [orderedVariables, setSelectedVariables]);

  const deselectAll = useCallback(() => {
    // Keep only the first selected variable
    if (selectedVariables.length > 0) {
      setSelectedVariables([selectedVariables[0]]);
    }
  }, [selectedVariables, setSelectedVariables]);

  const reorderVariables = useCallback(
    (activeId: string, overId: string) => {
      const activeVar = activeId as WeatherVariable;
      const overVar = overId as WeatherVariable;

      // Only reorder within selected variables
      const oldIndex = selectedVariables.indexOf(activeVar);
      const newIndex = selectedVariables.indexOf(overVar);

      if (oldIndex === -1 || newIndex === -1) {
        // One of the variables is not selected, ignore
        return;
      }

      const reordered = [...selectedVariables];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, removed);
      setSelectedVariables(reordered);
    },
    [selectedVariables, setSelectedVariables]
  );

  const filteredVariables = useMemo(() => {
    if (!searchTerm.trim()) {
      return orderedVariables;
    }
    const query = searchTerm.toLowerCase();
    return orderedVariables.filter((varId) => varId.toLowerCase().includes(query));
  }, [orderedVariables, searchTerm]);

  return {
    isOpen,
    openModal,
    closeModal,
    orderedVariables,
    selectedVariables,
    isSelected,
    toggleVariable,
    selectAll,
    deselectAll,
    reorderVariables,
    searchTerm,
    setSearchTerm,
    filteredVariables,
  };
}
