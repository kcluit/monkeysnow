# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MonkeySnow is a ski resort weather forecast application: a React frontend that fetches forecasts from Open-Meteo directly in the browser (there is no backend). It displays forecasts for multiple ski resorts with snow estimation using Kuchera ratios based on wet bulb temperature.

Domain terms (Selection, Selection cap, Fetch budget, Rate limit, Freshness window, ...) are defined in `CONTEXT.md`; architectural decisions live in `docs/adr/`.

## Commands

### Development
```bash
npm run dev
```

### Build (regenerates `frontend/public/sitemap.xml` from `resorts.json`, then type-checks and builds)
```bash
npm run build
```

## Architecture

### Monorepo Structure
- Uses npm workspaces with Turbo for task orchestration
- `frontend/` - Vite + React + TypeScript + Tailwind (the only workspace)

### Resort Data
- `frontend/src/data/resorts/resorts.json` - every Resort's name, country, Region, coordinates and bot/mid/top elevations, generated from OpenSkiData by `npm run import-resorts` (see docs/adr/0004-resort-list-from-openskidata.md), which also decides which countries are split into Regions
- `frontend/src/data/resortLocations.ts` - indexes it (`RESORT_LOCATIONS`) and builds the picker hierarchy Continent -> Country -> [Region] -> Resort (`RESORT_HIERARCHY`)
- `useHierarchyData` / `HierarchyContext` expose the hierarchy, resort IDs and display names

### Saved locations
- `utils/savedLocations.ts` - Custom locations a visitor named and kept, in this browser's localStorage only; in the Selection they are `saved:<key>` IDs, and their Detailed view is `/location/<key>`
- They have one elevation, which `resortForecast.ts` fetches and copies into all three bands; their Card model comes from the nearest Resort's country, stored when saved
- `useHierarchyData` lists them first in the picker under a "Saved locations" node (type `custom`)

### Fetching from Open-Meteo (see docs/adr/0001-fetch-forecasts-from-the-browser.md)
- `utils/openMeteoBudget.ts` - every forecast request goes through `fetchWeatherApiWithinBudget()`: a per-tab Fetch budget of 550 calls per rolling minute, at most 2 requests in flight, Detailed view requests first, and a pause until the window resets when Open-Meteo returns a 429
- `utils/resortForecast.ts` - fetches all three elevation bands for groups of up to 25 resorts sharing a Card model, and turns hourly data into AM/PM/NIGHT periods with the wet-bulb / Kuchera snow estimation; it also keeps each band's hours (`ElevationForecast.hours`) and the Freezing level's for Graph view
- `utils/cardModels.ts` - picks each card's Card model: the visitor's Country model (localStorage, set in `components/CardModelsModal/`) where it covers the point, else the country's Recommended card model (see docs/adr/0006)
- `hooks/useWeatherData.ts` - keeps the Selection's forecasts loaded: IndexedDB cache first, never-loaded resorts before stale ones, 3-hour Freshness window, re-checked every 5 minutes; in Graph view a forecast cached before hours were kept counts as never-loaded
- `utils/openMeteoClient.ts` + `hooks/useDetailedWeatherData.ts` - the multi-model Detailed view
- The Selection cap is `MAX_SELECTED_RESORTS` (300) in `hooks/useResortHierarchy.ts`

### First visit (see docs/adr/0002-locate-first-time-visitors-with-a-netlify-edge-function.md)
- `utils/starterResort.ts` picks the Starter resort: the resort page landed on, else the nearest to the visitor, else random
- The visitor's location comes from `frontend/netlify/edge-functions/geo.ts` at `/api/geo`, the only server-side code; under plain `vite` it is absent, so dev always falls back to random

