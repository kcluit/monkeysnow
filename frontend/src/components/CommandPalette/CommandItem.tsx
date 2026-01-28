import { memo, useCallback } from 'react';
import type { Command } from '../../types';
import { Icon } from '../Icon';
import { icons } from '../../constants/icons';

interface CommandItemProps {
    command: Command;
    index: number;
    isSelected: boolean;
    onSelect: (index: number) => void;
    onHover: (index: number) => void;
    hideIcons?: boolean;
}

export const CommandItem = memo(function CommandItem({
    command,
    index,
    isSelected,
    onSelect,
    onHover,
    hideIcons,
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
                {!hideIcons && command.icon && <Icon icon={command.icon} className="command-icon" />}
                <span className="command-name">{command.name}</span>
            </div>
            <div className="command-item-meta">
                {command.shortcut && (
                    <span className="command-shortcut">{command.shortcut}</span>
                )}
                {hasSubCommands && <Icon icon={icons.chevronRight} className="command-arrow" />}
            </div>
        </button>
    );
});
