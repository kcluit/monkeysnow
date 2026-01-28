import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Command, UseCommandPaletteReturn } from '../types';

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
  useEffect(() => {
    factoryRef.current = commandFactory;
  });

  // Generate commands lazily when palette opens or dependencies change while open
  useEffect(() => {
    if (isOpen) {
      const newCommands = factoryRef.current();
      setCommands(newCommands);
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
      // Open palette with Escape or Ctrl+Shift+P
      if (!isOpen) {
        if (e.key === 'Escape' || e.key === 'Tab' || (e.ctrlKey && e.shiftKey && e.key === 'P')) {
          e.preventDefault();
          openPalette();
          return;
        }
        return;
      }

      // Handle palette navigation when open
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          goBack();
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDown();
          break;
        case 'Enter':
          e.preventDefault();
          selectCurrent();
          break;
        case 'Backspace':
          // If search is empty, go back
          if (searchQuery === '' && commandStack.length > 0) {
            e.preventDefault();
            goBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