### The map (see docs/adr/0007-map-layers-from-keyless-openly-licensed-sources.md and docs/adr/0009)
- `components/map/ResortMap.tsx` - the Detailed view's Leaflet map and the buttons around both maps; the layers button opens `MapLayersPanel` on either map. The visitor's Base map and Overlays (`utils/mapLayers.ts`, `hooks/useMapLayers.ts`) are one localStorage choice for every map, flat and 3D, also set on the Settings page and in the command palette, with at most one Terrain colouring (Slope angle, Gradient, Aspect, Height tint); `MapLegend.tsx` explains it along the bottom. The Ski map and contours are on by default (`turnOnContoursOnce()`, run from `main.tsx`, added contours once to choices stored before that)
- `utils/slopeBands.ts` - the visitor's Slope bands, what Slope angle paints, kept in localStorage and saved on every change (`hooks/useSlopeBands.ts`); `SlopeBandsEditor.tsx` edits them under Slope angle in `MapLayersPanel`, and in `SlopeBandsModal` from the Settings page and the command palette. The 3D map's Slope angle tile URLs carry them (`slopeBandsKey()`), so new bands mean new tiles
- `utils/satelliteImagery.ts` - the Satellite Base map's sources: EOX Sentinel-2 everywhere, with national aerial photos (swisstopo, IGN, basemap.at, USGS, GSI) over it inside rectangles around their countries; `SatelliteBaseMap.tsx` draws them on the flat map
- `utils/terrainOverlays.ts` - draws a tile of any terrain Overlay (hillshade, contours, Flats and the Terrain colourings) from Mapterhorn's heights (`utils/terrainTiles.ts`, `utils/terrainRendering.ts`), for the flat map's `TerrainOverlay.tsx` and the 3D map's `terrain-overlay://` tiles. Steepness-based ones need zoom 12 (about 30 m terrain)
- `CursorReadout.tsx` - the height, Slope angle and Aspect of the terrain under the mouse on either map, only where there is a mouse, worked out at a point by `utils/terrainAtPoint.ts` with the same sums as the Overlays (`hooks/useTerrainReadout.ts`). A visitor can turn it off (`utils/cursorReadout.ts`) in the layers panel, on the Settings page and in the command palette
- `SkiMapOverlay.tsx` - Runs and Lifts by zoom-12 square from static files in `frontend/public/skimap/12/<x>/<y>.json`, cached a week in IndexedDB (`utils/skiMapData.ts`), coloured by `utils/difficultyColours.ts`; `skiMapFeatures.ts` holds what it shares with the 3D map's `SkiMap3D.ts`: loading, naming, and working out what a Custom location is on. The squares (about 21,000 files) are generated from OpenSkiData by `npm run import-ski-map`, run by hand roughly monthly and committed without review (docs/adr/0010); never edit them by hand
- `ResortMap3D.tsx` - the 3D map behind the map's "3D" button, lazy-loaded with MapLibre (docs/adr/0008): the visitor's Base map and Overlays draped over Mapterhorn terrain, always hillshaded, with an Exaggeration slider that starts at 1.5× every time and Height lines traced by `utils/heightLines.ts`. Right-drag turns it Linear, Linear reversed or Orbital and tilts it as the visitor's 3D map tilt says (`utils/mapRotation.ts`, set on the Settings page and in the command palette); changing either rebuilds the map facing the same way. It and the flat map share markers and popups through `mapMarkers.tsx`; the 3D choice is never remembered

### Frontend Data Flow
1. `useWeatherData(selectedResorts)` loads forecasts into `AllWeatherData` and reports queued resorts
2. `processResortData()` in `utils/weather.ts` transforms them into `ProcessedResortData` for display
3. `components/FetchStatus.tsx` shows "N resorts queued" / "Limit reached" under the cards

