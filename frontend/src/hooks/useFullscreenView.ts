import { useCallback, useEffect, useState } from 'react';
import { useOverlay } from './useOverlay';

export interface UseFullscreenViewReturn {
    isFullscreen: boolean;
    enterFullscreen: () => void;
    exitFullscreen: () => void;
}

/**
 * A part of the page that can fill the window, such as the resort map or a chart.
 * Entering pushes a history entry (marked with `historyKey`) so Back leaves
 * fullscreen instead of the page; Esc leaves too, and the page behind can't scroll.
 */
export function useFullscreenView(historyKey: string): UseFullscreenViewReturn {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const enterFullscreen = useCallback(() => {
        // Keep React Router's state on the entry so its history index stays consistent
        window.history.pushState({ ...window.history.state, [historyKey]: true }, '');
        setIsFullscreen(true);
    }, [historyKey]);

    const exitFullscreen = useCallback(() => {
        setIsFullscreen(false);
        // Drop the entry pushed on entering, so the next Back leaves the page as normal
        if (window.history.state?.[historyKey]) {
            window.history.back();
        }
    }, [historyKey]);

    useEffect(() => {
        if (!isFullscreen) return;
        const handlePopState = () => setIsFullscreen(false);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isFullscreen]);

    useOverlay(isFullscreen, exitFullscreen);

    return { isFullscreen, enterFullscreen, exitFullscreen };
}
