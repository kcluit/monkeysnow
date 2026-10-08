import { CommandInput } from './CommandInput';
import { CommandList } from './CommandList';
import { useOverlay } from '../../hooks/useOverlay';
import type { UseCommandPaletteReturn } from '../../types';

interface CommandPaletteProps {
  palette: UseCommandPaletteReturn;
  hideIcons?: boolean;
}

export function CommandPalette({ palette, hideIcons }: CommandPaletteProps): JSX.Element | null {
  const {
    isOpen,
    searchQuery,
    selectedIndex,
    filteredCommands,
    closePalette,
    setSearchQuery,
    setSelectedIndex,
    selectAtIndex,
    goBack,
    canGoBack,
  } = palette;

  // Lock page scroll while open; Esc goes back a level, or closes
  useOverlay(isOpen, goBack);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closePalette();
    }
  };

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette">
        <CommandInput
          value={searchQuery}
          onChange={setSearchQuery}
          canGoBack={canGoBack}
          onBack={goBack}
        />
        <CommandList
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          onSelect={selectAtIndex}
          onHover={setSelectedIndex}
          hideIcons={hideIcons}
        />
        <div className="command-palette-footer">
          <span className="command-hint">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="command-hint">
            <kbd>↵</kbd> select
          </span>
          <span className="command-hint">
            <kbd>esc</kbd> {canGoBack ? 'back' : 'close'}
          </span>
        </div>
      </div>
    </div>
  );
}
