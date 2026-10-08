/**
 * Overlays are the modals and fullscreen views that sit above the page. While any
 * is open the page behind doesn't scroll, Esc goes to the topmost one only, and the
 * command palette's Esc/Tab shortcuts stand aside (see useCommandPalette).
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

interface Overlay {
    escape: () => void;
}

const openOverlays: Overlay[] = [];
let overflowBeforeLock = '';

/** Whether any modal or fullscreen view is open. */
export function isOverlayOpen(): boolean {
    return openOverlays.length > 0;
}

// Capture phase, so it runs before every bubbling Esc handler, the command palette's included
function handleEscape(e: KeyboardEvent): void {
    if (e.key !== 'Escape' || openOverlays.length === 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openOverlays[openOverlays.length - 1].escape();
}

/**
 * Registers an overlay while `open`: the page behind stops scrolling, and Esc calls
 * `onEscape` whenever this is the topmost overlay. Overlays opened later sit on top.
 */
export function useOverlay(open: boolean, onEscape: () => void): void {
    const onEscapeRef = useRef(onEscape);
    useLayoutEffect(() => {
        onEscapeRef.current = onEscape;
    });

    useEffect(() => {
        if (!open) return;
        const overlay: Overlay = { escape: () => onEscapeRef.current() };
        if (openOverlays.length === 0) {
            overflowBeforeLock = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape, true);
        }
        openOverlays.push(overlay);
        return () => {
            openOverlays.splice(openOverlays.indexOf(overlay), 1);
            if (openOverlays.length === 0) {
                document.body.style.overflow = overflowBeforeLock;
                window.removeEventListener('keydown', handleEscape, true);
            }
        };
    }, [open]);
}
