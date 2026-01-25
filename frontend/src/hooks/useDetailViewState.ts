import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { DetailViewState } from '../types/detailView';

export interface UseDetailViewStateReturn {
  isDetailView: boolean;
  selectedResortId: string | null;
  enterDetailView: (resortId: string) => void;
  exitDetailView: () => void;
}

export function useDetailViewState(): UseDetailViewStateReturn {
  const [state, setState] = useLocalStorage<DetailViewState>('detailViewState', {
    isDetailView: false,
    selectedResortId: null,
  });

  const enterDetailView = useCallback((resortId: string) => {
    setState({
      isDetailView: true,
      selectedResortId: resortId,
    });
  }, [setState]);

  const exitDetailView = useCallback(() => {
    setState({
      isDetailView: false,
      selectedResortId: null,
    });
  }, [setState]);

  return {
    isDetailView: state.isDetailView,
    selectedResortId: state.selectedResortId,
    enterDetailView,
    exitDetailView,
  };
}
