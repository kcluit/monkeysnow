/**
 * Whether the Cursor readout (see CONTEXT.md) shows on the maps. It is on unless the visitor
 * turned it off, from either map's layers panel, the Settings page or the command palette;
 * kept in this browser's localStorage only.
 */

const STORAGE_KEY = 'cursorReadout';

function read(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

// Read on first use rather than on import, so main.tsx's one-off reset of stored data runs first
let shown: boolean | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// Another tab changed it
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
        shown = read();
        notify();
    }
});

export function getCursorReadoutShown(): boolean {
    shown ??= read();
    return shown;
}

export function setCursorReadoutShown(next: boolean): void {
    shown = next;
    try {
        localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
        // Storage unavailable (private mode, full): kept for this visit only
    }
    notify();
}

export function subscribeCursorReadout(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
