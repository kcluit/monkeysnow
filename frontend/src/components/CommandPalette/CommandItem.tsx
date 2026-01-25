import { memo, useCallback } from 'react';
import type { Command } from '../../types';

interface CommandItemProps {
    command: Command;
    index: number;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onHover: (index: number) => void;
    hideEmoji?: boolean;
}

export const CommandItem = memo(function CommandItem({
    command,
    index,
    isSelected,
    onSelect,
    onHover,
    hideEmoji,
}: CommandItemProps): JSX.Element {
    const hasSubCommands = command.subCommands && command.subCommands.length > 0;

    const handleClick = useCallback(() => {
        onSelect(index);
    }, [onSelect, index]);

    const handleMouseEnter = useCallback(() => {
        onHover(index);
    }, [onHover, index]);

    return (
        <button
            type="button"
            className={`command-item ${isSelected ? 'selected' : ''}`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
        >
            <div className="command-item-content">
                {!hideEmoji && command.icon && <span className="command-icon">{command.icon}</span>}
                <span className="command-name">{command.name}...</span>
            </div>
            <div className="command-item-meta">
                {command.shortcut && (
                    <span className="command-shortcut">{command.shortcut}</span>
                )}
                {hasSubCommands && <span className="command-arrow">&gt;</span>}
            </div>
        </button>
    );
});
