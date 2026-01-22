import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Command, UseCommandPaletteReturn } from '../types';

export function useCommandPalette(commands: Command[]): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandStack, setCommandStack] = useState<Command[][]>([]);

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
        if (e.key === 'Escape' || (e.ctrlKey && e.shiftKey && e.key === 'P')) {
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
