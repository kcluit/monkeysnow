/**
 * Color Utilities
 *
 * Shared color manipulation functions for chart rendering.
 */

/**
 * Apply opacity to a color string.
 * Handles hex, rgb, and rgba color formats.
 */
export function colorWithOpacity(color: string, opacity: number): string {
    if (opacity === 1) return color;

    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        let r: number, g: number, b: number;

        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }

        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle rgb colors
    if (color.startsWith('rgb(')) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
        }
    }

    // Handle rgba colors
    if (color.startsWith('rgba(')) {
        const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
            const newOpacity = parseFloat(match[4]) * opacity;
            return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${newOpacity})`;
        }
    }

    // Fallback
    return color;
}
