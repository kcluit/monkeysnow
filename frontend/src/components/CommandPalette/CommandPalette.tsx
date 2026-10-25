import { CommandInput } from './CommandInput';
import { CommandList } from './CommandList';
import { useOverlay } from '../../hooks/useOverlay';
import { useLanguage } from '../../hooks/useLanguage';
import type { UseCommandPaletteReturn } from '../../types';

interface CommandPaletteProps {
  palette: UseCommandPaletteReturn;
}

export function CommandPalette({ palette }: CommandPaletteProps): JSX.Element | null {
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
  const { t } = useLanguage();

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
        />
        <div className="command-palette-footer">
          <span className="command-hint">
            <kbd>↑↓</kbd> {t('command.hint.navigate')}
          </span>
          <span className="command-hint">
            <kbd>↵</kbd> {t('command.hint.select')}
          </span>
          <span className="command-hint">
            <kbd>{t('key.esc')}</kbd> {t(canGoBack ? 'command.hint.back' : 'command.hint.close')}
          </span>
        </div>
      </div>
    </div>
  );
}
