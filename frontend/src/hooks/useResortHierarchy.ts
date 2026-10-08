/**
 * Hook for the resort picker's state: whether it is open, the draft Selection
 * being edited in it, and the search term.
 */

import { useState, useCallback, useRef } from 'react';

/** The Selection cap: sized so a full Selection loads within Open-Meteo's free limits. */
export const MAX_SELECTED_RESORTS = 300;

/** Shown when an add would go past the Selection cap; only `added` of `requested` fit. */
export interface SelectionCapNotice {
  added: number;
  requested: number;
}

export interface UseResortHierarchyProps {
  selectedResorts: string[];
  onResortsChange: (resorts: string[] | ((prev: string[]) => string[])) => void;
}

export interface UseResortHierarchyReturn {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Selection (the draft while the picker is open)
  selectedResorts: string[];
  toggleResort: (resortId: string) => void;
  /** Toggles a group, given the resorts it holds; while searching, only its matches. */
  toggleGroup: (resortIds: string[]) => void;
  clearAllResorts: () => void;
  capNotice: SelectionCapNotice | null;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function useResortHierarchy({
  selectedResorts,
  onResortsChange,
}: UseResortHierarchyProps): UseResortHierarchyReturn {
  // Modal state
  const [isOpen, setIsOpen] = useState(false);

  // Draft selection state - only committed on modal close to avoid lag
  const [draftSelectedResorts, setDraftSelectedResorts] = useState<string[]>(selectedResorts);
  const draftRef = useRef(draftSelectedResorts);
  draftRef.current = draftSelectedResorts;
  const [capNotice, setCapNotice] = useState<SelectionCapNotice | null>(null);

  const setDraft = useCallback((next: string[]) => {
    draftRef.current = next; // keep rapid clicks consistent before the re-render
    setDraftSelectedResorts(next);
  }, []);

  // Adds resorts to the draft up to the Selection cap, and says so when some didn't fit
  const addToDraft = useCallback((resortIds: string[]) => {
    const prev = draftRef.current;
    const prevSet = new Set(prev);
    const toAdd = resortIds.filter((id) => !prevSet.has(id));
    const added = toAdd.slice(0, Math.max(0, MAX_SELECTED_RESORTS - prev.length));
    setCapNotice(added.length < toAdd.length ? { added: added.length, requested: toAdd.length } : null);
    if (added.length > 0) setDraft([...prev, ...added]);
  }, [setDraft]);

  const removeFromDraft = useCallback((resortIds: string[]) => {
    const toRemove = new Set(resortIds);
    setDraft(draftRef.current.filter((id) => !toRemove.has(id)));
    setCapNotice(null);
  }, [setDraft]);

  const toggleResort = useCallback((resortId: string) => {
    if (draftRef.current.includes(resortId)) {
      removeFromDraft([resortId]);
    } else {
      addToDraft([resortId]);
    }
  }, [addToDraft, removeFromDraft]);

  // Use draft state when modal is open, committed state when closed
  const activeSelectedResorts = isOpen ? draftSelectedResorts : selectedResorts;

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Open/close modal
  const openModal = useCallback(() => {
    setDraft(selectedResorts);
    setCapNotice(null);
    setIsOpen(true);
    setSearchTerm('');
  }, [selectedResorts, setDraft]);

  const closeModal = useCallback(() => {
    // Commit draft selection to parent state on close
    onResortsChange(draftRef.current);
    setCapNotice(null);
    setIsOpen(false);
    setSearchTerm('');
  }, [onResortsChange]);

  // A group's checkbox fills it up to the Selection cap; it clears the group once the group is
  // complete, or once the Selection is full and part of the group is in it
  const toggleGroup = useCallback((resortIds: string[]) => {
    const draft = new Set(draftRef.current);
    const selectedCount = resortIds.filter((id) => draft.has(id)).length;
    const isComplete = resortIds.length > 0 && selectedCount === resortIds.length;
    const isFull = draft.size >= MAX_SELECTED_RESORTS;
    if (isComplete || (isFull && selectedCount > 0)) {
      removeFromDraft(resortIds);
    } else {
      addToDraft(resortIds);
    }
  }, [addToDraft, removeFromDraft]);

  const clearAllResorts = useCallback(() => {
    setDraft([]);
    setCapNotice(null);
  }, [setDraft]);

  return {
    // Modal state
    isOpen,
    openModal,
    closeModal,

    // Selection (draft state when modal is open, committed state when closed)
    selectedResorts: activeSelectedResorts,
    toggleResort,
    toggleGroup,
    clearAllResorts,
    capNotice,

    // Search
    searchTerm,
    setSearchTerm,
  };
}
