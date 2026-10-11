/**
 * A way to open one modal from anywhere: the command palette, the Settings page or another modal.
 * Whatever can open it offers to while mounted, and the latest offer is used, so a page that
 * can show more (the Detailed view, which knows the point being forecast) wins over App's own.
 */
export interface OpenerRegistry {
    /** Offers a way to open it until the returned function is called */
    register: (open: () => void) => () => void;
    open: () => void;
}

export function createOpenerRegistry(): OpenerRegistry {
    const openers: (() => void)[] = [];
    return {
        register(open) {
            openers.push(open);
            return () => {
                const index = openers.indexOf(open);
                if (index !== -1) openers.splice(index, 1);
            };
        },
        open() {
            openers[openers.length - 1]?.();
        },
    };
}

/** The Detailed view models: the Selected models and Selected Aggregations */
export const detailedViewModelsOpener = createOpenerRegistry();
