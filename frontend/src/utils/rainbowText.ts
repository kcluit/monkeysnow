/**
 * Rainbow text: marks every element that holds text of its own with `data-rainbow`, so the
 * `.rainbow-mode` rules in style.css can paint one screen-wide rainbow through its letters.
 * CSS can't select "elements with their own text", so this keeps the marks up to date as the
 * page renders.
 *
 *   on  - the rainbow
 *   dim - the rainbow faded, for text in the theme's secondary colour
 *   off - left in its own colour: its text is only pictures, such as emoji, which the rainbow
 *         would flatten into silhouettes, or it paints a background image of its own, which
 *         the rainbow would replace, or it has no box to paint one in
 */

type Mark = 'on' | 'dim' | 'off';

const ATTR = 'data-rainbow';

/** Elements whose text a CSS background can't reach */
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'OPTION', 'OPTGROUP']);

/** Fields hold their text in a value rather than a child text node */
const FIELDS = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea';

/**
 * Pictures rather than words: emoji (with the joiners, variation selectors and skin tones that
 * build them up) and shapes such as the ● keying a model's colour in a chart tooltip
 */
const PICTURES_ONLY = /^[\s\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u{200D}\u{FE0F}\u{25A0}-\u{25FF}]+$/u;

function ownText(el: Element): string {
    let text = '';
    el.childNodes.forEach((node) => {
        if (node instanceof Text) text += node.data;
    });
    return text;
}

function markFor(el: Element, secondaryColor: string): Mark {
    const text = ownText(el);
    if (/\S/.test(text) && PICTURES_ONLY.test(text)) return 'off';
    const style = getComputedStyle(el);
    if (style.display === 'contents') return 'off';
    const clip = style.backgroundClip + style.getPropertyValue('-webkit-background-clip');
    // A background image clipped to the text is a gradient text colour, which the rainbow replaces
    if (style.backgroundImage !== 'none' && !clip.includes('text')) return 'off';
    return style.color === secondaryColor ? 'dim' : 'on';
}

/** Marks the text under `document.body` until the returned function is called, which removes every mark. */
export function startRainbowText(): () => void {
    // Turns the theme's secondary text colour into the form getComputedStyle reports colours in
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.style.color = 'var(--textSecondary)';
    document.body.appendChild(probe);

    const pending = new Set<Element>();

    const collect = (node: Node) => {
        if (node instanceof Text) {
            if (node.parentElement && /\S/.test(node.data)) pending.add(node.parentElement);
            return;
        }
        if (!(node instanceof Element)) return;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (text.parentElement && /\S/.test((text as Text).data)) pending.add(text.parentElement);
        }
        if (node.matches(FIELDS)) pending.add(node);
        node.querySelectorAll(FIELDS).forEach((field) => pending.add(field));
    };

    const flush = () => {
        const elements = [...pending].filter(
            (el) => el.isConnected && !(el instanceof SVGElement) && !SKIPPED_TAGS.has(el.tagName)
        );
        pending.clear();
        // Unmark first, so the reads below see each element's own background rather than the rainbow
        for (const el of elements) el.removeAttribute(ATTR);
        const secondaryColor = getComputedStyle(probe).color;
        const marks = elements.map((el) => markFor(el, secondaryColor));
        elements.forEach((el, i) => el.setAttribute(ATTR, marks[i]));
    };

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            if (record.type === 'childList') {
                record.addedNodes.forEach(collect);
            } else if (record.type === 'characterData') {
                collect(record.target);
            } else {
                // A class or style change can change the colour of this element and everything in it
                const target = record.target as Element;
                if (target.hasAttribute(ATTR)) pending.add(target);
                target.querySelectorAll(`[${ATTR}]`).forEach((el) => pending.add(el));
            }
        }
        flush();
    });

    collect(document.body);
    flush();
    observer.observe(document.body, {
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
        subtree: true,
    });

    return () => {
        observer.disconnect();
        probe.remove();
        document.querySelectorAll(`[${ATTR}]`).forEach((el) => el.removeAttribute(ATTR));
    };
}
