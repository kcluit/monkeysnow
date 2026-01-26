/**
 * Chart Abstraction Layer - Library-Agnostic Types
 *
 * These types define a generic chart configuration interface that can be
 * implemented by any charting library (ECharts, Recharts, D3, etc.)
 */

/** Supported chart types */
export type ChartType = 'line' | 'bar' | 'area';

/** Configuration for a single data series */
export interface SeriesConfig {
  id: string;
  name: string;
  color: string;
  type: ChartType;
  data: number[];
  /** Optional opacity for area fills */
  fillOpacity?: number;
}

/** Axis configuration */
export interface AxisConfig {
  type: 'category' | 'value';
  data?: string[];
  label?: string;
  /** Custom formatter for tick labels */
  formatter?: (value: number) => string;
  /** Fixed domain [min, max], or 'auto' for automatic */
  domain?: [number | 'auto', number | 'auto'];
}

/** Tooltip configuration */
export interface TooltipConfig {
  enabled: boolean;
  trigger: 'axis' | 'item';
  /** Custom formatter for tooltip content */
  formatter?: (params: TooltipParams[]) => string;
}

/** Individual tooltip parameter */
export interface TooltipParams {
  seriesName: string;
  value: number;
  color: string;
  axisValue: string;
}

/** Legend configuration */
export interface LegendConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

/** Grid/margin configuration */
export interface GridConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
  containLabel?: boolean;
}

/** Data zoom/brush interaction configuration */
export interface DataZoomConfig {
  enabled: boolean;
  type: 'slider' | 'inside' | 'both';
  /** Initial zoom range as percentage [start, end] */
  range?: [number, number];
}

/** Theme colors extracted from CSS variables */
export interface ChartTheme {
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
}

/** Complete chart configuration */
export interface ChartConfig {
  /** Unique identifier for the chart */
  id?: string;
  /** Chart type (applies default if not specified per series) */
  type: ChartType;
  /** X-axis configuration */
  xAxis: AxisConfig;
  /** Y-axis configuration */
  yAxis: AxisConfig;
  /** Data series to render */
  series: SeriesConfig[];
  /** Tooltip settings */
  tooltip?: TooltipConfig;
  /** Legend settings */
  legend?: LegendConfig;
  /** Grid/margin settings */
  grid?: GridConfig;
  /** Zoom/brush settings */
  dataZoom?: DataZoomConfig;
  /** Theme colors */
  theme: ChartTheme;
  /** Chart height in pixels */
  height?: number;
  /** Whether animations are enabled */
  animation?: boolean;
}

/** Props for the main ChartRenderer component */
export interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
  style?: React.CSSProperties;
}
