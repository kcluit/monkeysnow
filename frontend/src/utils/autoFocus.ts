/**
 * Whether a search box should take focus when its modal opens: yes with a mouse, but
 * not on a touch screen, where focusing it opens the on-screen keyboard over the list.
 */
export function shouldAutoFocusSearch(): boolean {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}
