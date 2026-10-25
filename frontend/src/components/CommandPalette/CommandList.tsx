import { memo, useEffect, useRef } from 'react';
import { CommandItem } from './CommandItem';
import { useLanguage } from '../../hooks/useLanguage';
import type { Command } from '../../types';

interface CommandListProps {
  commands: Command[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export const CommandList = memo(function CommandList({
  commands,
  selectedIndex,
  onSelect,
  onHover,
}: CommandListProps): JSX.Element {
  const { t } = useLanguage();
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selectedIndex]);

  if (commands.length === 0) {
    return (
      <div className="command-list-empty">
        {t('command.noneFound')}
      </div>
    );
  }

  return (
    <div className="command-list">
      {commands.map((command, index) => (
        <div
          key={command.id}
          ref={index === selectedIndex ? selectedRef : null}
        >
          <CommandItem
            command={command}
            index={index}
            isSelected={index === selectedIndex}
            onSelect={onSelect}
            onHover={onHover}
          />
        </div>
      ))}
    </div>
  );
});
