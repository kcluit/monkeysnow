/**
 * useInViewport Hook
 *
 * Uses IntersectionObserver to track whether an element is visible in the viewport.
 * Used for virtualizing chart rendering - only render charts when visible.
 */

import { useEffect, useRef, useState } from 'react';

interface UseInViewportOptions {
    /** Root margin to expand/shrink the viewport detection area */
    rootMargin?: string;
    /** Threshold at which to trigger (0-1) */
    threshold?: number;
    /** If true, keeps element "visible" once it has been seen (for lazy loading) */
    once?: boolean;
}

/**
 * Hook to detect if an element is in the viewport.
 *
 * @param options - Configuration options
 * @returns [ref, isInViewport] - Ref to attach to element and visibility state
 */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(
    options: UseInViewportOptions = {}
): [React.RefObject<T>, boolean] {
    const { rootMargin = '100px', threshold = 0, once = false } = options;
    const ref = useRef<T>(null);
    const [isInViewport, setIsInViewport] = useState(false);
    const hasBeenVisible = useRef(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // If once mode and already been visible, stay visible
        if (once && hasBeenVisible.current) {
            setIsInViewport(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                const visible = entry.isIntersecting;

                if (visible) {
                    hasBeenVisible.current = true;
                }

                // In once mode, only set to true, never back to false
                if (once && hasBeenVisible.current) {
                    setIsInViewport(true);
                } else {
                    setIsInViewport(visible);
                }
            },
            {
                rootMargin,
                threshold,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [rootMargin, threshold, once]);

    return [ref, isInViewport];
}