### Key Frontend Patterns
- State persisted to localStorage via `useLocalStorage` hook, whose hooks on one key share each new value within the tab, so a change from the Settings page or the command palette shows at once on an open Detailed view; forecasts cached in IndexedDB (`utils/indexedDB.ts`)
- Command palette (`Ctrl+K`) for settings - commands defined in `App.tsx`, generated by `utils/commandGenerators.ts`
- The Settings page (`pages/SettingsPage.tsx`) groups its sections by where each setting takes effect: General (Units, Language, Theme), Main page (Resorts, Cards, Sorting), Detailed view (Forecast, Charts, Map), Appearance (Font, Interface) and Advanced, with jump links to each group at the top. A new setting goes in the group for where it takes effect, and in the command palette too. A button that opens a picker (Select resorts, Main page models, Detailed view models, Charts shown, Model styles, Slope bands) is an accent-filled `ActionButton`; one that sets a value is an outlined `OptionButton`. The Detailed view's own choices that are one for every Resort live in `hooks/useDetailedViewSettings.ts`; its Models and Charts pickers open on their own from App (`components/detail/DetailedViewPickers.tsx`), except that on the Detailed view the palette opens the view's own Models picker, which knows the point being forecast (`utils/openerRegistry.ts`)
- Four view modes: default, full, compact (cards in `components/cards/`) and graph (Graph view, below)
- Theming via CSS custom properties, themes in `types/themes.ts`. Text on an accent fill is the theme's background colour (`--background`), never white or `--textPrimary`, which most themes' accents don't contrast with
- UI strings in `locales/en.ts` (keys typed in `types/i18n.ts`); `interpolate()` fills `{placeholders}`
- Resort picker (`components/ResortSelectionModal/ResortSelectionGridModal.tsx`) opens with continents open and the rest closed; its search (`utils/resortSearch.ts`) matches names, Regions and countries, ignoring accents, punctuation and word order; `useResortHierarchy` holds the draft Selection being edited and the search term
- The Detailed view's Charts are one column (`components/detail/DetailChartGrid.tsx`) in the order of the `detailSelectedVariables` list, which both dragging a Chart's header grip and the Charts picker rewrite
- Model styles (`utils/modelStyles.ts`): each Forecast model's and Aggregation's colour, bold and opacity, plus the Spread fills and hiding model lines, kept in localStorage. They are edited in the Model styles tab of every chart's gear modal (`components/detail/ChartSettingsModal.tsx`, a little wider on that tab on desktop), or in `ModelStylesModal` on its own from the Settings page and the command palette where no chart is showing; `openModelStyles()` picks which. The tab (`ModelStylesTab.tsx`) is one column of rows, each showing a sample of its line and opening its editor below it, one at a time (Esc closes the editor before the modal): Selected models first, the rest folded under "Other models", then the Selected Aggregations with the rest under "Other Aggregations", and the switches. A filter at the top searches names and Providers. Closing either modal, however it's closed, saves; Reset to default asks first

### Graph view
- `components/graph/` - the view mode where each card is a Graph (`GraphCard.tsx`, drawn with uPlot by `GraphPlot.ts` from `graphData.ts`) of its Card model's hours: precipitation bars in Snow quality colours (`utils/snowQualityColours.ts`), snow or rain decided as the cards decide a Period's but with rain from the hour's total precipitation (Open-Meteo's `rain` leaves out showers), the temperature at the picked Elevation band, and the Freezing level, which has no axis, against dashed lines at the heights forecast; nights are shaded from `utils/nightTimes.ts`
- Every Graph shares one `GraphSync` per visit to the page: they open on 5 days from the current hour, zoom out to every hour any of them has, double-click back to those 5 days, and zoom, pan and are pointed at (a hairline on the others) together, by moment in time, each labelled in its own time zone (`graphTimeAxis.ts`)
- Over a Graph the wheel zooms, never scrolling the page, even at a zoom limit; the page scrolls from headers, gaps and margins. `zoomPlugin`'s `wheel: 'smooth'` sizes each step to how far the wheel moved, so a trackpad zooms smoothly, and a sideways swipe or Shift+wheel pans. Locked charts doesn't apply. Only Graphs on or near the screen are drawn
- The tooltip gives the hour's weather (the Card model's own words and emoji, as on the cards, which can disagree with the Snow quality), precipitation, temperature, wind speed and the compass point it blows from, and Freezing level; forecasts cached before wind and weather were kept leave those rows out until they're refreshed

### Type System (`frontend/src/types/`)
- `index.ts` - Core types: `AllWeatherData`, `ResortData`, `ProcessedResortData`, `DayForecast`, `Period`
- `themes.ts` - Theme configuration
- `fonts.ts` - Font configuration

### Weather Data Types
- `PeriodData` - AM/PM/NIGHT period aggregates with snow estimation fields
- `DayData` - Contains AM/PM/NIGHT `PeriodData`
- `ResortData` - bot/mid/top `ElevationForecast`s plus `fetchedAt`, and the hourly `freezingLevel` and `timeZone` a Graph needs
- `HourlyForecast` - one band's hours (`ElevationForecast.hours`) as typed arrays from `start`, each hour's Snow quality an index into `SNOW_QUALITIES`; wind and weather code are optional, missing on forecasts cached before they were kept
- `ProcessedResortData` - Transformed for UI display with `DayForecast[]`
