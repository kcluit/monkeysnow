/**
 * Centralized FontAwesome icon definitions.
 * All UI icons are imported and exported here for consistent usage across the app.
 */

import {
  faCheck,
  faMinus,
  faChevronRight,
  faChevronDown,
  faChevronLeft,
  faCaretRight,
  faCaretDown,
  // Command palette - main menu
  faPersonSkiing,
  faMountain,
  faChartColumn,
  faCalendar,
  faArrowsUpDown,
  faEye,
  faTemperatureHalf,
  faSnowflake,
  faSliders,
  faRuler,
  faRulerCombined,
  faGlobe,
  // Command palette - base commands
  faCircleHalfStroke,
  faFont,
  faGem,
  faExpand,
  faBolt,
  faEyeSlash,
  faSquare,
  faCalendarDays,
  faLink,
  // Theme icons
  faMoon,
  faSun,
  // Font icons
  faCode,
  faPenToSquare,
  // Chart types
  faChartLine,
  faChartArea,
  faBox,
  // Hierarchy icons
  faEarthAmericas,
  faFlag,
  faLocationDot,
  // Navigation icons
  faHouse,
  faCircleInfo,
  faGear,
  // Modal controls
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

// Re-export for direct usage
export {
  // Checkmarks and indicators
  faCheck,
  faMinus,
  // Navigation arrows
  faChevronRight,
  faChevronDown,
  faCaretRight,
  faCaretDown,
};

// Command palette - control commands
export const icons = {
  // Selection indicators
  check: faCheck,
  minus: faMinus,

  // Navigation
  chevronRight: faChevronRight,
  chevronDown: faChevronDown,
  chevronLeft: faChevronLeft,
  caretRight: faCaretRight,
  caretDown: faCaretDown,

  // Main menu commands
  resort: faPersonSkiing,
  mountain: faMountain,
  chart: faChartColumn,
  calendar: faCalendar,
  sort: faArrowsUpDown,
  view: faEye,
  temperature: faTemperatureHalf,
  snow: faSnowflake,
  controls: faSliders,
  ruler: faRuler,
  units: faRulerCombined,
  language: faGlobe,

  // Base commands
  theme: faCircleHalfStroke,
  font: faFont,
  rainbow: faGem,
  fullscreen: faExpand,
  fps: faBolt,
  hideIcons: faEyeSlash,
  borders: faSquare,
  date: faCalendarDays,
  link: faLink,

  // Theme sub-icons
  dark: faMoon,
  light: faSun,

  // Font sub-icons
  monospace: faCode,
  regular: faPenToSquare,

  // Chart types
  lineChart: faChartLine,
  barChart: faChartColumn,
  areaChart: faChartArea,
  boxChart: faBox,
  heatmap: faCalendarDays,

  // Hierarchy icons
  continent: faEarthAmericas,
  country: faFlag,
  province: faLocationDot,
  // resort is already defined above (faPersonSkiing)

  // Provider icons (model selection)
  aggregations: faChartColumn,
  provider: faGlobe,

  // Navigation icons
  home: faHouse,
  info: faCircleInfo,
  settings: faGear,

  // Modal controls
  close: faXmark,
} as const;

export type IconKey = keyof typeof icons;
