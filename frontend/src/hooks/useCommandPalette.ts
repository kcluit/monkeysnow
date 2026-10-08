import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { isOverlayOpen } from './useOverlay';
import type { Command, UseCommandPaletteReturn } from '../types';

type PendingNav = { commandId: string } | null;

/** Whether a key press is going into a text field rather than to the page. */
function isTypingInField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

/**
 * Hook for managing command palette state with lazy command generation.
 * Commands are only generated when the palette opens, not on every state change.
 *
 * @param commandFactory - Function that returns the command array
 * @param dependencies - Dependencies that trigger command regeneration when palette is open
 */
export function useCommandPalette(
  commandFactory: () => Command[],
  dependencies: unknown[]
): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandStack, setCommandStack] = useState<Command[][]>([]);

  // Store latest factory in ref to avoid stale closures
  const factoryRef = useRef(commandFactory);
  const pendingNavRef = useRef<PendingNav>(null);
  useEffect(() => {
    factoryRef.current = commandFactory;
  });

  // Generate commands lazily when palette opens or dependencies change while open
  useEffect(() => {
    if (isOpen) {
      const newCommands = factoryRef.current();
      setCommands(newCommands);

      // Auto-navigate to a specific command's subcommands if requested
      const nav = pendingNavRef.current;
      if (nav) {
        pendingNavRef.current = null;
        const cmd = newCommands.find(c => c.id === nav.commandId);
        if (cmd?.subCommands) {
          setCommandStack([cmd.subCommands]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ...dependencies]);

  // Current commands are either from subcommand stack or root commands
  const currentCommands = useMemo(() => {
    return commandStack.length > 0
      ? commandStack[commandStack.length - 1]
      : commands;
  }, [commandStack, commands]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return currentCommands;
    }

    const query = searchQuery.toLowerCase();
    return currentCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query)
    );
  }, [currentCommands, searchQuery]);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Reset state when closing
  const closePalette = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
    setCommandStack([]);
  }, []);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(0);
    setCommandStack([]);
  }, []);

  const openToCommand = useCallback((commandId: string) => {
    pendingNavRef.current = { commandId };
    setIsOpen(true);
    setSearchQuery('');
    setSelectedIndex(0);
    setCommandStack([]);
  }, []);

  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) =>
      prev <= 0 ? filteredCommands.length - 1 : prev - 1
    );
  }, [filteredCommands.length]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) =>
      prev >= filteredCommands.length - 1 ? 0 : prev + 1
    );
  }, [filteredCommands.length]);

  const goBack = useCallback(() => {
    if (commandStack.length > 0) {
      setCommandStack((prev) => prev.slice(0, -1));
      setSearchQuery('');
      setSelectedIndex(0);
    } else {
      closePalette();
    }
  }, [commandStack.length, closePalette]);

  const selectAtIndex = useCallback((index: number) => {
    const command = filteredCommands[index];
    if (!command) return;

    if (command.subCommands && command.subCommands.length > 0) {
      // Push to subcommand stack
      setCommandStack((prev) => [...prev, command.subCommands!]);
      setSearchQuery('');
      setSelectedIndex(0);
    } else if (command.action) {
      // Execute action and close
      command.action();
      closePalette();
    }
  }, [filteredCommands, closePalette]);

  const selectCurrent = useCallback(() => {
    selectAtIndex(selectedIndex);
  }, [selectAtIndex, selectedIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        // Ctrl/Cmd+Shift+P opens the palette from anywhere. Esc and Tab only do when nothing
        // else is open and the visitor isn't typing in a field: inside a modal, Esc closes
        // that modal and Tab moves focus as usual.
        const isShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'P';
        const isQuickKey = (e.key === 'Escape' || e.key === 'Tab') && !isOverlayOpen() && !isTypingInField(e.target);
        if (isShortcut || isQuickKey) {
          e.preventDefault();
          openPalette();
        }
        return;
      }

      // Handle palette navigation when open; Esc reaches goBack as the topmost overlay
      switch (e.key) {
        case 'ArrowUp':
          navigateUp();
          break;
        case 'ArrowDown':
          navigateDown();
          break;
        case 'Enter':
          selectCurrent();
          break;
        case 'Backspace':
          // If search is empty, go back
          if (searchQuery === '' && commandStack.length > 0) {
            goBack();
            break;
          }
          return;
        default:
          return;
      }
      // Handled here only, so a modal under the palette doesn't act on the same key
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    // While open, listen in the capture phase to get keys before anything beneath the palette
    const capture = isOpen;
    window.addEventListener('keydown', handleKeyDown, capture);
    return () => window.removeEventListener('keydown', handleKeyDown, capture);
  }, [
    isOpen,
    openPalette,
    goBack,
    navigateUp,
    navigateDown,
    selectCurrent,
    searchQuery,
    commandStack.length,
  ]);

  return {
    isOpen,
    searchQuery,
    selectedIndex,
    filteredCommands,
    openPalette,
    openToCommand,
    closePalette,
    setSearchQuery,
    setSelectedIndex,
    navigateUp,
    navigateDown,
    selectCurrent,
    selectAtIndex,
    goBack,
    canGoBack: commandStack.length > 0,
  };
}
