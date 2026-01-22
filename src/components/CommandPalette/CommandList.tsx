import { memo, useEffect, useRef } from 'react';
import { CommandItem } from './CommandItem';
import type { Command } from '../../types';

interface CommandListProps {
  commands: Command[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
  hideEmoji?: boolean;
}

export const CommandList = memo(function CommandList({
  commands,
  selectedIndex,
  onSelect,
  onHover,
  hideEmoji,
}: CommandListProps): JSX.Element {
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [selectedIndex]);

  if (commands.length === 0) {
    return (
      <div className="command-list-empty">
        No commands found
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
            hideEmoji={hideEmoji}
          />
        </div>
      ))}
    </div>
  );
});
