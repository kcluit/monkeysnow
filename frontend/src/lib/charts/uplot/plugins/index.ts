/**
 * uPlot Plugins - Public Exports
 *
 * New consolidated plugin architecture:
 * - interactiveOverlayPlugin: Tooltip + point snapping + highlights (replaces tooltipPlugin)
 * - smartLabelsPlugin: Collision-aware labels (replaces labelsPlugin)
 * - advancedZoomPlugin: Wheel zoom + drag pan + range selector (replaces zoomPlugin)
 * - bandFillPlugin: Uncertainty range visualization (unchanged)
 * - legendPlugin: Interactive series toggle (unchanged)
 * - markLinesPlugin: Horizontal reference lines (unchanged)
 */

// New consolidated plugins
export { interactiveOverlayPlugin } from './interactiveOverlayPlugin';
export { smartLabelsPlugin } from './smartLabelsPlugin';
export { advancedZoomPlugin } from './advancedZoomPlugin';

// Existing plugins (unchanged)
export { bandFillPlugin } from './bandFillPlugin';
export { legendPlugin } from './legendPlugin';
export { markLinesPlugin } from './markLinesPlugin';
